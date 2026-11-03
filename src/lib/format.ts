// 表示用の書式変換

// 工数 (時間) を小数第 2 位までに丸め、末尾の 0 を付けずに表示する (1.50 → "1.5")
export function formatHours(hours: number) {
  return `${Number(hours.toFixed(2))}`;
}

// YYYY-MM-DD を YYYY/M/D で表示する
export function formatDate(date: string) {
  return date.replaceAll("-", "/").replace(/\/0(\d)/g, "/$1");
}

const mediumDateFormat = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeZone: "Asia/Tokyo" });

// ISO 形式の日時を日本時間の日付 (例: 2026/11/03) で表示する
export function formatJapaneseDate(iso: string) {
  return mediumDateFormat.format(new Date(iso));
}

// ローカルタイムゾーンでの本日 (YYYY-MM-DD)。toISOString() は UTC になるため使わない
export function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
