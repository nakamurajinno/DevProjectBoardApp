"use server";

import { revalidatePath } from "next/cache";
import { isMockAuth } from "@/lib/auth/config";
import { mockCreateInvitation, mockRemoveMember, mockSetMemberRole } from "@/lib/auth/mock";
import { isUserRole, roleOption } from "@/lib/auth/roles";
import { getMembers } from "@/lib/data/organization";
import { ADMIN_ONLY_MESSAGE, requireAdmin } from "@/lib/auth/session";
import { getOrigin } from "@/lib/request";
import { deleteUnjoinedUser } from "@/lib/supabase/admin";
import { logSupabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { readInviteForm } from "@/lib/validation/auth";
import type { MemberRoleChange, UserRole } from "@/types";

export type InviteState =
  | {
      ok: boolean;
      message: string;
      // 発行した招待リンク。管理ユーザーがコピーして招待相手に共有する
      inviteUrl?: string;
      // 失敗時の Supabase のエラー詳細 (どの処理・テーブルで、どのエラーコードか)。管理ユーザーのみに表示される
      errorDetails?: string[];
    }
  | undefined;

// 管理ユーザーがロールを指定して招待リンクを発行する (特定のメールアドレスには紐づけない)。
// organization_invitations に招待 (招待コード = token、ロール、有効期限、email = null) を作成し、
// 招待リンク (/signup?invite=<招待コード>) を返す。管理ユーザーがリンクをコピーして招待相手に共有する。
// リンクを開いたユーザーが任意のメールアドレスでサインアップすると、DB のトリガー (handle_new_user) により
// 招待のロールで組織のメンバーになり、招待が使用済み (accepted_at) になる (1 リンク = 1 人)。
export async function inviteMember(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };

  const { role } = readInviteForm(formData);
  if (!role) return { ok: false, message: "ロールを選択してください" };

  const origin = await getOrigin();
  const signupUrl = (token: string) => `${origin}/signup?invite=${token}`;
  const successMessage = `「${roleOption(role).label}」の招待リンクを発行しました。下記のリンクをコピーして招待相手に共有してください（1 回のみ使用可・有効期限 7 日）`;

  if (isMockAuth) {
    const token = mockCreateInvitation(user.organizationId, role);
    return { ok: true, message: successMessage, inviteUrl: signupUrl(token) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_invitations")
    .insert({ organization_id: user.organizationId, role })
    .select("token")
    .single();
  if (error || !data) {
    return {
      ok: false,
      message: "招待リンクの発行に失敗しました。下記のエラー詳細を確認してください",
      errorDetails: [
        logSupabaseError("inviteMember", "insert organization_invitations", error),
        // email 列が NOT NULL のまま (マイグレーション未適用) の場合
        ...(error?.code === "23502"
          ? ["supabase/migrations/20261103700000_generic_invitation_links.sql を適用してください"]
          : []),
      ],
    };
  }

  return { ok: true, message: successMessage, inviteUrl: signupUrl(data.token) };
}

export type OrganizationActionResult = { ok: true } | { ok: false; message: string };

const LAST_ADMIN_MESSAGE = "組織には管理ユーザーが 1 人以上必要です";

// 1 人分のロールを更新する。失敗時はエラーメッセージを返す
async function setMemberRole(
  organizationId: string,
  userId: string,
  role: UserRole,
): Promise<string | null> {
  if (isMockAuth) return mockSetMemberRole(organizationId, userId, role);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_role", { p_user_id: userId, p_role: role });
  if (!error) return null;
  console.error("Failed to change member role", error);
  return error.message.includes("at least one admin") ? LAST_ADMIN_MESSAGE : "ロールの変更に失敗しました";
}

function isMemberRoleChange(value: unknown): value is MemberRoleChange {
  if (typeof value !== "object" || value === null) return false;
  const { userId, role } = value as Record<string, unknown>;
  return typeof userId === "string" && isUserRole(role);
}

// 「変更を保存」で、変更のあったメンバーのロールをまとめて更新する。
// 途中で失敗した場合は、それまでに更新したメンバーを元のロールに戻し、全体を未保存の状態にする。
// 引数の型はクライアント側の呼び出しのためのもので、届いた値はサーバー側で必ず検証する。
export async function changeMemberRoles(
  changes: readonly MemberRoleChange[],
): Promise<OrganizationActionResult> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };

  const raw: unknown = changes;
  if (!Array.isArray(raw) || raw.length === 0 || !raw.every(isMemberRoleChange)) {
    return { ok: false, message: "ロールの変更内容が正しくありません" };
  }
  const list: MemberRoleChange[] = raw;
  if (new Set(list.map((c) => c.userId)).size !== list.length) {
    return { ok: false, message: "ロールの変更内容が正しくありません" };
  }

  // 変更前のロール (失敗時の巻き戻し・管理ユーザー数の事前チェック用)
  const members = await getMembers();
  const before = new Map(members.map((m) => [m.id, m.role]));
  if (list.some((c) => !before.has(c.userId))) return { ok: false, message: "メンバーが見つかりません" };

  const after = new Map(before);
  for (const c of list) after.set(c.userId, c.role);
  if (![...after.values()].includes("admin")) return { ok: false, message: LAST_ADMIN_MESSAGE };

  // 適用順: 管理ユーザーへの昇格 → その他 → 自分自身 (最後)。
  // 先に降格すると一時的に管理ユーザーが 0 人になる / 自分を先に降格すると以降の変更権限を失うため
  const order = (c: MemberRoleChange) => (c.userId === user.id ? 2 : c.role === "admin" ? 0 : 1);
  const sorted = [...list].sort((a, b) => order(a) - order(b));

  const applied: MemberRoleChange[] = [];
  for (const c of sorted) {
    const error = await setMemberRole(user.organizationId, c.userId, c.role);
    if (error) {
      // 巻き戻しは逆順に行う (降格前の状態から順に戻せば管理ユーザー 0 人にならない)
      for (const done of applied.reverse()) {
        const rollbackError = await setMemberRole(user.organizationId, done.userId, before.get(done.userId)!);
        if (rollbackError) console.error("Failed to roll back member role", done.userId, rollbackError);
      }
      revalidatePath("/", "layout");
      const name = members.find((m) => m.id === c.userId)?.name ?? "";
      return { ok: false, message: `${error}${name ? `（${name}）` : ""}。変更は保存されていません` };
    }
    applied.push(c);
  }

  // 自分のロールを変更した場合に備え、ヘッダー・一覧の権限表示も更新する
  revalidatePath("/", "layout");
  return { ok: true };
}

