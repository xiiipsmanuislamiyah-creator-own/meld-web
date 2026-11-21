import React, { useEffect, useState } from "react";
import { CircleNotch, LinkSimple, SpotifyLogo, X } from "@phosphor-icons/react";
import type { CollectionDetail } from "../types/music";
import { importSpotifyCollection } from "../lib/api";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";

interface SpotifyImportModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (detail: CollectionDetail) => void;
}

const SAMPLE_LINKS = [
  {
    label: "Today's Top Hits (Spotify)",
    url: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  },
  {
    label: "Chill Hits (Spotify)",
    url: "https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6",
  },
  {
    label: "Indonesia Top Songs (YTM)",
    url: "VLPL4fGSI1pDJn4lW6MJA2q37CfnraqAizqE",
  },
];

export function SpotifyImportModal({ open, onClose, onImported }: SpotifyImportModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { saveImportedOrCustomPlaylist, importYtmPlaylist } = useLibrary();
  const { settings } = useSettings();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const isSpotifyInput = (val: string) =>
    /open\.spotify\.com\/|^spotify:/i.test(val.trim());

  const runImport = async (targetUrl: string) => {
    const clean = targetUrl.trim();
    if (!clean) {
      setError("Paste a public Spotify or YouTube Music playlist URL or ID first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let detail: CollectionDetail;
      if (isSpotifyInput(clean)) {
        detail = await importSpotifyCollection(clean);
        saveImportedOrCustomPlaylist(detail);
      } else {
        detail = await importYtmPlaylist(clean, settings.region);
      }
      notify(`Imported "${detail.title}" (${detail.tracks.length} tracks)`, "success");
      setUrl("");
      onImported(detail);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not read that playlist link. Confirm it is public.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runImport(url);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotify-import-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="modal-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isSpotifyInput(url) || !url ? (
              <SpotifyLogo size={26} weight="fill" style={{ color: "var(--accent)" }} />
            ) : (
              <LinkSimple size={24} weight="bold" style={{ color: "var(--accent)" }} />
            )}
            <h2 id="spotify-import-title" style={{ fontSize: "var(--text-h2)" }}>
              Import Playlist
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close playlist import modal"
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)" }}>
          Paste any public Spotify URL (playlist, album, or track) or YouTube Music playlist URL/ID. Meld extracts metadata and streams ad-free locally.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field-group">
            <label htmlFor="spotify-url-input" className="field-label">
              Spotify or YouTube Music URL / Playlist ID
            </label>
            <input
              id="spotify-url-input"
              type="text"
              className="field-input"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              placeholder="https://open.spotify.com/playlist/... or https://music.youtube.com/playlist?list=..."
              aria-describedby="spotify-url-help"
              aria-invalid={Boolean(error)}
              disabled={loading}
              autoFocus
            />
            <span id="spotify-url-help" className="field-help">
              Saved privately inside your local device library.
            </span>
            {error && (
              <span role="alert" className="field-error">
                {error}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>
              Or try a live public collection
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SAMPLE_LINKS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 38, padding: "0 14px", fontSize: "0.82rem" }}
                  disabled={loading}
                  onClick={() => {
                    setUrl(sample.url);
                    void runImport(sample.url);
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <CircleNotch size={17} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
                  Importing tracks...
                </>
              ) : (
                "Import Playlist"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
