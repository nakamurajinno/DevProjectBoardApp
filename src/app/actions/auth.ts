"use server";

import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMockAuth } from "@/lib/auth/config";
import {
  findMockUser,
  mockAuthenticate,
  mockChangePassword,
  mockSignUp,
  MOCK_SESSION_COOKIE,
} from "@/lib/auth/mock";
import { REMEMBER_COOKIE, rememberCookieOptions } from "@/lib/auth/remember";
import { getCurrentUser } from "@/lib/auth/session";
import { getInvitationInfo } from "@/lib/data/organization";
import { getOrigin } from "@/lib/request";
import { isEmailRegistered } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  EMAIL_RE,
  readSignupForm,
  validateDisplayName,
  validatePassword,
  validateSignupInput,
  type SignupFieldErrors,
  type SignupInput,
} from "@/lib/validation/auth";

const NOT_FOUND_MESSAGE = "ユーザーが見つかりません。アカウント登録を行ってください";
const ALREADY_REGISTERED_MESSAGE =
  "このメールアドレスは既に登録されています。ログインしてください";

// ============================================================
// ログイン
// ============================================================

export type LoginState =
  | { message?: string; email?: string; notRegistered?: boolean }
  | undefined;

// メールアドレス・パスワードでログインする。
// intent: "password" | "preview:<モックユーザーID>" (モックモードのプレビュー用ボタン)
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "password");
  const remember = formData.get("remember") === "on";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, remember ? "1" : "0", rememberCookieOptions(remember));

  if (isMockAuth) return mockLogin({ intent, email, password, remember });

  const supabase = await createClient({ remember });

  if (!EMAIL_RE.test(email) || !password)
    return { message: "メールアドレスとパスワードを入力してください", email };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return { message: "メールアドレスの確認が完了していません", email };
    // Supabase は未登録とパスワード誤りを区別しないため、登録有無をサーバー側で確認する
    if (error.code === "invalid_credentials" && (await isEmailRegistered(email)) === false)
      return { message: NOT_FOUND_MESSAGE, email, notRegistered: true };
    return { message: "メールアドレスまたはパスワードが正しくありません", email };
  }
  redirect("/");
}

async function mockLogin({
  intent,
  email,
  password,
  remember,
}: {
  intent: string;
  email: string;
  password: string;
  remember: boolean;
}): Promise<LoginState> {
  let userId: string | undefined;
  if (intent.startsWith("preview:")) {
    userId = findMockUser(intent.slice("preview:".length))?.id;
  } else {
    if (!EMAIL_RE.test(email) || !password)
      return { message: "メールアドレスとパスワードを入力してください", email };
    const result = mockAuthenticate(email, password);
    if (!result.ok)
      return result.reason === "not_found"
        ? { message: NOT_FOUND_MESSAGE, email, notRegistered: true }
        : { message: "メールアドレスまたはパスワードが正しくありません", email };
    userId = result.id;
  }

  if (!userId)
    return { message: "メールアドレスまたはパスワードが正しくありません", email };

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

  // 既存組織への参加は招待が必須。招待コードとメールアドレスの組み合わせを事前に確認する
  // (DB のトリガーでも同じ検証を行い、不正な登録は拒否される)
  if (input.mode === "join") {
    const invitation = await getInvitationInfo(input.invitationToken);
    if (!invitation)
      return fail({
        errors: { invitationToken: "招待コードが無効か、有効期限が切れています" },
      });
    if (invitation.email.toLowerCase() !== input.email.toLowerCase())
      return fail({
        errors: { email: "招待を受けたメールアドレスで登録してください" },
      });
  }

  const cookieStore = await cookies();
  cookieStore.set(REMEMBER_COOKIE, "1", rememberCookieOptions(true));

  if (isMockAuth) {
    const result = mockSignUp({
      email: input.email,
      password,
      name: input.displayName,
      organizationName: input.mode === "create" ? input.organizationName : undefined,
      invitationToken: input.mode === "join" ? input.invitationToken : undefined,
    });
    if (!result.ok) return fail({ message: result.message });
    await setMockSession(result.id, true);
    redirect("/");
  }

  if (await isEmailRegistered(input.email))
    return fail({ message: ALREADY_REGISTERED_MESSAGE });

  const supabase = await createClient({ remember: true });
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password,
    options: {
      // メール確認を有効にしている場合の、確認リンクの戻り先
      emailRedirectTo: `${await getOrigin()}/auth/callback`,
      // DB のトリガー (public.handle_new_user) がこの値を見て組織の作成 / 招待組織への参加を行う
      data:
        input.mode === "create"
          ? { display_name: input.displayName, organization_name: input.organizationName }
          : { display_name: input.displayName, invitation_token: input.invitationToken },
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
  | { ok: true; email: string; displayName: string }
  | { ok: false; message: string };

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
  return {
    ok: true,
    email: data.user.email ?? "",
    displayName: String(data.user.user_metadata?.display_name ?? ""),
  };
}

export type CompleteInvitationState =
  | { errors?: { password?: string; displayName?: string }; message?: string }
  | undefined;

// 招待されたユーザーがパスワードとユーザー名を設定して登録を完了する
// (招待メール送信時点で、招待された組織のメンバーとして登録済み)
export async function completeInvitation(
  _prev: CompleteInvitationState,
  formData: FormData,
): Promise<CompleteInvitationState> {
  if (isMockAuth) return { message: "モックモードでは招待メールは使えません" };

  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  const errors = {
    password: validatePassword(password),
    displayName: validateDisplayName(displayName),
  };
  if (errors.password || errors.displayName) return { errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "招待リンクの有効期限が切れています。もう一度招待を依頼してください" };

  const { error } = await supabase.auth.updateUser({ password, data: { display_name: displayName } });
  if (error) {
    console.error("Failed to set password", error);
    return error.code === "weak_password" || error.code === "same_password"
      ? { errors: { password: "別のパスワードを設定してください" } }
      : { message: "登録に失敗しました。時間をおいて再度お試しください" };
  }

  const { error: profileError } = await supabase.rpc("update_my_display_name", {
    p_display_name: displayName,
  });
  if (profileError) console.error("Failed to update display name", profileError);

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
