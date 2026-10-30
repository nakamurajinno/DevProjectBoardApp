"use client";

import { Ellipsis, FilePenLine, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { deleteProject } from "@/app/actions/projects";
import { Menu, menuItemClass, Tooltip } from "@/components/ui/Floating";
import { DialogModal } from "@/components/ui/Overlay";
import type { Project } from "@/types";
import { ActivityLogForm } from "./ActivityLogForm";

const circleButton =
  "grid size-9 place-items-center rounded-full border-2 border-sky-300 bg-row-active text-gray-800 hover:bg-sky-100";

export function RowActions({ project }: { project: Pick<Project, "id" | "name"> }) {
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const closeLog = useCallback(() => setLogOpen(false), []);

  const handleDelete = () => {
    setOpen(false);
    if (!confirm(`「${project.name}」を削除しますか？`)) return;
    startTransition(() => deleteProject(project.id));
  };

  // 行 (tr.group) のホバー / フォーカス時のみ表示する。メニュー展開中とホバー不可端末では常に表示。
  return (
    <div
      className={`flex items-center justify-end gap-2 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
        open ? "opacity-100" : "opacity-0"
      }`}
    >
      <Tooltip content="活動ログ入力">
        <button
          type="button"
          className={circleButton}
          aria-label={`${project.name}の活動ログ入力`}
          aria-haspopup="dialog"
          onClick={() => setLogOpen(true)}
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
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>
      {open && (
        <Menu anchorRef={triggerRef} onClose={close}>
          <Link
            role="menuitem"
            href={`/projects/${project.id}/edit`}
            className={`${menuItemClass} hover:bg-gray-100`}
            onClick={close}
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
      {logOpen && (
        <DialogModal title={`活動ログ入力 - ${project.name}`} onClose={closeLog}>
          <ActivityLogForm projectId={project.id} onCancel={closeLog} onSaved={closeLog} />
        </DialogModal>
      )}
    </div>
  );
}
