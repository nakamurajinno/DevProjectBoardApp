import { headers } from "next/headers";

// メール内リンクのリダイレクト先に使う、アプリの origin (例: http://localhost:3000)
export async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
