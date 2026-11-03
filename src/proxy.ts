import { NextResponse, type NextRequest } from "next/server";
import { isMockAuth } from "@/lib/auth/config";
import { findMockUser, MOCK_SESSION_COOKIE } from "@/lib/auth/mock";
import { updateSession } from "@/lib/supabase/proxy";

// ログインなしで開けるパス (ログイン・ユーザー登録・メール内リンクの受け口・招待の受諾)
const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/invite"];
// ログイン済みなら開く必要がない (一覧へ移動する) パス
const GUEST_ONLY_PATHS = ["/login", "/signup"];

// 楽観的なチェックとして、未ログインならログイン画面へ、ログイン済みでログイン・登録画面を開いたら一覧へ移動する。
// 権限の確認は Server Action / Server Component (src/lib/auth/session.ts) と RLS で行う。
export async function proxy(request: NextRequest) {
  const { response, authenticated, invitationPending } = isMockAuth
    ? {
        response: NextResponse.next({ request }),
        authenticated: !!findMockUser(request.cookies.get(MOCK_SESSION_COOKIE)?.value),
        invitationPending: false,
      }
    : await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  // 招待の登録完了前のユーザーは、登録完了画面以外を開けない (メンバーではないため)
  if (invitationPending && !pathname.startsWith("/invite") && !pathname.startsWith("/auth"))
    return redirectKeepingCookies("/invite/accept", request, response);
  if (!authenticated && !isPublic) return redirectKeepingCookies("/login", request, response);
  if (authenticated && GUEST_ONLY_PATHS.includes(pathname)) return redirectKeepingCookies("/", request, response);
  return response;
}

// updateSession で更新した認証 Cookie を失わないよう、リダイレクトにも引き継ぐ
function redirectKeepingCookies(path: string, request: NextRequest, from: NextResponse) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // 静的ファイル・画像を除くすべてのパス
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
