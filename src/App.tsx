import { useEffect, useState } from "react";
import {
  List,
  MagnifyingGlass,
  SidebarSimple,
  SpotifyLogo,
} from "@phosphor-icons/react";
import { QuickSettingsModal } from "./components/QuickSettingsModal";
import type { NavTab, Track } from "./types/music";
import { ThemeProvider } from "./context/ThemeContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./context/ToastContext";
import { LibraryProvider } from "./context/LibraryContext";
import { PlayerProvider, usePlayer } from "./context/PlayerContext";
import { BrandMark } from "./components/BrandMark";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { MiniNowPill } from "./components/MiniNowPopover";
import { PlayerDock } from "./components/PlayerDock";
import { StudioDrawer } from "./components/StudioDrawer";
import { NowPlayingOverlay } from "./components/NowPlayingOverlay";
import { SpotifyImportModal } from "./components/SpotifyImportModal";
import { CommandSearchModal } from "./components/CommandSearchModal";
import { AddToPlaylistModal } from "./components/AddToPlaylistModal";
import { HomeView } from "./views/HomeView";
import { SearchView } from "./views/SearchView";
import { ExploreView } from "./views/ExploreView";
import { CollectionView } from "./views/CollectionView";
import { LibraryView } from "./views/LibraryView";
import { SettingsView } from "./views/SettingsView";

function parseInitialRoute(): { tab: NavTab; collectionId: string | null } {
  const path = window.location.pathname;
  if (path.startsWith("/collection/")) {
    return {
      tab: "home",
      collectionId: decodeURIComponent(path.replace("/collection/", "")),
    };
  }
  if (path.startsWith("/search")) return { tab: "search", collectionId: null };
  if (path.startsWith("/explore")) return { tab: "explore", collectionId: null };
  if (path.startsWith("/library")) return { tab: "library", collectionId: null };
  if (path.startsWith("/settings")) return { tab: "settings", collectionId: null };
  return { tab: "home", collectionId: null };
}

