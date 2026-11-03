"use server";

import { revalidatePath } from "next/cache";
import { isMockAuth } from "@/lib/auth/config";
import {
  mockCreateInvitation,
  mockDeleteInvitation,
  mockEmailExists,
  mockSetMemberRole,
} from "@/lib/auth/mock";
import { isUserRole } from "@/lib/auth/roles";
import { ADMIN_ONLY_MESSAGE, requireAdmin } from "@/lib/auth/session";
import { getOrigin } from "@/lib/request";
import { createAdminClient, isEmailRegistered } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_RE, readInviteForm } from "@/lib/validation/auth";

const ALREADY_MEMBER_MESSAGE =
  "このメールアドレスは既に登録されています（ユーザーは 1 つの組織にのみ所属できます）";

export type InviteState =
  | {
      ok: boolean;
      message: string;
      // メールを送れなかった場合などに、管理ユーザが手動で共有する招待リンク
      inviteUrl?: string;
    }
  | undefined;

// 管理ユーザがメールアドレスとロールを指定して組織へ招待する。
// 1. organization_invitations に招待を作成 (招待コード = token)
// 2. Supabase Auth の inviteUserByEmail で招待メールを送信 (メタデータに招待コードを付ける)
//    → DB のトリガーがユーザー作成時に招待を使用済みにし、組織のメンバーとして登録する
//    → 招待されたユーザーはメール内のリンクからパスワードを設定して登録を完了する
// メールを送れない場合 (service_role キー未設定・送信エラー) は招待リンクを返し、
// 招待されたユーザーはサインアップ画面で招待コードを入力して登録する。
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };

  const { email: rawEmail, role } = readInviteForm(formData);
  const email = rawEmail.toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: "メールアドレスの形式が正しくありません" };
  if (!role) return { ok: false, message: "ロールを選択してください" };

  const origin = await getOrigin();
  const signupUrl = (token: string) => `${origin}/signup?invite=${token}`;

  if (isMockAuth) {
    if (mockEmailExists(email)) return { ok: false, message: ALREADY_MEMBER_MESSAGE };
    const token = mockCreateInvitation(user.organizationId, email, role);
    revalidatePath("/organization");
    return {
      ok: true,
      message: "招待を作成しました（モックモードではメールは送信されません）。下記の招待リンクを共有してください",
      inviteUrl: signupUrl(token),
    };
  }

  if (await isEmailRegistered(email)) return { ok: false, message: ALREADY_MEMBER_MESSAGE };

  const supabase = await createClient();
  // 同じメールアドレスへの未使用の招待は作り直す (ロール変更・有効期限の延長)
  const { error: deleteError } = await supabase
    .from("organization_invitations")
    .delete()
    .eq("organization_id", user.organizationId)
    .eq("email", email)
    .is("accepted_at", null);
  if (deleteError) console.error("Failed to delete old invitation", deleteError);

  const { data: invitation, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: user.organizationId, email, role })
    .select("token")
    .single();
  if (error || !invitation) {
    console.error("Failed to create invitation", error);
    return { ok: false, message: "招待の作成に失敗しました。時間をおいて再度お試しください" };
  }

  revalidatePath("/organization");

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: true,
      message:
        "招待を作成しました。招待メールの送信には SUPABASE_SERVICE_ROLE_KEY の設定が必要なため、下記の招待リンクを共有してください",
      inviteUrl: signupUrl(invitation.token),
    };
  }

  const { error: mailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/invite/accept`,
    data: { invitation_token: invitation.token },
  });
  if (mailError) {
    console.error("Failed to send invitation email", mailError);
    return {
      ok: true,
      message: "招待メールを送信できませんでした。下記の招待リンクを共有してください",
      inviteUrl: signupUrl(invitation.token),
    };
  }

  return { ok: true, message: `${email} に招待メールを送信しました` };
}

export type OrganizationActionResult = { ok: true } | { ok: false; message: string };

export async function revokeInvitation(id: string): Promise<OrganizationActionResult> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };

  if (isMockAuth) {
    mockDeleteInvitation(user.organizationId, id);
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("organization_invitations")
      .delete()
      .eq("organization_id", user.organizationId)
      .eq("id", id);
    if (error) {
      console.error("Failed to revoke invitation", error);
      return { ok: false, message: "招待の取り消しに失敗しました" };
    }
  }

  revalidatePath("/organization");
  return { ok: true };
}

export async function changeMemberRole(
  userId: string,
  role: unknown,
): Promise<OrganizationActionResult> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };
  if (!isUserRole(role)) return { ok: false, message: "ロールが正しくありません" };

  const LAST_ADMIN_MESSAGE = "組織には管理ユーザが 1 人以上必要です";
  if (isMockAuth) {
    const error = mockSetMemberRole(user.organizationId, userId, role);
    if (error) return { ok: false, message: error };
  } else {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_member_role", { p_user_id: userId, p_role: role });
    if (error) {
      console.error("Failed to change member role", error);
      return {
        ok: false,
        message: error.message.includes("at least one admin")
          ? LAST_ADMIN_MESSAGE
          : "ロールの変更に失敗しました",
      };
    }
  }

  // 自分のロールを変更した場合に備え、ヘッダー・一覧の権限表示も更新する
  revalidatePath("/", "layout");
  return { ok: true };
}
