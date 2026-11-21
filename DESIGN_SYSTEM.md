# DESIGN_SYSTEM.md

Official design reference for **Meld Web**. Every future page, view, drawer, modal, and UI update must follow this specification so the interface stays visually coherent and free of generic template drift.

---

## 1. Project overview

- **Website / product name:** Meld — Open Music Player for Web (`meld-web`)
- **Website type:** Client-side music streaming web application & PWA (inspired by `FrancescoGrazioso/Meld`)
- **Surface profile:** **App / Product UI (B3)** + **Mobile Web PWA (B4)**
- **Platform:** Web (Desktop 3-panel Studio Workspace + Mobile thumb-zone PWA down to 375px)
- **Target users:** Listeners who want Spotify-grade playlist discovery and YouTube Music's ad-free catalog inside a calm, editorial, tactile light-first interface
- **Main design goal:** Deliver a crisp warm-paper Light Mode whose ambient atmosphere, interactive acoustic waveform, floating obsidian mini-player dock, and harmonic Dark Mode continuously adapt to the currently playing album or playlist artwork while maintaining strict WCAG AA/AAA legibility.

---

## 2. Brand direction

- **Visual style:** Tactile Studio Paper + Cover-Adaptive Chroma (editorial light-first, soft layered depth, crisp obsidian transport anchors)
- **Mood & tone:** Calm, tactile, acoustic, precise, high-craft studio instrument
- **Design personality:** Warm-tactile Editorial Instrument
- **Design concept (Step 2.7 commitment):** *Acoustic Studio Paper* — a warm-alabaster listening deck whose ambient wash, waveform scrubber amplitudes, and floating obsidian dock continuously drink color from the active album sleeve — expressed through a 3-zone asymmetric studio layout, expressive Bricolage Grotesque + Plus Jakarta Sans + JetBrains Mono typography, live WCAG-clamped Light & Dark chroma palettes, and tactile waveform transport controls.
- **Adversarial-review verdict (Step 4.5):**
  - *Concept test:* Covering the "Meld" brand mark still leaves an unmistakably distinct product — warm studio-paper canvas, acoustic multi-bar waveform scrubber, numbered editorial tracklist, and a cover-tinted floating obsidian mini-player dock rather than a pitch-black neon Spotify clone.
  - *Weakness identified & fixed:* Live third-party YouTube Music shelf titles occasionally include unicode emojis (`Rain + Feels 🌧️🎶`) and low-resolution `w120-h120` thumbnails, which would pollute the editorial aesthetic. Fixed server-side in `api/_lib/ytm.ts` with `stripEmojis()` and `upgradeThumb(..., 544)` plus dynamic contrast clamping in `src/lib/colorExtractor.ts`.
- **Reference style used:**
  1. **User-provided Brambles / Charcoal Music UI Reference** — Adapted the tactile off-white Now Playing deck, crisp rounded cover sleeve with soft shadow, acoustic waveform amplitude scrubber, bold obsidian circular Play control, numbered tracklist (`01`, `02`, `03`...) with active equalizer indicator, and floating dark mini-player dock.
  2. **Apple Music Web & Spatial Light Editorial UI (Dribbble / Mobbin)** — Adapted subtle `6.5%–7.5%` cover-tinted ambient wash over warm off-white surfaces while locking body typography to high-contrast charcoal.
  3. **Roon / Qobuz 3-Panel Audiophile Studio Layout (2025–2026 Music Web UX)** — Adapted the collapsible Left Library Rail, Central Editorial Stage, and Right Contextual Studio Inspector (Synced Lyrics / Queue / Live Palette).
  4. **Linear / Tidal Tactile Control Craft** — Adapted `Ctrl+K` command search, physical `:active` press scale (`0.97`), and `tabular-nums` monospace timers.
- **Voice & UX copy:** Confident, concise, utility-first ("Listen Now", "Open Album", "Import Playlist", "Retry connection"). Zero filler copy, zero invented metrics — Listening Recap starts honestly at `0` and increments from real playback.

---

## 3. Color system

All colors are declared at `:root` in `src/styles/tokens.css` and dynamically updated by `src/lib/colorExtractor.ts` from the active album cover with mathematical WCAG AA clamping.

