import React, { useMemo, useRef, useState } from "react";
import {
  ArrowCounterClockwise,
  Database,
  DownloadSimple,
  Gear,
  Globe,
  Headphones,
  Info,
  MagnifyingGlass,
  MicrophoneStage,
  Minus,
  Moon,
  Palette,
  Plus,
  Sun,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import type { CardRadiusPreset, ContentRegion, ThemePreference } from "../types/music";
import { exportLibraryBackupJson } from "../lib/storage";
import { semitonesToRatio } from "../lib/audioDsp";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { AudioEqualizerPanel } from "../components/AudioEqualizerPanel";
import { DeveloperProfileCard } from "../components/DeveloperProfileCard";
import { OfficialNativeAppCard } from "../components/OfficialNativeAppCard";

type SettingsCategory = "all" | "appearance" | "player" | "lyrics" | "content" | "data" | "info";

const REGIONS: { code: ContentRegion; label: string }[] = [
  { code: "ID", label: "Indonesia (ID)" },
  { code: "US", label: "United States (US)" },
  { code: "JP", label: "Japan (JP)" },
  { code: "KR", label: "South Korea (KR)" },
  { code: "GB", label: "United Kingdom (GB)" },
];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIP_DURATIONS = [5, 10, 15, 30];
const TRANSLATE_LANG_OPTIONS = [
  { code: "id", label: "Bahasa Indonesia (ID)" },
  { code: "en", label: "English (EN)" },
  { code: "ms", label: "Bahasa Melayu (MS)" },
  { code: "ja", label: "Japanese (JA)" },
  { code: "ko", label: "Korean (KO)" },
  { code: "ar", label: "Arabic (AR)" },
  { code: "es", label: "Spanish (ES)" },
];

export function SettingsView() {
  const [category, setCategory] = useState<SettingsCategory>("all");
  const [query, setQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { themePref, resolvedTheme, setThemePref, dynamicColor, setDynamicColor } = useTheme();
  const { settings, updateSettings, resetSettings } = useSettings();
  const { clearRecentSearches, clearListeningHistory, importBackupJson } = useLibrary();
  const { notify } = useToast();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (cat: Exclude<SettingsCategory, "all">, text: string) => {
      if (category !== "all" && category !== cat) return false;
      if (!q) return true;
      return text.toLowerCase().includes(q);
    };
  }, [category, query]);

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importBackupJson(String(reader.result || ""));
      if (result.ok) {
        notify("Library backup restored successfully", "success");
      } else {
        notify(result.error || "Invalid backup file", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const statusText = `${resolvedTheme === "dark" ? (settings.pureBlack ? "Pure Black AMOLED" : "Adaptive Dark") : "Warm Studio Paper"} · Region ${settings.region} · ${settings.playbackRate}x speed`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--accent)" }}>
          <Gear size={16} weight="fill" />
          <span>STUDIO PREFERENCES</span>
        </div>
        <h1 style={{ fontSize: "var(--text-h1)" }}>Settings</h1>
        <p style={{ color: "var(--ink-muted)", fontSize: "var(--text-caption)" }}>{statusText}</p>
      </div>

      {/* Search Settings */}
      <div style={{ position: "relative" }}>
        <MagnifyingGlass
          size={18}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-muted)",
            pointerEvents: "none",
          }}
        />
        <input
          type="search"
          className="field-input"
          style={{ paddingLeft: 42, borderRadius: "var(--radius-pill)", minHeight: 46 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings (theme, speed, lyrics, region, backup)..."
          aria-label="Search settings"
        />
      </div>

      {/* Category Filter Pills */}
      <div className="mood-bar" role="tablist" aria-label="Settings categories">
        {(
          [
            { id: "all", label: "Semua" },
            { id: "appearance", label: "Tampilan" },
            { id: "player", label: "Audio & EQ" },
            { id: "lyrics", label: "Lirik & AI" },
            { id: "content", label: "Konten" },
            { id: "data", label: "Data & Backup" },
            { id: "info", label: "Info & Profil" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={category === tab.id}
            className={`mood-chip${category === tab.id ? " is-active" : ""}`}
            onClick={() => setCategory(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* APPEARANCE */}
      {matches("appearance", "theme light dark system pure black amoled dynamic color chroma corner radius") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <Palette size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Appearance</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div>
                <div className="settings-label">Theme Mode</div>
                <div className="settings-desc">Keep Meld Warm Studio Paper or switch to Adaptive Dark</div>
              </div>
              <div className="scope-pill-group">
                {(["light", "dark", "system"] as ThemePreference[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`scope-pill${themePref === mode ? " is-active" : ""}`}
                    onClick={() => setThemePref(mode)}
                  >
                    {mode === "light" && <Sun size={14} weight="fill" />}
                    {mode === "dark" && <Moon size={14} weight="fill" />}
                    <span style={{ textTransform: "capitalize" }}>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Pure Black (AMOLED)</div>
                <div className="settings-desc">True #000000 canvas when Dark mode is active</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.pureBlack}
                className={`toggle-pill${settings.pureBlack ? " is-on" : ""}`}
                onClick={() => updateSettings({ pureBlack: !settings.pureBlack })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Dynamic Cover Chroma</div>
                <div className="settings-desc">Adapt page accent, ambient wash & dock tint to active album cover</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dynamicColor}
                className={`toggle-pill${dynamicColor ? " is-on" : ""}`}
                onClick={() => setDynamicColor(!dynamicColor)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Card Corner Radius</div>
                <div className="settings-desc">Roundness across studio cards and panels</div>
              </div>
              <div className="scope-pill-group">
                {(["sharp", "soft", "round"] as CardRadiusPreset[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`scope-pill${settings.cardRadius === r ? " is-active" : ""}`}
                    onClick={() => updateSettings({ cardRadius: r })}
                    style={{ textTransform: "capitalize" }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PLAYER & AUDIO */}
      {matches("player", "speed playback pitch nada equalizer eq bass dsp skip duration radio keep paused error swipe pip background apk native android resmi download unduh") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <Headphones size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Player, Pitch &amp; Equalizer</h2>
          </div>

          {/* Rekomendasi Resmi Aplikasi Android Native untuk Background Play */}
          <OfficialNativeAppCard variant="card" />

          <div className="settings-card">
            <div className="settings-row">
              <div>
                <div className="settings-label">Kecepatan Pemutaran ({settings.playbackRate.toFixed(2)}x)</div>
                <div className="settings-desc">Atur kecepatan audio dari 0.25x hingga 2.0x</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SPEEDS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    className={`mood-chip${Math.abs(settings.playbackRate - sp) < 0.02 ? " is-active" : ""}`}
                    style={{ minHeight: 34, padding: "0 11px", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                    onClick={() => updateSettings({ playbackRate: sp })}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">
                  Penggeser Nada / Pitch ({settings.pitchSemitones > 0 ? `+${settings.pitchSemitones}` : settings.pitchSemitones} st · {Math.round(semitonesToRatio(settings.pitchSemitones) * 100)}%)
                </div>
                <div className="settings-desc">Geser nada semitone untuk efek Slowed atau Nightcore</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => updateSettings({ pitchSemitones: Math.max(-12, settings.pitchSemitones - 1) })}
                  disabled={settings.pitchSemitones <= -12}
                  aria-label="Turunkan nada 1 semitone"
                >
                  <Minus size={14} weight="bold" />
                </button>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, minWidth: 46, textAlign: "center" }}>
                  {settings.pitchSemitones > 0 ? `+${settings.pitchSemitones}` : settings.pitchSemitones}st
                </span>
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => updateSettings({ pitchSemitones: Math.min(12, settings.pitchSemitones + 1) })}
                  disabled={settings.pitchSemitones >= 12}
                  aria-label="Naikkan nada 1 semitone"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Tautkan Nada ke Tempo (Nightcore / Slowed)</div>
                <div className="settings-desc">Otomatis menyesuaikan tempo streaming saat nada digeser</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.pitchSpeedLinked}
                className={`toggle-pill${settings.pitchSpeedLinked ? " is-on" : ""}`}
                onClick={() => updateSettings({ pitchSpeedLinked: !settings.pitchSpeedLinked })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row" style={{ display: "block" }}>
              <AudioEqualizerPanel />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Quick Seek Step</div>
                <div className="settings-desc">Jump forward/backward duration in Now Playing & keyboard</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {SKIP_DURATIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    className={`mood-chip${settings.skipSeconds === sec ? " is-active" : ""}`}
                    style={{ minHeight: 34, padding: "0 11px", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
                    onClick={() => updateSettings({ skipSeconds: sec })}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Auto-Continue Radio</div>
                <div className="settings-desc">Queue similar tracks automatically when reaching the end</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoContinueRadio}
                className={`toggle-pill${settings.autoContinueRadio ? " is-on" : ""}`}
                onClick={() => updateSettings({ autoContinueRadio: !settings.autoContinueRadio })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Keep Paused on Song Change</div>
                <div className="settings-desc">Cue next track without auto-starting playback</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.keepPausedOnChange}
                className={`toggle-pill${settings.keepPausedOnChange ? " is-on" : ""}`}
                onClick={() => updateSettings({ keepPausedOnChange: !settings.keepPausedOnChange })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Auto-Skip on Unavailable Track</div>
                <div className="settings-desc">Skip automatically if a video fails to load in your region</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.autoSkipOnError}
                className={`toggle-pill${settings.autoSkipOnError ? " is-on" : ""}`}
                onClick={() => updateSettings({ autoSkipOnError: !settings.autoSkipOnError })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Swipe Cover to Change Track</div>
                <div className="settings-desc">Swipe left or right on album art inside Now Playing</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.swipeToChangeTrack}
                className={`toggle-pill${settings.swipeToChangeTrack ? " is-on" : ""}`}
                onClick={() => updateSettings({ swipeToChangeTrack: !settings.swipeToChangeTrack })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* LYRICS */}
      {matches("lyrics", "lyrics font size alignment progressive blur auto scroll offset timing") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <MicrophoneStage size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Lyrics</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div>
                <div className="settings-label">Lyrics Font Size ({settings.lyricsFontSize}px)</div>
                <div className="settings-desc">Adjust reading comfort for synced lines</div>
              </div>
              <input
                type="range"
                min={16}
                max={26}
                value={settings.lyricsFontSize}
                onChange={(e) => updateSettings({ lyricsFontSize: Number(e.target.value) })}
                aria-label="Lyrics font size"
                style={{ width: 140, accentColor: "var(--accent)" }}
              />
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Text Alignment</div>
                <div className="settings-desc">Left studio list or centered karaoke focus</div>
              </div>
              <div className="scope-pill-group">
                {(["left", "center"] as const).map((align) => (
                  <button
                    key={align}
                    type="button"
                    className={`scope-pill${settings.lyricsAlign === align ? " is-active" : ""}`}
                    onClick={() => updateSettings({ lyricsAlign: align })}
                    style={{ textTransform: "capitalize" }}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Progressive Blur</div>
                <div className="settings-desc">Gently blur inactive lines to focus on the current lyric</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.lyricsProgressiveBlur}
                className={`toggle-pill${settings.lyricsProgressiveBlur ? " is-on" : ""}`}
                onClick={() => updateSettings({ lyricsProgressiveBlur: !settings.lyricsProgressiveBlur })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Auto-Scroll Synced Lyrics</div>
                <div className="settings-desc">Keep active lyric line centered during playback</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.lyricsAutoScroll}
                className={`toggle-pill${settings.lyricsAutoScroll ? " is-on" : ""}`}
                onClick={() => updateSettings({ lyricsAutoScroll: !settings.lyricsAutoScroll })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">
                  Global Sync Offset ({settings.lyricsOffsetMs > 0 ? `+${settings.lyricsOffsetMs}` : settings.lyricsOffsetMs}ms)
                </div>
                <div className="settings-desc">Shift lyric timing earlier or later across all tracks</div>
              </div>
              <input
                type="range"
                min={-2000}
                max={2000}
                step={100}
                value={settings.lyricsOffsetMs}
                onChange={(e) => updateSettings({ lyricsOffsetMs: Number(e.target.value) })}
                aria-label="Global lyrics sync offset"
                style={{ width: 140, accentColor: "var(--accent)" }}
              />
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Bahasa Target Terjemahan Lirik AI</div>
                <div className="settings-desc">Bahasa tujuan default saat menekan tombol Terjemahkan di panel lirik</div>
              </div>
              <select
                className="field-input"
                style={{ width: "auto", minHeight: 40, padding: "0 12px" }}
                value={settings.lyricsTranslateLang || "id"}
                onChange={(e) => updateSettings({ lyricsTranslateLang: e.target.value })}
                aria-label="Bahasa terjemahan lirik"
              >
                {TRANSLATE_LANG_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* CONTENT */}
      {matches("content", "region country indonesia us japan korea uk hide video songs") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <Globe size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Content & Catalog</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div>
                <div className="settings-label">YouTube Music Region</div>
                <div className="settings-desc">Controls charts, viral picks, and regional Home discovery</div>
              </div>
              <select
                className="field-input"
                style={{ width: "auto", minHeight: 40, padding: "0 12px" }}
                value={settings.region}
                onChange={(e) => {
                  const region = e.target.value as ContentRegion;
                  updateSettings({ region });
                  notify(`Catalog region set to ${region}`, "success");
                }}
                aria-label="Content region"
              >
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Hide Music Videos from Song Feeds</div>
                <div className="settings-desc">Filter non-album video entries out of Home & Quick Picks</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.hideVideoSongs}
                className={`toggle-pill${settings.hideVideoSongs ? " is-on" : ""}`}
                onClick={() => updateSettings({ hideVideoSongs: !settings.hideVideoSongs })}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* DATA & BACKUP */}
      {matches("data", "backup export import json clear search history reset") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <Database size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Data & Backup</h2>
          </div>

          <div className="settings-card">
            <div className="settings-row">
              <div>
                <div className="settings-label">Backup & Restore Library</div>
                <div className="settings-desc">Export or restore your liked tracks, playlists, and stats as JSON</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 38, padding: "0 14px" }}
                  onClick={() => {
                    exportLibraryBackupJson();
                    notify("Library backup exported as JSON", "success");
                  }}
                >
                  <DownloadSimple size={16} /> Export JSON
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 38, padding: "0 14px" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadSimple size={16} /> Restore JSON
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json"
                  style={{ display: "none" }}
                  onChange={handleImportBackupFile}
                />
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-label">Clear Local Caches & History</div>
                <div className="settings-desc">Remove saved search queries or listening history from this device</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    clearRecentSearches();
                    notify("Recent searches cleared", "info");
                  }}
                >
                  <Trash size={15} /> Clear Searches
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ color: "var(--status-error)" }}
                  onClick={() => {
                    clearListeningHistory();
                    notify("Listening history cleared", "info");
                  }}
                >
                  <Trash size={15} /> Clear History
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    resetSettings();
                    notify("Settings restored to defaults", "info");
                  }}
                >
                  <ArrowCounterClockwise size={15} /> Reset Settings
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* INFO & PROFIL PENGEMBANG (RHMT OFC / Portofolio rhmt.biz.id) */}
      {matches("info", "info profil developer tentang about rohmatulloh rhmt ofc portofolio github telegram instagram tiktok versi") && (
        <section className="settings-section">
          <div className="settings-section-head">
            <Info size={18} weight="fill" style={{ color: "var(--accent)" }} />
            <h2>Info &amp; Profil Pengembang</h2>
          </div>

          <DeveloperProfileCard />
        </section>
      )}
    </div>
  );
}
