import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types";
import { isMockAuth } from "./config";
import { findMockUser, MOCK_SESSION_COOKIE } from "./mock";
import { canEdit, isAdmin } from "./roles";

// サーバー専用のデータアクセス層。ログインユーザー・所属組織・ロールの取得をここに集約する。
// React の cache() で 1 リクエスト内の重複呼び出しをまとめる。
// 所属組織 (profiles) が取れないユーザーは未ログインと同じ扱い (null) にする。
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  if (isMockAuth) {
    const cookieStore = await cookies();
    return findMockUser(cookieStore.get(MOCK_SESSION_COOKIE)?.value);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, role, organization_id, organizations(name)")
    .eq("id", user.id)
    .maybeSingle();
  if (error) console.error("Failed to load profile", error);
  if (!profile) return null;

  return {
    id: user.id,
    name: profile.display_name || user.email?.split("@")[0] || "ユーザー",
    email: user.email ?? null,
    role: profile.role,
    organizationId: profile.organization_id,
    organizationName: profile.organizations?.name ?? "",
  };
});

// Server Action 用: 未ログインならログイン画面へ、編集権限がなければ null を返す。
// UI の非表示だけに頼らず、書き込み前に必ずサーバー側で権限を確認する。
export async function requireEditor(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return canEdit(user.role) ? user : null;
}

// Server Action 用: 管理ユーザでなければ null を返す
export async function requireAdmin(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return isAdmin(user.role) ? user : null;
}

export const FORBIDDEN_MESSAGE = "この操作を行う権限がありません（参照ユーザ）";
export const ADMIN_ONLY_MESSAGE = "この操作は組織の管理ユーザのみ行えます";
