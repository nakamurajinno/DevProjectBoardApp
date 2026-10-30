export function formatHours(hours: number) {
  return `${Number(hours.toFixed(2))}`;
}

export function HoursProgress({
  actual,
  planned,
}: {
  actual: number;
  planned: number;
}) {
  const ratio = planned > 0 ? Math.min(actual / planned, 1) : 0;
  const over = planned > 0 && actual > planned;
  return (
    <div className="mx-auto w-32 space-y-1">
      <p className={`text-center text-xs ${over ? "text-red-600" : ""}`}>
        {formatHours(actual)}/{formatHours(planned)}h
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={planned}
        aria-valuenow={actual}
        aria-label="工数の消化状況"
        className="h-2.5 overflow-hidden rounded-full border-2 border-gray-900 bg-white"
      >
        <div
          className={`h-full ${over ? "bg-red-500" : "bg-primary"}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
