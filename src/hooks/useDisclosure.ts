"use client";

import { useCallback, useState } from "react";

// モーダル・メニューなどの開閉状態。コールバックは再生成されないので子コンポーネントへそのまま渡せる
export function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  return { isOpen, open, close, toggle };
}
