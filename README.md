# Meld Web — Open Music Player

Cover-adaptive, light-first web music streaming client inspired by [FrancescoGrazioso/Meld](https://github.com/FrancescoGrazioso/Meld).

## Architecture (Zero-VPS Client-Side Streaming — Opsi 1)
- **Audio Playback:** Direct client-to-Google-CDN playback via YouTube IFrame Audio Engine (zero VPS bandwidth, zero server transcoding).
- **Catalog & Discovery:** Live YouTube Music InnerTube serverless endpoints (`/api/home`, `/api/search`, `/api/browse`, `/api/upnext`).
- **Spotify Bridge:** Public Spotify playlist, album, and track importer (`/api/spotify-import`) with automatic YouTube Music matching.
- **Synced Lyrics:** Live timestamped LRC lyrics via LRCLIB (`/api/lyrics`) with tap-to-seek and 1-tap copy.
- **Chroma-Adaptive Theming:** Real-time Canvas cover-art color extraction via CORS-safe `/api/artwork` proxy with automatic WCAG AA contrast clamping across Light Paper and Adaptive Dark modes.
- **Local Privacy Library:** Liked songs, saved albums, custom & Spotify-imported playlists, listening history, real Recap stats, and M3U/CSV export persisted locally in the browser.

## Development
```bash
npm install
npm run dev
npm run build
```

## Design Reference
All color tokens, typography rules, layout invariants, and anti-slop gates are documented in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
