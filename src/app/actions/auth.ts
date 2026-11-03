"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMockAuth } from "@/lib/auth/config";
import {
  findMockUser,
  mockAuthenticate,
  mockChangePassword,
  mockFindEmailByUsername,
  mockUsernameExists,
  mockSignUp,
  MOCK_SESSION_COOKIE,
} from "@/lib/auth/mock";
import { REMEMBER_COOKIE, rememberCookieOptions } from "@/lib/auth/remember";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationInfo } from "@/lib/data/organization";
import { getOrigin } from "@/lib/request";
import {
  createConfirmedUser,
  deleteUnjoinedUser,
  findLoginEmailByUsername,
  isEmailMember,
  isEmailRegistered,
  type EmailLookupResult,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_RE,
  readSignupForm,
  validatePassword,
  validateSignupInput,
  type SignupFieldErrors,
  type SignupInput,
  validateUsername,
} from "@/lib/validation/auth";

const NOT_FOUND_MESSAGE = "ユーザーが見つかりません。アカウント登録を行ってください";
const ALREADY_REGISTERED_MESSAGE =
  "このメールアドレスは既に登録されています。ログインしてください";
const USERNAME_TAKEN_MESSAGE = "このユーザー名は既に使われています。別のユーザー名を入力してください";
const INVALID_CREDENTIALS_MESSAGE = "メールアドレス（ユーザー名）またはパスワードが正しくありません";
const MISSING_CREDENTIALS_MESSAGE = "メールアドレスまたはユーザー名と、パスワードを入力してください";

// 「@」を含む入力はメールアドレス、それ以外はユーザー名として扱う (ユーザー名には「@」を使えない)
const isEmailIdentifier = (identifier: string) => identifier.includes("@");

// ユーザー名から登録済みのメールアドレスを引く (サーバー内でのみ使い、結果はクライアントへ返さない)
async function resolveUsername(username: string): Promise<EmailLookupResult> {
  if (isMockAuth) {
    const email = mockFindEmailByUsername(username);
    return email ? { status: "found", email } : { status: "not_found" };
  }
  return findLoginEmailByUsername(username);
}

// ユーザー名が使用済みか。メールアドレスは返さない RPC で確認する。確認できない場合は null
async function isUsernameTaken(username: string): Promise<boolean | null> {
  if (isMockAuth) return mockUsernameExists(username);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_username_taken", { p_username: username });
  if (error) {
    console.error("Failed to check username", error);
    return null;
  }
  return data;
}

// ============================================================
// ログイン
// ============================================================

export type LoginState =
  | { message?: string; identifier?: string; notRegistered?: boolean }
  | undefined;

// メールアドレスまたはユーザー名と、パスワードでログインする。
// ユーザー名の場合は profiles からメールアドレスを引き、そのメールアドレスで認証する。
// intent: "password" | "preview:<モックユーザーID>" (モックモードのプレビュー用ボタン)
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "password");
  const remember = formData.get("remember") === "on";
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberCookieOptions(remember));

  if (isMockAuth) return mockLogin({ intent, identifier, password, remember });

  if (!identifier || !password) return { message: MISSING_CREDENTIALS_MESSAGE, identifier };

  let email: string;
  if (isEmailIdentifier(identifier)) {
    if (!EMAIL_RE.test(identifier))
      return { message: "メールアドレスの形式が正しくありません", identifier };
    email = identifier;
  } else {
    const found = await resolveUsername(identifier);
    if (found.status === "unavailable")
      return {
        message: "現在ユーザー名でのログインを利用できません。メールアドレスでログインしてください",
        identifier,
      };
    if (found.status === "not_found")
      return { message: NOT_FOUND_MESSAGE, identifier, notRegistered: true };
    email = found.email;
  }

  const supabase = await createClient({ remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return { message: "メールアドレスの確認が完了していません", identifier };
    // Supabase は未登録とパスワード誤りを区別しないため、登録有無をサーバー側で確認する
    if (
      error.code === "invalid_credentials" &&
      isEmailIdentifier(identifier) &&
      (await isEmailRegistered(email)) === false
    )
      return { message: NOT_FOUND_MESSAGE, identifier, notRegistered: true };
    return { message: INVALID_CREDENTIALS_MESSAGE, identifier };
  }
  redirect("/");
}

