"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

const TABS = [
  { key: "info", label: "PJ情報詳細" },
  { key: "logs", label: "活動ログ" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// 参照 ⇔ 編集の画面遷移で選択タブを引き継ぐため、プロジェクトごとに最後のタブを覚えておく
// (クライアント側のモジュール状態。リロードすると PJ情報タブに戻る)
// cacheComponents では遷移元の画面が <Activity> で状態ごと保持されるため、useState で持つと
// 戻ったときに古いタブが復元されてしまう。外部ストアとして購読し、常に最後に選んだタブを表示する。
const lastTabs = new Map<string, TabKey>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function selectTab(projectId: string, tab: TabKey) {
  lastTabs.set(projectId, tab);
  listeners.forEach((listener) => listener());
}

// ドロワーを閉じた (= 詳細・編集画面以外へ移動した) ら記憶したタブを破棄し、
// 次に開いたときは必ず PJ情報タブから表示する。
// 詳細画面自体は <Activity> で非表示になるだけでアンマウントされないため、常に表示されているレイアウトに置く。
export function DetailTabsReset() {
  const pathname = usePathname();
  useEffect(() => {
    const openId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
    let changed = false;
    for (const projectId of lastTabs.keys()) {
      if (projectId === openId) continue;
      lastTabs.delete(projectId);
      changed = true;
    }
    if (changed) listeners.forEach((listener) => listener());
  }, [pathname]);
  return null;
}

// 編集中のフォーム状態を失わないよう、非選択タブはアンマウントせず hidden にする
// footer (Edit / Save ボタン) はどちらのタブでも表示し、PJ情報と活動ログの編集モードを一緒に切り替える
export function DetailTabs({
  projectId,
  info,
  logs,
  footer,
}: {
  projectId: string;
  info: ReactNode;
  logs: ReactNode;
  footer?: ReactNode;
}) {
  const active = useSyncExternalStore(
    subscribe,
    () => lastTabs.get(projectId) ?? "info",
    () => "info",
  );

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
            onClick={() => selectTab(projectId, tab.key)}
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
