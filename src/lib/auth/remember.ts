// 「ログイン状態保持」の制御。
// チェックなしでログインした場合は認証 Cookie をセッション Cookie (ブラウザを閉じると消える) にする。
// 選択はこの Cookie に保存し、トークン更新時 (proxy.ts) にも同じ扱いを続ける。
export const REMEMBER_COOKIE = "pb_remember";

// ブラウザの上限に合わせた保持期間 (400日)
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400;

type CookieOptions = { maxAge?: number; expires?: Date | number | string };

export function isRemembered(value: string | undefined) {
  return value !== "0";
}

// 削除 (maxAge: 0) はそのまま通し、保存する Cookie だけ有効期限を外す
export function applyRemember<T extends CookieOptions>(
  options: T,
  remember: boolean,
): T {
  if (remember || options.maxAge === 0) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}

export function rememberCookieOptions(remember: boolean) {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  };
}
