"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { DialogModal } from "@/components/ui/Overlay";
import type { ActivityLog } from "@/types";
import { ActivityLogForm } from "./ActivityLogForm";
import { formatHours } from "./HoursProgress";

function formatDate(date: string) {
  return date.replaceAll("-", "/").replace(/\/0(\d)/g, "/$1");
}

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
      <p className="py-8 text-center text-sm text-gray-500">
        活動ログはまだありません。
      </p>
    );
  }

  const total = logs.reduce((sum, log) => sum + log.hours, 0);

  return (
    <div className="space-y-3">
      <p className="text-right text-xs text-gray-600">
        合計 {formatHours(total)}h
      </p>
      <ol className="space-y-4 pl-7">
        {logs.map((log) => (
          // タイムライン軸: 各ドットの中心から次のドットの中心 (間隔 16px + 28px 下) まで縦線を引く
          <li
            key={log.id}
            className="relative before:absolute before:-bottom-11 before:-left-[21px] before:top-7 before:w-0.5 before:bg-tab-border last:before:hidden"
          >
            {/* ドット: カードのヘッダー行 (上余白 12px + 高さ 32px) の縦中央に合わせる */}
            <span
              className="absolute -left-7 top-5 size-4 rounded-full border-[3px] border-white bg-primary ring-2 ring-tab-border"
              aria-hidden
            />
            <article
              className={`rounded-lg border bg-white p-3 shadow-sm ${
                editable ? "border-sky-300" : "border-gray-200"
              }`}
            >
              <header className="flex min-h-8 items-center gap-4 text-sm font-bold">
                <time dateTime={log.worked_on}>{formatDate(log.worked_on)}</time>
                <span className="text-primary">{formatHours(log.hours)}h</span>
                {editable && (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${formatDate(log.worked_on)}の活動ログを編集`}
                      aria-haspopup="dialog"
                      onClick={() => setEditing(log)}
                      className="grid size-8 place-items-center rounded-full text-gray-700 hover:bg-sky-100"
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label={`${formatDate(log.worked_on)}の活動ログを削除`}
                      onClick={() => handleDelete(log)}
                      className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                )}
              </header>
              <p className="mt-2 whitespace-pre-wrap rounded-md bg-row-active px-3 py-2 text-sm">
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
