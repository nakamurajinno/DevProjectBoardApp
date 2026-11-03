import { isUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
export const USERNAME_MAX = 50;
export const ORGANIZATION_NAME_MAX = 100;

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

// ユーザー名はログインにも使うため、メールアドレスと区別できるよう「@」を含めない。
// (一意かどうかはサーバー・DB 側で確認する)
export function validateUsername(name: string) {
  if (!name) return "ユーザー名を入力してください";
  if ([...name].length > USERNAME_MAX) return `ユーザー名は${USERNAME_MAX}文字以内で入力してください`;
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