| Role | Token | Default Light Hex | Default Dark Hex | Usage |
|---|---|---|---|---|
| 60% — Dominant | `--bg` | `#F6F4EF` | `#12151B` (cover-tinted) | Primary canvas background |
| 60% — Dominant wash | `--bg-wash` | `rgba(38, 72, 105, 0.065)` | `rgba(58, 96, 138, 0.24)` | Soft top ambient tint from active sleeve |
| 30% — Secondary | `--surface` | `#FCFBF8` | `#1A1E27` (cover-tinted) | Elevated studio cards, tracklist surface, banner |
| 30% — Raised | `--surface-raised` | `#ECEAE3` | `#242A36` (cover-tinted) | Chips, hover states, secondary controls |
| 30% — Sidebar | `--sidebar-bg` | `#F1EFE9` | `#0F1116` (cover-tinted) | Left navigation rail & right studio drawer |
| 10% — Accent | `--accent` | `#264869` (clamped ≥ 5.0:1) | `#8EB8E5` (clamped ≥ 5.5:1) | Active waveform, active lyric, active tab, heart |
| Primary Anchor | `--control-primary-bg` | `#181A20` | `#F4F3EE` | Primary Play button, active filter pills |
| Floating Dock | `--dock-bg` | `#171B22` (cover-tinted) | `#12151B` (cover-tinted) | Signature floating dark mini-player dock |
| Primary Ink | `--ink` | `#16171B` (16.29:1) | `#F4F3EE` (16.45:1) | Headings, track titles, primary copy |
| Secondary Ink | `--ink-secondary` | `#44464E` (8.56:1) | `#C8CAD3` (10.20:1) | Supporting descriptions, artists |
| Muted Ink | `--ink-muted` | `#5A5C66` (6.05:1) | `#A3A6B2` (6.87:1) | Timestamps, captions, track numbers |

**Usage rules:**
- **Separation:** Background luminance contrast + hue-tinted layered shadows (`--shadow-card`, `--shadow-artwork`, `--shadow-dock`). Hairline borders (`--border-subtle`, `--border-control`) are strictly limited to inputs, structural panel edges, and focus rings — never used as primary card elevation or nested cards.
- **Dark mode:** Derived semantically from the playing cover's dark muted swatch (`--dyn-dark-bg` → `--dyn-dark-surface` → `--dyn-dark-raised`), raising surfaces by increasing lightness, and independently verified across all 12 hue buckets (`0°–330°`) via `scripts/verify-contrast.mjs`.

---

## 4. Typography system

- **Brand personality:** Warm-tactile Editorial Instrument
- **Font family / pairing:**
  - **Display / Headings:** `Bricolage Grotesque` (weights 500, 600, 700)
  - **Body / UI:** `Plus Jakarta Sans` (weights 400, 500, 600, 700)
  - **Technical / Numerals:** `JetBrains Mono` (weights 400, 500, 600) with `font-variant-numeric: tabular-nums`
- **Why these fonts fit:** `Bricolage Grotesque` carries editorial studio warmth and subtle ink-trap character for album titles and synced lyrics; `Plus Jakarta Sans` delivers crisp readability at 16px+ across dense tracklists; `JetBrains Mono` locks timestamps and track indices (`01`, `1:04`) cleanly without jitter.
- **Type scale (`src/styles/tokens.css`):**
  - `--text-display`: `clamp(1.85rem, 1.35rem + 1.8vw, 2.75rem)` (`line-height: 1.08`)
  - `--text-h1`: `clamp(1.5rem, 1.2rem + 1.1vw, 2.125rem)`
  - `--text-h2`: `clamp(1.18rem, 1.06rem + 0.45vw, 1.45rem)`
  - `--text-h3`: `1.0625rem` (17px)
  - `--text-body-lg`: `1.0625rem` (17px)
  - `--text-body`: `1rem` (16px minimum; `line-height: 1.5`)
  - `--text-body-sm`: `0.9375rem` (15px UI labels/rows)
  - `--text-caption`: `0.8125rem` (13px metadata/subtitles)
  - `--text-mono-sm`: `0.78125rem` (12.5px tabular counters)
- **Responsive rules:** Fluid `clamp()` headings with `overflow-wrap: break-word; min-width: 0` so no album or song heading ever clips on 375px–1440px screens.

