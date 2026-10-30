"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { fullInputClass } from "@/components/ui/form";

export type LinkDraft = { key: string; label: string; url: string };

function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// 編集フォーム専用の関連リンク入力。左端のハンドルを掴んで上下にドラッグすると並び替えられる
// (キーボードではハンドルにフォーカスして ↑ / ↓)。
export function LinksEditor({
  links,
  setLinks,
}: {
  links: LinkDraft[];
  setLinks: Dispatch<SetStateAction<LinkDraft[]>>;
}) {
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [draggingKey, setDraggingKey] = useState<string | null>(null);

  // ドラッグ中は window でポインターを追い、ポインター位置より上に中心がある行の数を挿入位置とする
  useEffect(() => {
    if (!draggingKey) return;
    const onMove = (e: PointerEvent) =>
      setLinks((ls) => {
        const to = ls.filter((l) => {
          if (l.key === draggingKey) return false;
          const rect = rowRefs.current.get(l.key)?.getBoundingClientRect();
          return !!rect && rect.top + rect.height / 2 < e.clientY;
        }).length;
        return moveItem(ls, ls.findIndex((l) => l.key === draggingKey), to);
      });
    const end = () => setDraggingKey(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [draggingKey, setLinks]);

  const updateLink = (key: string, field: "label" | "url", value: string) =>
    setLinks((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));

  const moveBy = (key: string, delta: number) =>
    setLinks((ls) => {
      const from = ls.findIndex((l) => l.key === key);
      return moveItem(ls, from, from + delta);
    });

  return (
    <div className={`space-y-2 ${draggingKey ? "cursor-grabbing select-none" : ""}`}>
      {links.length > 0 && (
        <div className="grid grid-cols-[1.5rem_1fr_2fr_2rem] gap-2 text-xs text-gray-600">
          <span />
          <span>ラベル</span>
          <span>URL</span>
        </div>
      )}
      {links.map((link) => (
        <div
          key={link.key}
          ref={(el) => {
            if (!el) return;
            rowRefs.current.set(link.key, el);
            return () => {
              rowRefs.current.delete(link.key);
            };
          }}
          className={`grid grid-cols-[1.5rem_1fr_2fr_2rem] items-center gap-2 rounded-lg transition-shadow ${
            draggingKey === link.key ? "relative z-10 bg-row-active shadow-lg ring-2 ring-primary/30" : ""
          }`}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.focus();
              setDraggingKey(link.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                moveBy(link.key, e.key === "ArrowUp" ? -1 : 1);
              }
            }}
            className={`grid h-8 w-6 touch-none place-items-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 ${
              draggingKey ? "cursor-grabbing" : "cursor-grab"
            }`}
            aria-label="ドラッグして並び替え（↑↓キーでも移動）"
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <input
            aria-label="リンクのラベル"
            value={link.label}
            onChange={(e) => updateLink(link.key, "label", e.target.value)}
            className={fullInputClass}
          />
          <input
            aria-label="リンクのURL"
            type="url"
            value={link.url}
            placeholder="https://"
            onChange={(e) => updateLink(link.key, "url", e.target.value)}
            className={fullInputClass}
          />
          <button
            type="button"
            onClick={() => setLinks((ls) => ls.filter((l) => l.key !== link.key))}
            className="grid size-8 place-items-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
            aria-label="リンクを削除"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setLinks((ls) => [...ls, { key: crypto.randomUUID(), label: "", url: "" }])
        }
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <Plus className="size-4" aria-hidden />
        リンクを追加
      </button>
    </div>
  );
}
