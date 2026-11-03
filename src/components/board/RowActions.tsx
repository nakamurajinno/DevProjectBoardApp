"use client";

import { Ellipsis, FilePenLine, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useTransition } from "react";
import { deleteProject } from "@/app/actions/projects";
import { Menu, menuItemClass, Tooltip } from "@/components/ui/Floating";
import { DialogModal } from "@/components/ui/Overlay";
import { useDisclosure } from "@/hooks/useDisclosure";
import type { Project } from "@/types";
import { ActivityLogForm } from "./ActivityLogForm";

const circleButton =
  "grid size-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900 lg:size-8";

// alwaysVisible: モバイルのカード表示など、ホバーに頼らず常にボタンを表示する場合に true
export function RowActions({
  project,
  alwaysVisible = false,
}: {
  project: Pick<Project, "id" | "name">;
  alwaysVisible?: boolean;
}) {
  const menu = useDisclosure();
  const logDialog = useDisclosure();
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleDelete = () => {
    menu.close();
    if (!confirm(`「${project.name}」を削除しますか？`)) return;
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (result?.message) alert(result.message);
    });
  };

  // 行 (tr.group) のホバー / フォーカス時のみ表示する。メニュー展開中とホバー不可端末では常に表示。
  return (
    <div
      className={`flex items-center justify-end gap-2 transition-opacity ${
        alwaysVisible
          ? ""
          : `group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
              menu.isOpen ? "opacity-100" : "opacity-0"
            }`
      }`}
    >
      <Tooltip content="活動ログ入力">
        <button
          type="button"
          className={circleButton}
          aria-label={`${project.name}の活動ログ入力`}
          aria-haspopup="dialog"
          onClick={logDialog.open}
        >
          <FilePenLine className="size-4" aria-hidden />
        </button>
      </Tooltip>
      <button
        ref={triggerRef}
        type="button"
        className={circleButton}
        aria-label="その他の操作"
        aria-haspopup="menu"
        aria-expanded={menu.isOpen}
        disabled={pending}
        onClick={menu.toggle}
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>
      {menu.isOpen && (
        <Menu anchorRef={triggerRef} onClose={menu.close}>
          <Link
            role="menuitem"
            href={`/projects/${project.id}/edit`}
            className={`${menuItemClass} hover:bg-slate-100`}
            onClick={menu.close}
          >
            <Pencil className="size-4" aria-hidden />
            編集
          </Link>
          <button
            role="menuitem"
            type="button"
            className={`${menuItemClass} text-red-600 hover:bg-red-50`}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" aria-hidden />
            削除
          </button>
        </Menu>
      )}
      {logDialog.isOpen && (
        <DialogModal title={`活動ログ入力 - ${project.name}`} onClose={logDialog.close}>
          <ActivityLogForm projectId={project.id} onCancel={logDialog.close} onSaved={logDialog.close} />
        </DialogModal>
      )}
    </div>
  );
}