---

## 5. Layout system

- **Container widths:** `--container-max: 1180px` centered inside the main stage; gutters expand cleanly on ultrawide monitors.
- **Desktop 3-Panel Studio Grid (`> 1180px`):** `256px` Left Sidebar + `minmax(0, 1fr)` Main Stage + `356px` Toggleable Right Studio Drawer.
- **Tablet (`861px–1180px`):** Left Sidebar + Main Stage; Studio Inspector accessible inside full-screen Now Playing.
- **Mobile (`≤ 860px`, verified at `390×844`):** Single-column Main Stage + signature Floating Dark Mini-Player Dock hovering cleanly `10px` above the `64px` 4-item Bottom Navigation Bar (`Home`, `Search`, `Library`, `Import`) with `env(safe-area-inset-bottom)` support.
- **Horizontal card rails (`HorizontalRail.tsx`):** CSS snap carousel (`scroll-snap-type: x mandatory`), `overflow-y: hidden`, native scrollbars hidden cross-browser, `mask-image` edge fade, and `44×44px` accessible Prev/Next buttons.
- **App Flows (B3/B4):**
  - Constant navigation placement across all views.
  - Browser History API deep links (`/`, `/search`, `/library`, `/collection/:id`) preserve Back/Forward predictability.
  - Every data view ships loading skeletons, branded empty states, and recoverable error states with retry.

---

## 6. Component system

- **Component base:** Pure custom React 19 + TypeScript primitives styled strictly with semantic CSS tokens (no un-themed third-party UI kits).
- **Buttons:** `.btn-primary` (obsidian pill), `.btn-accent` (dynamic cover chroma pill), `.btn-secondary` (elevated studio paper pill), `.btn-ghost`, and `44×44px` `.icon-btn` — all sharing hover elevation, `:active` scale (`0.97` / `0.93`), `:focus-visible` ring, and disabled opacity (`0.48`).
- **WaveformScrubber:** ARIA `role="slider"` interactive multi-bar acoustic amplitude scrubber supporting pointer drag, hover timestamp preview, and keyboard arrow/Home/End seeking.
- **TrackRow:** Numbered editorial row (`01`–`99`) with cover play overlay, active row tinting, live animated `EqualizerBars`, Like, Play Next, and Add to Playlist controls.
- **PlayerDock:** Persistent floating dark anchor (`--dock-bg`) with live cover tint, mini waveform scrubber on desktop, compact play control on mobile, and click-to-expand full-screen Now Playing overlay.
- **Modals:** Accessible `role="dialog" aria-modal="true"` sheets with Escape close and backdrop dismiss (`SpotifyImportModal`, `CommandSearchModal`, `AddToPlaylistModal`, `NowPlayingOverlay`).

---

## 7. Card & section style

- **Chosen style:** Soft elevated tactile studio paper (`--surface` over `--bg`) with hue-tinted layered shadows.
- **Radii:** `--radius-xs: 8px`, `--radius-sm: 12px`, `--radius-md: 16px`, `--radius-lg: 22px`, `--radius-xl: 28px`, `--radius-pill: 9999px`.
- **Gradients:** Subtle low-contrast directional atmospheric wash (`radial-gradient` at `6.5%–11%` opacity sourced strictly from the extracted cover hue) — zero purple-to-pink or neon dark-navy blobs.
- **Glassmorphism:** Used sparingly only on sticky topbar and mobile bottom bar (`backdrop-filter: blur(16–18px)`) over high-contrast surfaces.
- **Rule:** Flat elevation hierarchy — never nested card-in-card-in-card.

---

## 8. Icon system

- **Icon library:** `@phosphor-icons/react` (regular, bold, fill, and duotone weights — zero default Lucide, zero mixed icon families, zero system emojis).
- **Sizes:** `16px–20px` inside buttons/rows, `22px–28px` inside hero transport controls and empty-state panels.
- **Usage rules:** Every icon-only button carries an explicit `aria-label`.

---

## 9. Image & asset rules

