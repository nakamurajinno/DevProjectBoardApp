"use client";

import { useLayoutEffect, useMemo, useState, useTransition } from "react";
import { removeMember } from "@/app/actions/organization";
import type { OrganizationMember } from "@/types";

// 組織設定画面のメンバーの除外。確認ダイアログで確定すると除外し、成功したメンバーはすぐに一覧から消す
export function useMemberRemoval(
  members: OrganizationMember[],
  currentUserId: string,
  onRemoved: (member: OrganizationMember) => void,
) {
  // 確認ダイアログで除外しようとしているメンバー
  const [target, setTarget] = useState<OrganizationMember | null>(null);
  // 除外に成功したメンバー。サーバーの再取得 (revalidate) を待たずに一覧から消すために使う
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();

  // 画面が隠れるタイミング (<Activity>) で確認ダイアログ・エラー表示を閉じる
  useLayoutEffect(() => {
    return () => {
      setTarget(null);
      setError(null);
    };
  }, []);

  const visibleMembers = useMemo(
    () => members.filter((m) => !removedIds.has(m.id)),
    [members, removedIds],
  );
  const adminCount = visibleMembers.filter((m) => m.role === "admin").length;

  // 除外できない理由 (除外できる場合は null)。自分自身・最後の管理ユーザーは除外できない
  const blockedReason = (member: OrganizationMember): string | null => {
    if (member.id === currentUserId) return "自分自身は組織から除外できません";
    if (member.role === "admin" && adminCount <= 1) return "組織には管理ユーザーが 1 人以上必要です";
    return null;
  };

  const request = (member: OrganizationMember) => {
    if (blockedReason(member)) return;
    setError(null);
    setTarget(member);
  };

  const cancel = () => {
    if (!removing) setTarget(null);
  };

  const confirm = () => {
    const member = target;
    if (!member) return;
    setError(null);
    startRemoving(async () => {
      const result = await removeMember(member.id);
      setTarget(null);
      if (result.ok) {
        setRemovedIds((prev) => new Set(prev).add(member.id));
        onRemoved(member);
      } else {
        setError(result.message);
      }
    });
  };

  return { visibleMembers, blockedReason, target, removing, error, request, cancel, confirm };
}
