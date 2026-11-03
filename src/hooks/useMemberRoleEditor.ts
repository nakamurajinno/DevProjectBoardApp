"use client";

import { useLayoutEffect, useMemo, useState, useTransition } from "react";
import { changeMemberRoles } from "@/app/actions/organization";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { useToast } from "@/hooks/useToast";
import type { MemberRoleChange, OrganizationMember, UserRole } from "@/types";

// 自分を一番上に、それ以外は登録 (参加) 日時の新しい順に並べる
function sortMembers(members: OrganizationMember[], currentUserId: string) {
  return [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

// 組織設定画面のメンバーのロール変更。変更は下書きとして持ち、「変更を保存」でまとめて保存する。
// 完了通知の toast はメンバーの除外と共有するため、呼び出し側から受け取る
export function useMemberRoleEditor(
  members: OrganizationMember[],
  currentUserId: string,
  toast: ReturnType<typeof useToast>,
) {
  // 未保存のロール変更 (メンバー ID → 変更後のロール)。保存済みのロールと同じ値は持たない
  const [drafts, setDrafts] = useState<Record<string, UserRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  // 自分自身を管理ユーザーから降格する変更を保存する前の確認ダイアログ
  const confirm = useDisclosure();
  const { dismiss: dismissToast } = toast;
  const { close: closeConfirm } = confirm;

  // Cache Components 有効時は別の画面へ遷移してもページが <Activity> で隠されるだけで state が残るため、
  // 画面が隠れるタイミング (cleanup) で未保存の変更を破棄して保存済みのロール表示に戻す
  useLayoutEffect(() => {
    return () => {
      setDrafts({});
      setError(null);
      dismissToast();
      closeConfirm();
    };
  }, [dismissToast, closeConfirm]);

  const savedRoles = useMemo(() => new Map(members.map((m) => [m.id, m.role])), [members]);
  // サーバーの値と一致するようになった (他の画面で変更された等) 下書きは変更扱いにしない
  const changes: MemberRoleChange[] = Object.entries(drafts)
    .filter(([id, role]) => savedRoles.has(id) && savedRoles.get(id) !== role)
    .map(([userId, role]) => ({ userId, role }));
  const demotesSelf = changes.some(
    (c) => c.userId === currentUserId && savedRoles.get(c.userId) === "admin" && c.role !== "admin",
  );
  const sortedMembers = useMemo(() => sortMembers(members, currentUserId), [members, currentUserId]);

  const roleOf = (member: OrganizationMember) => drafts[member.id] ?? member.role;

  const changeRole = (member: OrganizationMember, role: UserRole) => {
    setError(null);
    setDrafts((prev) => {
      const next = { ...prev };
      if (role === member.role) delete next[member.id];
      else next[member.id] = role;
      return next;
    });
  };

  const save = () => {
    confirm.close();
    setError(null);
    startSaving(async () => {
      const result = await changeMemberRoles(changes);
      // 成功・失敗どちらもサーバーの値 (成功時は更新後、失敗時は巻き戻し後) の表示に戻す
      setDrafts({});
      if (result.ok) toast.show("メンバーの権限を更新しました");
      else setError(result.message);
    });
  };

  // 自分を降格する変更が含まれる場合は確認ダイアログを挟む
  const requestSave = () => {
    if (demotesSelf) confirm.open();
    else save();
  };

  return {
    sortedMembers,
    roleOf,
    changeRole,
    dirty: changes.length > 0,
    saving,
    error,
    requestSave,
    save,
    confirm,
  };
}
