"use client";

import { useCallback, useState, type ChangeEvent } from "react";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

// 文字列の入力値をまとめて持つフォームの state。
// bind(key) は入力欄の onChange にそのまま渡せるハンドラーを返す
export function useFormValues<T extends { [K in keyof T]: string }>(initial: T | (() => T)) {
  const [values, setValues] = useState<T>(initial);
  const bind = useCallback(
    (key: keyof T) => (e: ChangeEvent<FieldElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value })),
    [],
  );
  return { values, setValues, bind };
}
