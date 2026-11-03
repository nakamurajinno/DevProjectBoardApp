import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import {
  applyRemember,
  isRemembered,
  REMEMBER_COOKIE,
} from "@/lib/auth/remember";
import type { Database } from "@/types/database";

// Server Component / Server Action / Route Handler 用の Supabase クライアント
// remember: ログイン操作時に「ログイン状態保持」の選択を明示的に渡す (省略時は Cookie の値に従う)
export async function createClient({ remember }: { remember?: boolean } = {}) {
  // Supabase クライアントはセッションの有効期限判定などで内部的に Date.now() を呼ぶ。
  // Cache Components では cookies() だけでは (runtime prefetch 等で) プリレンダー中に
  // 評価されることがあるため、connection() でリクエスト時にのみ実行されるようにする。
  // (Server Action / Route Handler では即座に解決するので影響はない)
  await connection();
  const cookieStore = await cookies();
  const keep = remember ?? isRemembered(cookieStore.get(REMEMBER_COOKIE)?.value);

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, applyRemember(options, keep)),
            );
          } catch {
            // Server Component から呼ばれた場合は set できない。
            // proxy.ts でセッションを更新しているため無視してよい。
          }
        },
      },
    },
  );
}
