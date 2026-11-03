import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
