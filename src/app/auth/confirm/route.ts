import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// メールテンプレートを token_hash 形式にした場合の確認リンクの受け口。
// 例 (Authentication > Emails > Invite user):
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
// 招待 (type=invite) の場合はパスワード設定画面へ、それ以外は一覧へ移動する。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = toEmailOtpType(searchParams.get("type"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      const next = type === "invite" ? "/invite/accept" : safeNext(searchParams.get("next"));
      return NextResponse.redirect(new URL(next, origin));
    }
    console.error("Failed to verify email link", error);
  }

  return NextResponse.redirect(
    new URL(type === "invite" ? "/invite/accept?error=expired" : "/login?error=link", origin),
  );
}

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function toEmailOtpType(value: string | null): EmailOtpType | null {
  return EMAIL_OTP_TYPES.find((type) => type === value) ?? null;
}

// オープンリダイレクトを防ぐため、アプリ内のパスだけを許可する
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
