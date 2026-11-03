import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// service_role キーを使う管理用クライアント (RLS をバイパスする)。
// 招待メールの送信 (auth.admin.inviteUserByEmail) と、メールアドレス登録有無の確認にのみ使う。
// サーバー専用: Server Action / Route Handler 以外から import しないこと。
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
