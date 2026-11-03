import { isUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
// ユーザー名の長さは表示幅で数える: 半角文字は 1、全角文字は 2 として 20 まで (全角なら 10 文字、半角なら 20 文字)。
// DB の profiles_username_check (public.username_width) と同じ数え方にする
export const USERNAME_MAX_WIDTH = 20;
// 入力欄の maxLength。すべて半角の場合の最大文字数
export const USERNAME_MAX_LENGTH = USERNAME_MAX_WIDTH;
const ORGANIZATION_NAME_MAX = 100;

export type SignupMode = "create" | "join";

export type SignupInput = {
  email: string;
  password: string;
  username: string;
  mode: SignupMode;
  organizationName: string;
  invitationToken: string;
};

export type SignupFieldErrors = Partial<Record<keyof SignupInput, string>>;

export function readSignupForm(formData: FormData): SignupInput {
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    email: text("email"),
    password: String(formData.get("password") ?? ""),
    username: text("username"),
    mode: formData.get("mode") === "join" ? "join" : "create",
    organizationName: text("organizationName"),
    invitationToken: extractInvitationToken(text("invitationToken")),
  };
}

// 招待コード。招待リンク (…/signup?invite=<コード>) をそのまま貼り付けた場合もコード部分を取り出す
export function extractInvitationToken(value: string) {
  return value.match(/[0-9a-f]{32}/i)?.[0].toLowerCase() ?? value;
}

export function validatePassword(password: string) {
  if (password.length < PASSWORD_MIN)
    return `パスワードは${PASSWORD_MIN}文字以上で入力してください`;
  return undefined;
}

// 半角 (ASCII の表示可能文字・半角カタカナ) は 1、それ以外 (全角) は 2 として数えた幅
export function usernameWidth(name: string) {
  let width = 0;
  for (const ch of name) {
    const code = ch.codePointAt(0)!;
    const isHalfWidth = (code >= 0x20 && code <= 0x7e) || (code >= 0xff61 && code <= 0xff9f);
    width += isHalfWidth ? 1 : 2;
  }
  return width;
}

// ユーザー名はログインにも使うため、メールアドレスと区別できるよう「@」を含めない。
// (一意かどうかはサーバー・DB 側で確認する)
export function validateUsername(name: string) {
  if (!name) return "ユーザー名を入力してください";
  if (usernameWidth(name) > USERNAME_MAX_WIDTH)
    return "ユーザー名は全角10文字（半角20文字）以内で入力してください";
  if (name.includes("@")) return "ユーザー名に「@」は使用できません";
  return undefined;
}

export function validateSignupInput(input: SignupInput): SignupFieldErrors {
  const errors: SignupFieldErrors = {};
  if (!EMAIL_RE.test(input.email)) errors.email = "メールアドレスの形式が正しくありません";
  const password = validatePassword(input.password);
  if (password) errors.password = password;
  const username = validateUsername(input.username);
  if (username) errors.username = username;
  if (input.mode === "create") {
    if (!input.organizationName) errors.organizationName = "組織名を入力してください";
    else if (input.organizationName.length > ORGANIZATION_NAME_MAX)
      errors.organizationName = `組織名は${ORGANIZATION_NAME_MAX}文字以内で入力してください`;
  } else if (!/^[0-9a-f]{32}$/i.test(input.invitationToken)) {
    errors.invitationToken = "招待コードの形式が正しくありません";
  }
  return errors;
}

export function readInviteForm(formData: FormData): { role: UserRole | null } {
  const role = formData.get("role");
  return { role: isUserRole(role) ? role : null };
}