async function mockLogin({
  intent,
  identifier,
  password,
  remember,
}: {
  intent: string;
  identifier: string;
  password: string;
  remember: boolean;
}): Promise<LoginState> {
  let userId: string | undefined;
  if (intent.startsWith("preview:")) {
    userId = findMockUser(intent.slice("preview:".length))?.id;
  } else {
    if (!identifier || !password) return { message: MISSING_CREDENTIALS_MESSAGE, identifier };
    const found = isEmailIdentifier(identifier) ? null : await resolveUsername(identifier);
    const email = found ? (found.status === "found" ? found.email : null) : identifier;
    if (!email) return { message: NOT_FOUND_MESSAGE, identifier, notRegistered: true };
    const result = mockAuthenticate(email, password);
    if (!result.ok)
      return result.reason === "not_found"
        ? { message: NOT_FOUND_MESSAGE, identifier, notRegistered: true }
        : { message: INVALID_CREDENTIALS_MESSAGE, identifier };
    userId = result.id;
  }

  if (!userId) return { message: INVALID_CREDENTIALS_MESSAGE, identifier };

  await setMockSession(userId, remember);
  redirect("/");
}

async function setMockSession(userId: string, remember: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(MOCK_SESSION_COOKIE, userId, rememberCookieOptions(remember));
}

export async function logout() {
  const cookieStore = await cookies();
  if (isMockAuth) {
    cookieStore.delete(MOCK_SESSION_COOKIE);
  } else {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  cookieStore.delete(REMEMBER_COOKIE);
  redirect("/login");
}

// ============================================================
// ユーザー登録 (Sign up)
// ============================================================

export type SignupState =
  | {
      errors?: SignupFieldErrors;
      message?: string;
      // 確認メール送信後など、エラーではない案内
      notice?: string;
      values?: Omit<SignupInput, "password">;
    }
  | undefined;

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const input = readSignupForm(formData);
  const { password, ...values } = input;
  const fail = (state: Omit<NonNullable<SignupState>, "values">): SignupState => ({
    ...state,
    values,
  });

  const errors = validateSignupInput(input);
  if (Object.keys(errors).length > 0) return fail({ errors });

  // 既存組織への参加は招待が必須。招待コード (と、メールアドレス指定の招待ならその組み合わせ) を事前に確認する
  // (DB のトリガーでも同じ検証を行い、不正な登録は拒否される)
  const invitation = input.mode === "join" ? await getInvitationInfo(input.invitationToken) : null;
  if (input.mode === "join") {
    if (!invitation)
      return fail({
        errors: { invitationToken: "招待コードが無効か、有効期限が切れています" },
      });
    if (invitation.email && invitation.email.toLowerCase() !== input.email.toLowerCase())
      return fail({
        errors: { email: "招待を受けたメールアドレスで登録してください" },
      });
  }

  // ユーザー名はログインにも使うため、他のユーザーと重複させない (DB の一意制約でも保証している)
  if (await isUsernameTaken(input.username))
    return fail({ errors: { username: USERNAME_TAKEN_MESSAGE } });

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, "1", rememberCookieOptions(true));

  if (isMockAuth) {
    const result = mockSignUp({
      email: input.email,
      password,
      name: input.username,
      organizationName: input.mode === "create" ? input.organizationName : undefined,
      invitationToken: input.mode === "join" ? input.invitationToken : undefined,
    });
    if (!result.ok) return fail({ message: result.message });
    await setMockSession(result.id, true);
    redirect("/");
  }

  // 招待メール送信済みで未参加のユーザー (auth.users にのみ存在) が招待コードで登録する場合は、
  // 招待メールで作成されたユーザーを削除してから登録し直す (メールアドレス指定の招待で、組み合わせは確認済み)
  if (invitation?.email && (await isEmailMember(input.email)) === false)
    await deleteUnjoinedUser(input.email);

  if (await isEmailRegistered(input.email))
    return fail({ message: ALREADY_REGISTERED_MESSAGE });

  const supabase = await createClient({ remember: true });

  // 招待コードでの参加: 確認メールを待たずに登録 → 組織参加 → 自動ログインまで行い、一覧へ遷移する
  if (input.mode === "join") {
    const created = await createConfirmedUser({
      email: input.email,
      password,
      metadata: { username: input.username, invitation_token: input.invitationToken },
    });
    if (!created.ok) {
      switch (created.reason) {
        case "already_registered":
          return fail({ message: ALREADY_REGISTERED_MESSAGE });
        case "weak_password":
          return fail({ errors: { password: "より複雑なパスワードを設定してください" } });
        case "invitation":
          return fail({
            message: `組織への参加に失敗しました。招待コードが無効・期限切れ・使用済みでないか確認してください（${created.error}）`,
          });
        case "unavailable":
          return fail({
            message: "サーバー設定 (SUPABASE_SERVICE_ROLE_KEY) が不足しているため、招待コードで登録できません",
          });
        default:
          return fail({ message: `登録に失敗しました（${created.error}）` });
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password,
    });
    if (signInError) {
      console.error("Failed to sign in after signup", signInError);
      return fail({
        message: "アカウントは登録されましたが、自動ログインに失敗しました。ログイン画面からログインしてください",
      });
    }
    redirect("/");
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password,
    options: {
      // メール確認を有効にしている場合の、確認リンクの戻り先
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
      // DB のトリガー (public.handle_new_user) がこの値を見て組織を作成する
      data: { username: input.username, organization_name: input.organizationName },
    },
  });

  if (error) {
    console.error("Failed to sign up", error);
    if (error.code === "user_already_exists" || error.code === "email_exists")
      return fail({ message: ALREADY_REGISTERED_MESSAGE });
    if (error.code === "weak_password")
      return fail({ errors: { password: "より複雑なパスワードを設定してください" } });
    return fail({ message: "登録に失敗しました。入力内容を確認して再度お試しください" });
  }

  // メール確認が有効な場合、登録済みのメールアドレスでも成功として返る (identities が空)
  if (data.user && data.user.identities?.length === 0)
    return fail({ message: ALREADY_REGISTERED_MESSAGE });

  if (!data.session)
    return fail({
      notice: `${input.email} に確認メールを送信しました。メール内のリンクを開いて登録を完了してください`,
    });

  redirect("/");
}

