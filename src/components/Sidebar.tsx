import {
  Books,
  House,
  MagnifyingGlass,
  Moon,
  Palette,
  Playlist,
  SpotifyLogo,
  Sun,
  Monitor,
  Heart,
} from "@phosphor-icons/react";
import type { NavTab } from "../types/music";
import { useTheme } from "../context/ThemeContext";
import { useLibrary } from "../context/LibraryContext";
import { BrandMark } from "./BrandMark";
import { Artwork } from "./Artwork";

interface SidebarProps {
  activeTab: NavTab;
  activeCollectionId: string | null;
  onSelectTab: (tab: NavTab) => void;
  onOpenCollection: (id: string) => void;
  onOpenSpotifyImport: () => void;
}

export function Sidebar({
  activeTab,
  activeCollectionId,
  onSelectTab,
  onOpenCollection,
  onOpenSpotifyImport,
}: SidebarProps) {
  const { themePref, cycleTheme, dynamicColor, setDynamicColor } = useTheme();
  const { customPlaylists, savedCollections, likedTracks } = useLibrary();

  const themeLabel =
    themePref === "light" ? "Light paper" : themePref === "dark" ? "Adaptive dark" : "System";

  return (
    <aside className="sidebar" aria-label="Primary studio navigation">
      <button
        type="button"
        className="brand-lockup"
        onClick={() => onSelectTab("home")}
        aria-label="Meld Home"
      >
        <BrandMark size={36} />
        <div style={{ textAlign: "left" }}>
          <div className="brand-title">Meld</div>
          <div className="brand-sub">Open Music Web</div>
        </div>
      </button>

      <nav className="sidebar-section" aria-label="Main sections">
        <span className="sidebar-heading">Listen</span>
        <button
          type="button"
          className={`nav-btn${activeTab === "home" && !activeCollectionId ? " is-active" : ""}`}
          onClick={() => onSelectTab("home")}
          aria-current={activeTab === "home" && !activeCollectionId ? "page" : undefined}
        >
          <House size={20} weight={activeTab === "home" && !activeCollectionId ? "fill" : "regular"} className="nav-icon" />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`nav-btn${activeTab === "search" && !activeCollectionId ? " is-active" : ""}`}
          onClick={() => onSelectTab("search")}
          aria-current={activeTab === "search" && !activeCollectionId ? "page" : undefined}
        >
          <MagnifyingGlass size={20} weight={activeTab === "search" && !activeCollectionId ? "bold" : "regular"} className="nav-icon" />
          <span>Search</span>
        </button>

        <button
          type="button"
          className={`nav-btn${activeTab === "library" && !activeCollectionId ? " is-active" : ""}`}
          onClick={() => onSelectTab("library")}
          aria-current={activeTab === "library" && !activeCollectionId ? "page" : undefined}
        >
          <Books size={20} weight={activeTab === "library" && !activeCollectionId ? "fill" : "regular"} className="nav-icon" />
          <span>Library</span>
          {likedTracks.length > 0 && <span className="nav-btn-meta">{likedTracks.length}</span>}
        </button>
      </nav>

      <div className="sidebar-section">
        <span className="sidebar-heading">Bridge</span>
        <button type="button" className="nav-btn" onClick={onOpenSpotifyImport}>
          <SpotifyLogo size={20} weight="fill" style={{ color: "var(--accent)" }} />
          <span>Import Spotify</span>
        </button>
        <button
          type="button"
          className={`nav-btn${activeCollectionId === "liked" ? " is-active" : ""}`}
          onClick={() => onOpenCollection("liked")}
        >
          <Heart size={20} weight={activeCollectionId === "liked" ? "fill" : "regular"} className="nav-icon" />
          <span>Liked Songs</span>
          <span className="nav-btn-meta">{likedTracks.length}</span>
        </button>
      </div>

      {(customPlaylists.length > 0 || savedCollections.length > 0) && (
        <div className="sidebar-section" style={{ flex: 1, minHeight: 0 }}>
          <span className="sidebar-heading">Your Collections</span>
          <div className="sidebar-playlist-list">
            {customPlaylists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className={`sidebar-playlist-item${activeCollectionId === pl.id ? " is-active" : ""}`}
                onClick={() => onOpenCollection(pl.id)}
              >
                {pl.artwork ? (
                  <Artwork src={pl.artwork} alt="" className="sidebar-playlist-thumb" size={56} />
                ) : (
                  <Playlist size={18} style={{ flexShrink: 0 }} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pl.title}
                </span>
              </button>
            ))}
            {savedCollections.map((col) => (
              <button
                key={col.id}
                type="button"
                className={`sidebar-playlist-item${activeCollectionId === col.id ? " is-active" : ""}`}
                onClick={() => onOpenCollection(col.id)}
              >
                <Artwork src={col.artwork} alt="" className="sidebar-playlist-thumb" size={56} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {col.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-btn"
          onClick={cycleTheme}
          aria-label={`Switch theme mode, currently ${themeLabel}`}
        >
          {themePref === "light" && <Sun size={19} weight="fill" />}
          {themePref === "dark" && <Moon size={19} weight="fill" />}
          {themePref === "system" && <Monitor size={19} />}
          <span>{themeLabel}</span>
        </button>

        <button
          type="button"
          className={`nav-btn${dynamicColor ? " is-active" : ""}`}
          onClick={() => setDynamicColor(!dynamicColor)}
          aria-pressed={dynamicColor}
        >
          <Palette size={19} weight={dynamicColor ? "fill" : "regular"} className="nav-icon" />
          <span>Cover chroma</span>
          <span className="nav-btn-meta">{dynamicColor ? "On" : "Off"}</span>
        </button>
      </div>
    </aside>
  );
}
