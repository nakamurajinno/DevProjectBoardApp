import { connection } from "next/server";
import { isMockAuth } from "@/lib/auth/config";
import { mockGetInvitation, mockListMembers } from "@/lib/auth/mock";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { InvitationInfo, OrganizationMember } from "@/types";

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

// 招待コードから招待内容を取得する (未ログインでも呼べる)。無効・期限切れなら null。
export async function getInvitationInfo(token: string): Promise<InvitationInfo | null> {
  if (!/^[0-9a-f]{32}$/i.test(token)) return null;
  // 有効期限の判定で現在時刻を使うため、リクエスト時に評価する
  if (isMockAuth) {
    await connection();
    return mockGetInvitation(token);
  }

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

// 招待メールのリンクからログインしたが、まだ登録を完了していない (メンバーではない) ユーザー。
// 有効な招待がなければ null。
export async function getPendingInvitee(): Promise<{
  email: string;
  name: string;
  organizationName: string;
} | null> {
  if (isMockAuth) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const token = user?.user_metadata?.invitation_token;
  if (!user?.email || typeof token !== "string") return null;
  const invitation = await getInvitationInfo(token);
  return invitation ? { email: user.email, name: "", organizationName: invitation.organizationName } : null;
}
