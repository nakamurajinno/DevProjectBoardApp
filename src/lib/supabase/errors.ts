// Supabase (PostgREST / Postgres / Auth) のエラーから、原因の特定に必要な情報を取り出す。
// PostgrestError: code (SQLSTATE / PGRSTxxx), message, details, hint
// AuthError: status, code, message
type ErrorLike = {
  name?: unknown;
  code?: unknown;
  status?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export type SupabaseErrorInfo = {
  // どの処理 (テーブル・RPC・Auth API) で失敗したか
  step: string;
  name?: string;
  code?: string;
  status?: number;
  message: string;
  details?: string;
  hint?: string;
};

const str = (v: unknown) => (typeof v === "string" && v !== "" ? v : undefined);

export function describeSupabaseError(step: string, error: unknown): SupabaseErrorInfo {
  if (error && typeof error === "object") {
    const e = error as ErrorLike;
    return {
      step,
      name: str(e.name),
      code: str(e.code) ?? (typeof e.code === "number" ? String(e.code) : undefined),
      status: typeof e.status === "number" ? e.status : undefined,
      message: str(e.message) ?? JSON.stringify(error),
      details: str(e.details),
      hint: str(e.hint),
    };
  }
  return { step, message: String(error) };
}

// 画面表示用の 1 行 (例: "[upsert_invitation] 23505 duplicate key ... / details: Key (...)=(...) already exists.")
export function formatSupabaseError(info: SupabaseErrorInfo): string {
  const head = [info.code, info.status ? `HTTP ${info.status}` : undefined].filter(Boolean).join(" ");
  return [
    `[${info.step}]${head ? ` ${head}` : ""} ${info.message}`,
    info.details && `details: ${info.details}`,
    info.hint && `hint: ${info.hint}`,
  ]
    .filter(Boolean)
    .join(" / ");
}

// ターミナルにエラーの詳細を出力し、画面表示用の文字列を返す
export function logSupabaseError(context: string, step: string, error: unknown): string {
  const info = describeSupabaseError(step, error);
  console.error(`[${context}] ${step} failed:`, info, error);
  return formatSupabaseError(info);
}
