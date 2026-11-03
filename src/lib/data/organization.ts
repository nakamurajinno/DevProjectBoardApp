import { connection } from "next/server";
import { isMockAuth } from "@/lib/auth/config";
import {
  mockGetInvitation,
  mockListInvitations,
  mockListMembers,
} from "@/lib/auth/mock";
import { isAdmin } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type {
  InvitationInfo,
  OrganizationInvitation,
  OrganizationMember,
} from "@/types";

// 組織 (メンバー・招待) の読み取り API。ログインユーザーの所属組織だけを対象にする。

export async function getMembers(): Promise<OrganizationMember[]> {
  await connection();
  const user = await getCurrentUser();
  if (!user) return [];
  if (isMockAuth) return mockListMembers(user.organizationId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, role, created_at")
    .eq("organization_id", user.organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map(({ username, ...rest }) => ({
    ...rest,
    name: username || rest.email.split("@")[0],
  }));
}

// 未使用の招待。管理ユーザ以外には空配列を返す (RLS でも管理ユーザのみに制限している)
export async function getPendingInvitations(): Promise<OrganizationInvitation[]> {
  await connection();
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) return [];
  if (isMockAuth) return mockListInvitations(user.organizationId);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .select("id, email, role, token, created_at, expires_at")
    .eq("organization_id", user.organizationId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// 招待コードから招待内容を取得する (未ログインでも呼べる)。無効・期限切れなら null。
export async function getInvitationInfo(token: string): Promise<InvitationInfo | null> {
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  if (isMockAuth) return mockGetInvitation(token);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation", { p_token: token });
  if (error) {
    console.error("Failed to load invitation", error);
    return null;
  }
  const row = data?.[0];
  return row
    ? { organizationName: row.organization_name, email: row.email, role: row.role }
    : null;
}
