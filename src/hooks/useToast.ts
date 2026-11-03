"use client";

import { useCallback, useState } from "react";

// 操作完了の通知 (<Toast>) に表示するメッセージ。null のときは非表示
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((text: string) => setMessage(text), []);
  const dismiss = useCallback(() => setMessage(null), []);
  return { message, show, dismiss };
}
