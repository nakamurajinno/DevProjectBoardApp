"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "@/components/ui/Floating";

// text は文字列、または押した時点で値を作る関数 (window.location を使う場合など)
export function CopyButton({ text, label }: { text: string | (() => string); label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === "function" ? text() : text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("コピーできませんでした");
    }
  };

  return (
    <Tooltip content={copied ? "コピーしました" : label}>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        {copied ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    </Tooltip>
  );
}
