import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { logSupabaseError } from "./errors";

// service_role キーを使う管理用クライアント (RLS をバイパスする)。
// 招待メールの送信 (auth.admin.inviteUserByEmail)、メールアドレス登録有無の確認、
// ユーザー名からのログイン用メールアドレスの解決にのみ使う。
// サーバー専用 ("server-only" によりクライアントから import するとビルドエラーになる)。
// SUPABASE_SERVICE_ROLE_KEY が未設定の場合は null を返し、呼び出し側で代替動作にする。
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// メールアドレスが登録済みか。確認できない場合 (キー未設定・エラー) は null。
export async function isEmailRegistered(email: string): Promise<boolean | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("is_email_registered", { p_email: email });
  if (error) {
    console.error("Failed to check email registration", error);
    return null;
  }
  return data;
}

export type EmailLookupResult =
  | { status: "found"; email: string }
  | { status: "not_found" }
  // SUPABASE_SERVICE_ROLE_KEY 未設定・DB エラーなどで確認できない
  | { status: "unavailable" };

// ユーザー名からログイン用のメールアドレスを引く。
// get_login_email は service_role にのみ実行権限があり、ブラウザ (anon キー) からは呼べない。
// 取得したメールアドレスはサーバー内での認証にだけ使い、クライアントへ返さないこと。
export async function findLoginEmailByUsername(username: string): Promise<EmailLookupResult> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("SUPABASE_SERVICE_ROLE_KEY が未設定のため、ユーザー名でのログインを利用できません");
    return { status: "unavailable" };
  }
  const { data, error } = await admin.rpc("get_login_email", { p_username: username });
  if (error) {
    console.error("Failed to look up username", error);
    return { status: "unavailable" };
  }
  return data ? { status: "found", email: data } : { status: "not_found" };
}

// メールアドレスがいずれかの組織のメンバー (profiles あり) か。確認できない場合は null。
// 招待メール送信済みで未参加のユーザーは auth.users にのみ存在するため、メンバーには含めない。
export async function isEmailMember(email: string): Promise<boolean | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("is_email_member", { p_email: email });
  if (error) {
    console.error("Failed to check membership", error);
    return null;
  }
  return data;
}

// 招待メール送信済みで、まだ組織に参加していない (auth.users にのみ存在する) ユーザーを削除する。
// 招待の再送・取り消し時に呼び、古い招待メールのリンクを無効にする。
// ダッシュボードで既に削除済みのユーザー (404) は削除済みとして扱う。
// 失敗した場合は error に詳細 (どの処理で・どのエラーコードか) を返す。
export async function deleteUnjoinedUser(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY が未設定です" };
  const { data: userId, error } = await admin.rpc("find_unjoined_user", { p_email: email });
  if (error) {
    return { ok: false, error: logSupabaseError("deleteUnjoinedUser", "rpc find_unjoined_user (auth.users / profiles)", error) };
  }
  if (!userId) return { ok: true };
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    if (deleteError.status === 404) return { ok: true };
    return {
      ok: false,
      error: logSupabaseError("deleteUnjoinedUser", `auth.admin.deleteUser (auth.users id=${userId})`, deleteError),
    };
  }
  return { ok: true };
}

export type CreateConfirmedUserResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "already_registered" | "weak_password" | "invitation" | "unknown"; error?: string };

// 招待コード (招待リンク) での登録用に、メール確認済みのユーザーを作成する。
// 招待リンクの所持を本人確認とみなし、確認メールを経由せずにそのままログインできるようにする。
// 組織への参加 (organization_members / profiles への追加) は DB のトリガー (handle_new_user) が
// user_metadata.invitation_token を見て、招待のロールで行う (招待が無効ならユーザー作成ごと失敗する)。
export async function createConfirmedUser(params: {
  email: string;
  password: string;
  metadata: Record<string, string>;
}): Promise<CreateConfirmedUserResult> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: "unavailable" };
  const { error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: params.metadata,
  });
  if (!error) return { ok: true };
  const detail = logSupabaseError("createConfirmedUser", "auth.admin.createUser", error);
  if (error.code === "email_exists" || error.code === "user_already_exists")
    return { ok: false, reason: "already_registered", error: detail };
  if (error.code === "weak_password") return { ok: false, reason: "weak_password", error: detail };
  // トリガー内の例外 (招待が無効・期限切れ・使用済み) は "Database error creating new user" になる
  if (error.code === "unexpected_failure" || /database error/i.test(error.message))
    return { ok: false, reason: "invitation", error: detail };
  return { ok: false, reason: "unknown", error: detail };
}
