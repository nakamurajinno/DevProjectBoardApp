"use client";

import { Button } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toast } from "@/components/ui/Toast";
import { useMemberRemoval } from "@/hooks/useMemberRemoval";
import { useMemberRoleEditor } from "@/hooks/useMemberRoleEditor";
import { useToast } from "@/hooks/useToast";
import type { OrganizationMember } from "@/types";
import { MemberRow } from "./MemberRow";

export function MemberList({
  members,
  currentUserId,
  editable,
}: {
  members: OrganizationMember[];
  currentUserId: string;
  editable: boolean;
}) {
  const toast = useToast();
  const removal = useMemberRemoval(members, currentUserId, (member) =>
    toast.show(`${member.name}さんを組織から除外しました`),
  );
  // 除外したメンバーはロール変更の対象からも外す
  const editor = useMemberRoleEditor(removal.visibleMembers, currentUserId, toast);
  const busy = editor.saving || removal.removing;
  const error = removal.error ?? editor.error;

  return (
    <>
      <ul className="divide-y divide-slate-100">
        {editor.sortedMembers.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            role={editor.roleOf(member)}
            isCurrentUser={member.id === currentUserId}
            editable={editable}
            disabled={busy}
            removeBlockedReason={removal.blockedReason(member)}
            onRoleChange={(role) => editor.changeRole(member, role)}
            onRemove={() => removal.request(member)}
          />
        ))}
      </ul>

      {editable && (
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
          {error && (
            <p role="alert" className="text-xs text-red-600 sm:mr-auto">
              {error}
            </p>
          )}
          <Button type="button" disabled={!editor.dirty || busy} onClick={editor.requestSave}>
            {editor.saving ? "保存中…" : "変更を保存"}
          </Button>
        </div>
      )}

      {editor.confirm.isOpen && (
        <ConfirmDialog title="自分の権限を変更しますか？" onConfirm={editor.save} onClose={editor.confirm.close}>
          <p>
            自分の権限を管理ユーザーから変更すると、メンバーの招待やメンバー権限の変更ができなくなります。よろしいですか？
          </p>
        </ConfirmDialog>
      )}

      {removal.target && (
        <ConfirmDialog
          title="メンバーを組織から除外しますか？"
          confirmLabel={removal.removing ? "除外中…" : "除外する"}
          cancelLabel="キャンセル"
          confirmVariant="danger"
          confirmDisabled={removal.removing}
          onConfirm={removal.confirm}
          onClose={removal.cancel}
        >
          <p>
            <span className="font-medium text-slate-900">{removal.target.name}</span>
            <span className="text-slate-500">（{removal.target.email}）</span>
            を組織から除外します。除外されたユーザーはこの組織のプロジェクトを参照・編集できなくなり、アカウントも削除されます。
          </p>
          <p className="mt-2">作成したプロジェクト・活動記録は組織に残ります。この操作は取り消せません。</p>
        </ConfirmDialog>
      )}

      {toast.message && <Toast message={toast.message} onClose={toast.dismiss} />}
    </>
  );
}
