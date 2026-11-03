"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { DialogModal } from "@/components/ui/Overlay";
import { formatDate, formatHours } from "@/lib/format";
import type { ActivityLog } from "@/types";
import { ActivityLogForm } from "./ActivityLogForm";

// 作業日の新しい順 (同日は登録の新しい順) に並べたタイムラインで表示する。
// 並び順はリポジトリ側で決まるので、ここでは受け取った順のまま描画する。
// onChange / onDelete を渡したとき (プロジェクトの Edit モード中) だけ、各カードに鉛筆・ゴミ箱アイコンを表示する。
// 変更は呼び出し側の下書きに反映するだけで、保存はプロジェクトの Save で行う。
export function ActivityLogList({
  logs,
  onChange,
  onDelete,
}: {
  logs: ActivityLog[];
  onChange?: (log: ActivityLog) => void;
  onDelete?: (log: ActivityLog) => void;
}) {
  const editable = !!onChange && !!onDelete;
  const [editing, setEditing] = useState<ActivityLog>();
  const closeEditor = useCallback(() => setEditing(undefined), []);

  const handleDelete = (log: ActivityLog) => {
    if (!confirm(`${formatDate(log.worked_on)}の活動ログを削除しますか？`)) return;
    onDelete?.(log);
  };

  if (logs.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        活動ログはまだありません。
      </p>
    );
  }

  const total = logs.reduce((sum, log) => sum + log.hours, 0);

  return (
    <div className="space-y-3">
      <p className="text-right text-xs tabular-nums text-slate-500">
        合計 {formatHours(total)}h
      </p>
      <ol className="space-y-4 pl-7">
        {logs.map((log) => (
          // タイムライン軸: 各ドットの中心から次のドットの中心 (間隔 16px + 28px 下) まで縦線を引く
          <li
            key={log.id}
            className="relative before:absolute before:-bottom-11 before:-left-[21px] before:top-7 before:w-px before:bg-tab-border last:before:hidden"
          >
            {/* ドット: カードのヘッダー行 (上余白 12px + 高さ 32px) の縦中央に合わせる */}
            <span
              className="absolute -left-7 top-5 size-4 rounded-full border-[3px] border-white bg-accent ring-1 ring-slate-200"
              aria-hidden
            />
            <article
              className={`rounded-lg border bg-white p-3 shadow-sm ${
                editable ? "border-accent/40" : "border-slate-200"
              }`}
            >
              <header className="flex min-h-8 items-center gap-4 text-sm font-semibold text-slate-900">
                <time dateTime={log.worked_on}>{formatDate(log.worked_on)}</time>
                <span className="tabular-nums text-accent">{formatHours(log.hours)}h</span>
                <span className="min-w-0 truncate text-xs font-normal text-slate-500">
                  登録者: {log.created_by_name ?? "—"}
                </span>
                {editable && (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${formatDate(log.worked_on)}の活動ログを編集`}
                      aria-haspopup="dialog"
                      onClick={() => setEditing(log)}
                      className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`${formatDate(log.worked_on)}の活動ログを削除`}
                      onClick={() => handleDelete(log)}
                      className="grid size-8 place-items-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
              </header>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {log.content}
              </p>
            </article>
          </li>
        ))}
      </ol>
      {editable && editing && (
        <DialogModal title={`活動ログ編集 - ${formatDate(editing.worked_on)}`} onClose={closeEditor}>
          <ActivityLogForm
            projectId={editing.project_id}
            log={editing}
            onCancel={closeEditor}
            onSaved={(draft) => {
              if (draft) onChange?.({ ...editing, ...draft });
              closeEditor();
            }}
          />
        </DialogModal>
      )}
    </div>
  );
}
