import { Books, House, MagnifyingGlass, SpotifyLogo } from "@phosphor-icons/react";
import type { NavTab } from "../types/music";

interface MobileNavProps {
  activeTab: NavTab;
  activeCollectionId: string | null;
  onSelectTab: (tab: NavTab) => void;
  onOpenSpotifyImport: () => void;
}

export function MobileNav({
  activeTab,
  activeCollectionId,
  onSelectTab,
  onOpenSpotifyImport,
}: MobileNavProps) {
  return (
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <button
        type="button"
        className={`mobile-nav-btn${activeTab === "home" && !activeCollectionId ? " is-active" : ""}`}
        onClick={() => onSelectTab("home")}
      >
        <House
          size={22}
          weight={activeTab === "home" && !activeCollectionId ? "fill" : "regular"}
          className="mobile-nav-icon"
        />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn${activeTab === "search" && !activeCollectionId ? " is-active" : ""}`}
        onClick={() => onSelectTab("search")}
      >
        <MagnifyingGlass
          size={22}
          weight={activeTab === "search" && !activeCollectionId ? "bold" : "regular"}
          className="mobile-nav-icon"
        />
        <span>Search</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-btn${activeTab === "library" && !activeCollectionId ? " is-active" : ""}`}
        onClick={() => onSelectTab("library")}
      >
        <Books
          size={22}
          weight={activeTab === "library" && !activeCollectionId ? "fill" : "regular"}
          className="mobile-nav-icon"
        />
        <span>Library</span>
      </button>

      <button
        type="button"
        className="mobile-nav-btn"
        onClick={onOpenSpotifyImport}
      >
        <SpotifyLogo size={22} weight="fill" style={{ color: "var(--accent)" }} />
        <span>Import</span>
      </button>
    </nav>
  );
}
