"use client";

import { useCallback, useLayoutEffect, useState, useTransition } from "react";
import { changeMemberRoles } from "@/app/actions/organization";
import { RoleBadge } from "@/components/board/RoleBadge";
import { Button, inputClass } from "@/components/ui/form";
import { DialogModal } from "@/components/ui/Overlay";
import { Toast } from "@/components/ui/Toast";
import { ROLE_OPTIONS, isUserRole } from "@/lib/auth/roles";
import type { OrganizationMember, UserRole } from "@/types";

const dateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

export function MemberList({
  members,
  currentUserId,
  editable,
}: {
  members: OrganizationMember[];
  currentUserId: string;
  editable: boolean;
}) {
  // 未保存のロール変更 (メンバー ID → 変更後のロール)。保存済みのロールと同じ値は持たない
  const [drafts, setDrafts] = useState<Record<string, UserRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 自分自身を管理ユーザから降格する変更を保存する前の確認ダイアログの表示状態
  const [confirmingSelfDemotion, setConfirmingSelfDemotion] = useState(false);
  const [saving, startSaving] = useTransition();
  const dismissToast = useCallback(() => setToast(null), []);
  const closeConfirm = useCallback(() => setConfirmingSelfDemotion(false), []);

  // Cache Components 有効時は別の画面へ遷移してもページが <Activity> で隠されるだけで state が残るため、
  // 画面が隠れるタイミング (cleanup) で未保存の変更を破棄して保存済みのロール表示に戻す
  useLayoutEffect(() => {
    return () => {
      setDrafts({});
      setError(null);
      setToast(null);
      setConfirmingSelfDemotion(false);
    };
  }, []);

  const savedRoles = new Map(members.map((m) => [m.id, m.role]));
  // サーバーの値と一致するようになった (他の画面で変更された等) 下書きは変更扱いにしない
  const changes = Object.entries(drafts)
    .filter(([id, role]) => savedRoles.has(id) && savedRoles.get(id) !== role)
    .map(([userId, role]) => ({ userId, role }));
  const dirty = changes.length > 0;
  const demotesSelf = changes.some(
    (c) => c.userId === currentUserId && savedRoles.get(c.userId) === "admin" && c.role !== "admin",
  );

  // 自分を一番上に、それ以外は登録 (参加) 日時の新しい順に表示する
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

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
    setConfirmingSelfDemotion(false);
    setError(null);
    startSaving(async () => {
      const result = await changeMemberRoles(changes);
      // 成功・失敗どちらもサーバーの値 (成功時は更新後、失敗時は巻き戻し後) の表示に戻す
      setDrafts({});
      if (result.ok) setToast("メンバーの権限を更新しました");
      else setError(result.message);
    });
  };

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {sortedMembers.map((member) => {
          const role = drafts[member.id] ?? member.role;
          const changed = role !== member.role;
          return (
            <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-medium text-slate-600 ring-1 ring-slate-200">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">（あなた）</span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {member.email}
                  <span className="hidden sm:inline">・{dateFormat.format(new Date(member.created_at))} 参加</span>
                </p>
              </div>
              {editable ? (
                <div className="flex items-center gap-2">
                  {changed && <span className="text-xs text-amber-600">未保存</span>}
                  <select
                    aria-label={`${member.name}のロール`}
                    value={role}
                    disabled={saving}
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      if (isUserRole(value)) changeRole(member, value);
                    }}
                    className={`${inputClass} w-32 py-1.5 text-xs disabled:opacity-50 ${changed ? "border-amber-400" : ""}`}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <RoleBadge role={member.role} />
              )}
            </li>
          );
        })}
      </ul>

      {editable && (
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {error && (
            <p role="alert" className="text-xs text-red-600 sm:mr-auto">
              {error}
            </p>
          )}
          <Button
            type="button"
            disabled={!dirty || saving}
            onClick={() => (demotesSelf ? setConfirmingSelfDemotion(true) : save())}
          >
            {saving ? "保存中…" : "変更を保存"}
          </Button>
        </div>
      )}

      {confirmingSelfDemotion && (
        <DialogModal title="自分の権限を変更しますか？" onClose={closeConfirm} widthClass="max-w-md">
          <p className="text-sm leading-relaxed text-slate-600">
            自分の権限を管理ユーザから変更すると、メンバーの招待やメンバー権限の変更ができなくなります。よろしいですか？
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeConfirm}>
              いいえ
            </Button>
            <Button type="button" onClick={save}>
              はい
            </Button>
          </div>
        </DialogModal>
      )}

      {toast && <Toast message={toast} onClose={dismissToast} />}
    </>
  );
}