- **Logo & App Icons:** Bespoke geometric acoustic M-wave monogram (`public/favicon.svg`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`) rendered at crisp 1:1 resolution with PWA `manifest.webmanifest`.
- **Web Banner (Open Graph):** Studio-grade `1200×630` showcase banner (`public/og-banner.png`) reflecting the exact Light Paper + Floating Obsidian Dock + Acoustic Waveform identity.
- **Album Artwork:** High-resolution `544×544` square sleeves fetched live from YouTube Music / Spotify with explicit `width`, `height`, `aspect-ratio: 1/1`, `fetchPriority="high"` for featured/hero covers, `loading="lazy"` for below-fold carousels, and clean fallback icon state on load failure.

---

## 10. Animation & interaction system

- **Animation approach:** Pure CSS physical motion curves (`--ease-out-snappy: cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-press: cubic-bezier(0.2, 0, 0, 1)`), animating only `transform`, `opacity`, and explicit chroma token color transitions. Zero `transition: all`.
- **Interaction states:** Full state set (default, hover, `:focus-visible`, `:active` press micro-scale, disabled) built into every button, card, tab, and control primitive.
- **Async feedback:** Spinners (`CircleNotch`), loading skeletons (`.skeleton-box`), and accessible live-region toasts (`ToastHost`) with icon + message.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` collapses animations/transitions and disables smooth scroll across carousels and lyrics auto-scroll.
- **Performance (Core Web Vitals targeted via nine levers):** Manual vendor/icon code splitting, cached Vercel Edge `/api/*` (`s-maxage=120..3600`), immutable asset cache headers, eager hero LCP artwork + lazy below-fold covers, explicit image dimensions (CLS protection), `display=swap` fonts, and debounced search inputs.

---

## 11. Accessibility rules

- **Computed Contrast Verified (`scripts/verify-contrast.mjs`):**
  - Light primary text: `16.29:1` | secondary: `8.56:1` | muted: `6.05:1` | default accent: `8.63:1`
  - Floating Dark Dock text: `15.85:1` | muted: `9.99:1` | dock accent: `8.33:1`
  - Dark Mode text: `16.45:1` | secondary: `10.20:1` | muted: `6.87:1`
  - All 12 dynamic album hue buckets (`0°–330°`): Light accent `5.03:1–8.73:1`, Dark accent `6.82:1–12.55:1`.
- **Focus:** Instant `2px solid var(--focus-ring)` via `:focus-visible` only.
- **Keyboard & Landmarks:** Skip-to-content link, semantic `<aside>`, `<header>`, `<main>`, `<nav>`, `<footer>`, WAI-ARIA `tablist`/`tab`/`slider`/`dialog`, plus full media keyboard shortcuts (`Space`, `←/→`, `N/P`, `M`, `L`, `Q`, `Ctrl+K`).

---

## 12. Anti-AI-slop rules

Canonical countable gate: `ui-ux-kit/SKILL.md` Pre-flight check + `B3`/`B4` gates + `anti_slop_design.md`.

- **Approved palette:** Warm Alabaster `#F6F4EF`, Studio Paper `#FCFBF8`, Stone Raised `#ECEAE3`, Obsidian Ink `#16171B`, Warm Slate `#44464E` / `#5A5C66`, Cover-Tinted Dark Canvas & Dock `#171B22` (hue-shifted dynamically with WCAG AA clamping).
- **Pure `#000`/`#fff` used?** No — every light and dark surface uses warm or hue-tinted neutrals.
- **Concept-test verdict:** Passed — distinctively *Acoustic Studio Paper* with dynamic cover chroma, waveform scrubbing, and floating obsidian dock.
- **Project-specific notes:** Dynamic album hues may span any hue on the color wheel (including violet or emerald if an album sleeve is violet or emerald); the contrast clamper enforces restrained saturation and WCAG AA luminance so it never degrades into neon AI slop.

---

## 13. Future page instructions

Every future view (e.g., Artist Profile, Podcasts, Equalizer DSP) must reuse the exact tokens in `src/styles/tokens.css`, Phosphor icons, `TrackRow` / `CollectionCard` / `HorizontalRail` / `WaveformScrubber` primitives, and Light Paper + Adaptive Dark chroma behavior documented above.

---

## 14. Update policy

Update this `DESIGN_SYSTEM.md` in the same commit whenever tokens, typography, component primitives, or layout breakpoints change.
