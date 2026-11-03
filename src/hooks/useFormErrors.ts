"use client";

import { useCallback, useState } from "react";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

// 項目ごとのエラー (K = 項目名) と、フォーム全体のメッセージ
export function useFormErrors<K extends string>() {
  const [errors, setErrors] = useState<FieldErrors<K>>({});
  const [message, setMessage] = useState<string>();

  const clear = useCallback(() => {
    setErrors({});
    setMessage(undefined);
  }, []);

  const fail = useCallback((nextErrors: FieldErrors<K> = {}, nextMessage?: string) => {
    setErrors(nextErrors);
    setMessage(nextMessage);
  }, []);

  const hasErrors = message !== undefined || Object.keys(errors).length > 0;
  return { errors, message, hasErrors, clear, fail };
}