// ============================================================
// 招待メールからのアカウント登録
// ============================================================

export type InviteSessionResult =
  | { ok: true; email: string; username: string; organizationName?: string }
  | { ok: false; message: string };

const INVITATION_UNAVAILABLE_MESSAGE =
  "招待が取り消されたか、有効期限が切れています。組織の管理ユーザに再度招待を依頼してください";

// 招待メールのリンクは URL のハッシュ (#access_token=...) でトークンを返すため、
// ブラウザで読み取ったトークンをサーバーへ渡して認証 Cookie を発行する
export async function acceptInviteSession(tokens: {
  accessToken: string;
  refreshToken: string;
}): Promise<InviteSessionResult> {
  if (isMockAuth) return { ok: false, message: "モックモードでは招待メールは使えません" };

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, "1", rememberCookieOptions(true));

  const supabase = await createClient({ remember: true });
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error || !data.user) {
    console.error("Failed to set invite session", error);
    return { ok: false, message: "招待リンクが無効か、有効期限が切れています" };
  }
  // 登録完了 (completeInvitation) 前のため、まだ組織のメンバー (profiles) にはなっていない。
  // 既にメンバーの場合 (登録完了の再試行) は現在のユーザー名を初期値にする。
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile) return { ok: true, email: data.user.email ?? "", username: profile.username };

  const token = data.user.user_metadata?.invitation_token;
  const invitation = typeof token === "string" ? await getInvitationInfo(token) : null;
  if (!invitation) return { ok: false, message: INVITATION_UNAVAILABLE_MESSAGE };
  return {
    ok: true,
    email: data.user.email ?? "",
    username: "",
    organizationName: invitation.organizationName,
  };
}

