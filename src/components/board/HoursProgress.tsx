export function formatHours(hours: number) {
  return `${Number(hours.toFixed(2))}`;
}

export function HoursProgress({
  actual,
  planned,
  className = "mx-auto",
}: {
  actual: number;
  planned: number;
  className?: string;
}) {
  const ratio = planned > 0 ? Math.min(actual / planned, 1) : 0;
  const over = planned > 0 && actual > planned;
  return (
    <div className={`w-32 space-y-1.5 ${className}`}>
      <p className={`text-center text-xs tabular-nums ${over ? "font-medium text-red-600" : "text-slate-500"}`}>
        {formatHours(actual)}/{formatHours(planned)}h
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={planned}
        aria-valuenow={actual}
        aria-label="工数の消化状況"
        className="h-1.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={`h-full rounded-full transition-[width] ${over ? "bg-red-400" : "bg-accent"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
