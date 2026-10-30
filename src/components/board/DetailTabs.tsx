"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "info", label: "PJ情報詳細" },
  { key: "logs", label: "活動ログ" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 編集中のフォーム状態を失わないよう、非選択タブはアンマウントせず hidden にする
export function DetailTabs({
  info,
  logs,
  footer,
}: {
  info: ReactNode;
  logs: ReactNode;
  footer?: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("info");

  return (
    <>
      <div
        role="tablist"
        className="flex shrink-0 gap-2 border-b-2 border-tab-border px-2 pt-3"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`tab-${tab.key}`}
            role="tab"
            type="button"
            aria-selected={active === tab.key}
            aria-controls={`panel-${tab.key}`}
            onClick={() => setActive(tab.key)}
            className={`w-32 py-2.5 text-sm ${
              active === tab.key
                ? "bg-tab-active"
                : "border-2 border-b-0 border-tab-border bg-white hover:bg-sky-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {TABS.map((tab) => (
          <div
            key={tab.key}
            id={`panel-${tab.key}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.key}`}
            hidden={active !== tab.key}
            className="px-5 py-4"
          >
            {tab.key === "info" ? info : logs}
          </div>
        ))}
      </div>
      {footer && (
        <div className="shrink-0 border-t border-gray-200 px-5 py-3">{footer}</div>
      )}
    </>
  );
}