export type CompleteInvitationState =
  | { errors?: { password?: string; username?: string }; message?: string }
  | undefined;

// 招待されたユーザーがパスワードとユーザー名を設定して登録を完了する。
// この時点で初めて組織のメンバーとして登録され、招待は「招待中」から外れる。
export async function completeInvitation(
  _prev: CompleteInvitationState,
  formData: FormData,
): Promise<CompleteInvitationState> {
  if (isMockAuth) return { message: "モックモードでは招待メールは使えません" };

  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const errors = {
    password: validatePassword(password),
    username: validateUsername(username),
  };
  if (errors.password || errors.username) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "招待リンクの有効期限が切れています。もう一度招待を依頼してください" };

  // 招待を承認して組織のメンバーになる (ユーザー名が他のユーザーと重複していればここで弾く)
  const { error: acceptError } = await supabase.rpc("accept_my_invitation", {
    p_username: username,
  });
  if (acceptError) {
    if (acceptError.code === "23505") return { errors: { username: USERNAME_TAKEN_MESSAGE } };
    if (acceptError.code === "P0002") return { message: INVITATION_UNAVAILABLE_MESSAGE };
    console.error("Failed to accept invitation", acceptError);
    return { message: "登録に失敗しました。時間をおいて再度お試しください" };
  }

  const { error } = await supabase.auth.updateUser({
    password,
    data: { username, invitation_pending: false },
  });
  if (error) {
    console.error("Failed to set password", error);
    return error.code === "weak_password" || error.code === "same_password"
      ? { errors: { password: "別のパスワードを設定してください" } }
      : { message: "登録に失敗しました。時間をおいて再度お試しください" };
  }

  redirect("/");
}

// ============================================================
// パスワード変更 (ログイン中のユーザー)
// ============================================================

export type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type ChangePasswordState =
  | { ok: true }
  | { ok: false; errors?: ChangePasswordFieldErrors; message?: string }
  | undefined;

const WRONG_CURRENT_PASSWORD = "現在のパスワードが正しくありません";

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const errors: ChangePasswordFieldErrors = {};
  if (!currentPassword) errors.currentPassword = "現在のパスワードを入力してください";
  const passwordError = validatePassword(newPassword);
  if (passwordError) errors.newPassword = passwordError;
  else if (newPassword === currentPassword)
    errors.newPassword = "現在のパスワードとは異なるパスワードを入力してください";
  if (!confirmPassword) errors.confirmPassword = "確認用パスワードを入力してください";
  else if (newPassword !== confirmPassword) errors.confirmPassword = "パスワードが一致しません";
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  if (isMockAuth) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");
    return mockChangePassword(user.id, currentPassword, newPassword)
      ? { ok: true }
      : { ok: false, errors: { currentPassword: WRONG_CURRENT_PASSWORD } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  // セッションを乗っ取られた場合にパスワードを書き換えられないよう、現在のパスワードを確認する。
  // ログイン中のセッション (Cookie) に影響しないよう、Cookie を持たない別クライアントで照合する。
  const verifier = createStatelessClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: verifyError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    if (verifyError.code !== "invalid_credentials")
      console.error("Failed to verify current password", verifyError);
    return verifyError.code === "invalid_credentials"
      ? { ok: false, errors: { currentPassword: WRONG_CURRENT_PASSWORD } }
      : { ok: false, message: "パスワードの変更に失敗しました。時間をおいて再度お試しください" };
  }
  // 照合のために発行されたセッションだけを破棄する
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    console.error("Failed to change password", error);
    if (error.code === "weak_password")
      return { ok: false, errors: { newPassword: "より複雑なパスワードを設定してください" } };
    if (error.code === "same_password")
      return {
        ok: false,
        errors: { newPassword: "現在のパスワードとは異なるパスワードを入力してください" },
      };
    return { ok: false, message: "パスワードの変更に失敗しました。時間をおいて再度お試しください" };
  }

  // 他の端末・ブラウザのログインは無効にする (この端末のログインは維持する)
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("Failed to sign out other sessions", signOutError);

  return { ok: true };
}
