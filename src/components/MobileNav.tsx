import { useCallback, useRef, useState } from "react";
import type { NavTab } from "../types/music";

interface MobileNavProps {
  activeTab: NavTab;
  activeCollectionId: string | null;
  onSelectTab: (tab: NavTab) => void;
}

type BottomTabId = "home" | "search" | "explore" | "library";

interface TabItem {
  id: BottomTabId;
  label: string;
}

const TABS: TabItem[] = [
  { id: "home", label: "Home" },
  { id: "search", label: "Search" },
  { id: "explore", label: "Explore" },
  { id: "library", label: "Library" },
];

function NavIconHome({ isActive, isAnimating }: { isActive: boolean; isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={isActive ? "2.3" : "2.0"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-vector-icon nav-icon-home${isAnimating ? " is-animating" : ""}`}
    >
      <path d="M3 10.2L12 3l9 7.2v9.3a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9.3z" />
      <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
    </svg>
  );
}

function NavIconSearch({ isActive, isAnimating }: { isActive: boolean; isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={isActive ? "2.3" : "2.0"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-vector-icon nav-icon-search${isAnimating ? " is-animating" : ""}`}
    >
      <circle className="nav-search-pulse" cx="10.5" cy="10.5" r="7" />
      <g className="nav-search-glass">
        <circle cx="10.5" cy="10.5" r="7" />
        <path d="M15.8 15.8L21 21" />
      </g>
    </svg>
  );
}

function NavIconExplore({ isActive, isAnimating }: { isActive: boolean; isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={isActive ? "2.3" : "2.0"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-vector-icon nav-icon-explore${isAnimating ? " is-animating" : ""}`}
    >
      <circle cx="12" cy="12" r="9.5" />
      <g className="nav-explore-needle">
        <polygon
          points="12,5 14.8,12 12,19 9.2,12"
          fill={isActive ? "currentColor" : "none"}
          fillOpacity={isActive ? "0.25" : "0"}
        />
        <line x1="12" y1="5" x2="12" y2="19" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

function NavIconLibrary({ isActive, isAnimating }: { isActive: boolean; isAnimating: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={isActive ? "2.3" : "2.0"}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`nav-vector-icon nav-icon-library${isAnimating ? " is-animating" : ""}`}
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8" strokeWidth="1.8" />
      <path d="M8 11h6" strokeWidth="1.8" />
    </svg>
  );
}

export function MobileNav({
  activeTab,
  activeCollectionId,
  onSelectTab,
}: MobileNavProps) {
  const [animatingTab, setAnimatingTab] = useState<BottomTabId | null>(null);
  const animTimerRef = useRef<number | null>(null);

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);
  const isTabInNav = activeIndex !== -1;
  const tabIndex = isTabInNav ? activeIndex : 0;
  const showPill = isTabInNav && !activeCollectionId;

  const handleTabClick = useCallback(
    (tabId: BottomTabId) => {
      // Trigger haptic vibration feedback
      try {
        if ("vibrate" in navigator) {
          navigator.vibrate(8);
        }
      } catch (_) {}

      // One-shot Telegram-grade vector micro-animation
      setAnimatingTab(tabId);
      if (animTimerRef.current !== null) {
        window.clearTimeout(animTimerRef.current);
      }
      animTimerRef.current = window.setTimeout(() => {
        setAnimatingTab(null);
        animTimerRef.current = null;
      }, 550);

      onSelectTab(tabId);
    },
    [onSelectTab],
  );

  return (
    <nav
      className="mobile-nav"
      aria-label="Mobile navigation"
      style={
        {
          "--pill-idx": tabIndex,
          "--pill-opacity": showPill ? 1 : 0,
        } as React.CSSProperties
      }
    >
      <div className="mobile-nav-pill-track" aria-hidden="true">
        <div className="mobile-nav-pill" />
      </div>

      {TABS.map((tab) => {
        const isActive = activeTab === tab.id && !activeCollectionId;
        const isAnimating = animatingTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-nav-btn${isActive ? " is-active" : ""}`}
            onClick={() => handleTabClick(tab.id)}
            onPointerDown={() => {
              try {
                if ("vibrate" in navigator) {
                  navigator.vibrate(8);
                }
              } catch (_) {}
            }}
          >
            {tab.id === "home" && <NavIconHome isActive={isActive} isAnimating={isAnimating} />}
            {tab.id === "search" && <NavIconSearch isActive={isActive} isAnimating={isAnimating} />}
            {tab.id === "explore" && <NavIconExplore isActive={isActive} isAnimating={isAnimating} />}
            {tab.id === "library" && <NavIconLibrary isActive={isActive} isAnimating={isAnimating} />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
