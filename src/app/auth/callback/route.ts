import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// サインアップ確認メールのリンクのリダイレクト先。
// 認可コードをセッションに交換して一覧へ戻す。
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", origin));
    console.error("Failed to exchange auth code", error);
  }

  return NextResponse.redirect(new URL("/login?error=link", origin));
}
