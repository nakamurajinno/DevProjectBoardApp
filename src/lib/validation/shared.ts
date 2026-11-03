// クライアントから届く値 (unknown) を安全に読み出すための共通ヘルパー

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// オブジェクト以外の値は空オブジェクトとして扱う
export function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

// 文字列以外は空文字にし、前後の空白を取り除く
export function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
