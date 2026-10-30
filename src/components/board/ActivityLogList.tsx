import type { ActivityLog } from "@/types";
import { formatHours } from "./HoursProgress";

function formatDate(date: string) {
  return date.replaceAll("-", "/").replace(/\/0(\d)/g, "/$1");
}

export function ActivityLogList({ logs }: { logs: ActivityLog[] }) {
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
      <ul className="space-y-3">
        {logs.map((log) => (
          <li key={log.id} className="rounded-lg bg-row-active px-4 py-3">
            <p className="flex items-baseline gap-4 text-sm font-bold">
              <time dateTime={log.worked_on}>{formatDate(log.worked_on)}</time>
              <span>{formatHours(log.hours)}h</span>
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm">{log.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