function MeldWorkspace() {
  const initial = parseInitialRoute();
  const [activeTab, setActiveTab] = useState<NavTab>(initial.tab);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(initial.collectionId);
  const [searchQuery, setSearchQuery] = useState("");
  const [spotifyModalOpen, setSpotifyModalOpen] = useState(false);
  const [cmdSearchOpen, setCmdSearchOpen] = useState(false);
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [playlistModalTrack, setPlaylistModalTrack] = useState<Track | null>(null);

  const { drawerOpen, setDrawerOpen, setDrawerTab } = usePlayer();

  const navigateTab = (tab: NavTab) => {
    setActiveTab(tab);
    setActiveCollectionId(null);
    const nextUrl = tab === "home" ? "/" : `/${tab}`;
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({ tab, collectionId: null }, "", nextUrl);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const navigateCollection = (id: string) => {
    setActiveCollectionId(id);
    const nextUrl = `/collection/${encodeURIComponent(id)}`;
    if (window.location.pathname !== nextUrl) {
      window.history.pushState({ tab: activeTab, collectionId: id }, "", nextUrl);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseInitialRoute();
      setActiveTab(parsed.tab);
      setActiveCollectionId(parsed.collectionId);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut for instant search palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app-shell${drawerOpen ? " has-drawer" : ""}`}>
      <Sidebar
        activeTab={activeTab}
        activeCollectionId={activeCollectionId}
        onSelectTab={navigateTab}
        onOpenCollection={navigateCollection}
        onOpenSpotifyImport={() => setSpotifyModalOpen(true)}
      />

      <div className="main-stage">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-mobile-brand"
              onClick={() => navigateTab("home")}
              aria-label="Meld Home"
            >
              <BrandMark size={30} />
              <span className="brand-title" style={{ fontSize: "1.12rem" }}>Meld</span>
            </button>

            <button
              type="button"
              className="search-trigger"
              onClick={() => setCmdSearchOpen(true)}
              aria-label="Search tracks, albums, or paste Spotify link"
            >
              <MagnifyingGlass size={18} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Search songs or playlist URL...
              </span>
              <span className="search-trigger-kbd">Ctrl K</span>
            </button>
          </div>

          <div className="topbar-actions">
            <MiniNowPill />

            <button
              type="button"
              className="icon-btn icon-btn-surface topbar-hide-mobile"
              onClick={() => setSpotifyModalOpen(true)}
              aria-label="Import playlist"
              title="Import Spotify or YTM Playlist"
            >
              <SpotifyLogo size={19} weight="fill" style={{ color: "var(--accent)" }} />
            </button>

            {/* 3-Lines (Hamburger) button replacing sun/palette into Settings */}
            <button
              type="button"
              className={`icon-btn icon-btn-surface${quickSettingsOpen ? " is-active" : ""}`}
              onClick={() => setQuickSettingsOpen(true)}
              aria-label="Buka Pengaturan & Kontrol (≡)"
              title="Pengaturan (≡)"
            >
              <List size={22} weight="bold" />
            </button>

            <button
              type="button"
              className={`icon-btn icon-btn-surface dock-desktop-only${drawerOpen ? " is-active" : ""}`}
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label={drawerOpen ? "Hide studio inspector drawer" : "Show studio inspector drawer"}
              title="Lyrics & Queue Drawer"
            >
              <SidebarSimple size={19} weight={drawerOpen ? "fill" : "regular"} />
            </button>
          </div>
        </header>

        <main id="main-content" className="content-wrap">
          {activeCollectionId ? (
            <CollectionView
              collectionId={activeCollectionId}
              onBack={() => navigateTab(activeTab)}
              onOpenCollection={navigateCollection}
              onAddToPlaylist={setPlaylistModalTrack}
            />
          ) : activeTab === "home" ? (
            <HomeView
              onOpenCollection={navigateCollection}
              onNavigateTab={navigateTab}
              onAddToPlaylist={setPlaylistModalTrack}
            />
          ) : activeTab === "search" ? (
            <SearchView
              initialQuery={searchQuery}
              onOpenCollection={navigateCollection}
              onAddToPlaylist={setPlaylistModalTrack}
              onImportedSpotify={(detail) => navigateCollection(detail.id)}
            />
          ) : activeTab === "explore" ? (
            <ExploreView
              onOpenCollection={navigateCollection}
              onAddToPlaylist={setPlaylistModalTrack}
            />
          ) : activeTab === "settings" ? (
            <SettingsView />
          ) : (
            <LibraryView
              onOpenCollection={navigateCollection}
              onOpenSpotifyImport={() => setSpotifyModalOpen(true)}
              onAddToPlaylist={setPlaylistModalTrack}
            />
          )}

          <footer
            style={{
              marginTop: 12,
              paddingTop: 20,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: "var(--text-caption)",
              color: "var(--ink-muted)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BrandMark size={20} />
              <span>Meld Open Music Web — Client-side audio engine inspired by FrancescoGrazioso/Meld</span>
            </div>
            <span>Crafted by rhmt ofc — Local privacy first</span>
          </footer>
        </main>
      </div>

      {drawerOpen && <StudioDrawer />}

      <PlayerDock />
      <MobileNav
        activeTab={activeTab}
        activeCollectionId={activeCollectionId}
        onSelectTab={navigateTab}
      />

      <NowPlayingOverlay onAddToPlaylist={setPlaylistModalTrack} />

      <SpotifyImportModal
        open={spotifyModalOpen}
        onClose={() => setSpotifyModalOpen(false)}
        onImported={(detail) => navigateCollection(detail.id)}
      />

      <CommandSearchModal
        open={cmdSearchOpen}
        onClose={() => setCmdSearchOpen(false)}
        onGoToFullSearch={(q) => {
          setSearchQuery(q);
          navigateTab("search");
        }}
        onImportedSpotify={(detail) => navigateCollection(detail.id)}
      />

      <AddToPlaylistModal
        track={playlistModalTrack}
        onClose={() => setPlaylistModalTrack(null)}
      />

      <QuickSettingsModal
        open={quickSettingsOpen}
        onClose={() => setQuickSettingsOpen(false)}
        onOpenQueue={() => {
          setDrawerTab("queue");
          setDrawerOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <LibraryProvider>
            <PlayerProvider>
              <MeldWorkspace />
            </PlayerProvider>
          </LibraryProvider>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
