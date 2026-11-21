import React, { useState } from "react";
import { Playlist, Plus, X } from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";

interface AddToPlaylistModalProps {
  track: Track | null;
  onClose: () => void;
}

export function AddToPlaylistModal({ track, onClose }: AddToPlaylistModalProps) {
  const [newName, setNewName] = useState("");
  const { customPlaylists, createPlaylist, addTrackToPlaylist } = useLibrary();
  const { notify } = useToast();

  if (!track) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created = createPlaylist(newName.trim(), track);
    notify(`Created "${created.title}" with "${track.title}"`, "success");
    setNewName("");
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-pl-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ maxWidth: 440 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="add-pl-title" style={{ fontSize: "var(--text-h2)" }}>
            Add to Playlist
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>

        <p style={{ fontSize: "var(--text-body-sm)", color: "var(--ink-secondary)" }}>
          {track.title} — {track.artist}
        </p>

        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            className="field-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New playlist name..."
            aria-label="New playlist name"
          />
          <button type="submit" className="btn btn-primary" disabled={!newName.trim()}>
            <Plus size={17} weight="bold" /> Create
          </button>
        </form>

        {customPlaylists.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>
              Existing playlists
            </span>
            {customPlaylists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                className="nav-btn"
                onClick={() => {
                  const ok = addTrackToPlaylist(pl.id, track);
                  notify(
                    ok ? `Added to "${pl.title}"` : `Already in "${pl.title}"`,
                    ok ? "success" : "info",
                  );
                  onClose();
                }}
              >
                <Playlist size={18} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pl.title}
                </span>
                <span className="nav-btn-meta">{pl.tracks.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
