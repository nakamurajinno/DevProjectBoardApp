import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  applyRemember,
  isRemembered,
  REMEMBER_COOKIE,
} from "@/lib/auth/remember";
import type { Database } from "@/types/database";

// リクエストごとに Supabase の認証セッション (Cookie) を更新し、ログイン済みかどうかを返す
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remember = isRemembered(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, applyRemember(options, remember)),
          );
        },
      },
    },
  );

  // トークンをリフレッシュするため、必ず getUser() を呼ぶ
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, authenticated: !!user };
}