// メンバーを組織から除外する (所属を表す profiles 行を削除する)。
// 自分自身・組織の最後の管理ユーザーは除外できない (DB の remove_member でも同じ確認を行う)。
// 除外後は、同じメールアドレスで再度招待できるよう、組織に所属しなくなったアカウント (auth.users) も削除する。
export async function removeMember(userId: string): Promise<OrganizationActionResult> {
  const user = await requireAdmin();
  if (!user) return { ok: false, message: ADMIN_ONLY_MESSAGE };

  const raw: unknown = userId;
  if (typeof raw !== "string" || raw === "") return { ok: false, message: "メンバーが見つかりません" };
  if (raw === user.id) return { ok: false, message: "自分自身は組織から除外できません" };

  const members = await getMembers();
  const target = members.find((m) => m.id === raw);
  if (!target) return { ok: false, message: "メンバーが見つかりません" };
  if (target.role === "admin" && !members.some((m) => m.role === "admin" && m.id !== raw)) {
    return { ok: false, message: LAST_ADMIN_MESSAGE };
  }

  if (isMockAuth) {
    const error = mockRemoveMember(user.organizationId, raw);
    if (error) return { ok: false, message: error };
  } else {
    const supabase = await createClient();
    const { error } = await supabase.rpc("remove_member", { p_user_id: raw });
    if (error) {
      logSupabaseError("removeMember", "rpc remove_member (profiles)", error);
      if (error.message.includes("at least one admin")) return { ok: false, message: LAST_ADMIN_MESSAGE };
      if (error.message.includes("member not found")) return { ok: false, message: "メンバーが見つかりません" };
      // PGRST202: 関数が見つからない (マイグレーション未適用)
      if (error.code === "PGRST202") {
        return {
          ok: false,
          message: "メンバーの除外に失敗しました（supabase/migrations/20261103800000_remove_member.sql を適用してください）",
        };
      }
      return { ok: false, message: "メンバーの除外に失敗しました" };
    }
    // 組織からの除外は完了しているため、アカウントの削除に失敗しても成功として扱う (ログのみ残す)
    if (target.email) {
      const deleted = await deleteUnjoinedUser(target.email);
      if (!deleted.ok) console.error("[removeMember] failed to delete account of removed member", deleted.error);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
