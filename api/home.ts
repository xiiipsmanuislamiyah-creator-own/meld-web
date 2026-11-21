import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { CollectionSummary, HomePayload, HomeShelf, Track } from "../src/types/music.js";
import {
  FALLBACK_QUICK_PICKS,
  STUDIO_FEATURED_CHARCOAL,
  extractRuns,
  parseResponsiveTrack,
  parseTwoRowCollection,
  stripEmojis,
  ytmPost,
} from "./_lib/ytm.js";

const MOOD_QUERIES: Record<string, { label: string; songQuery: string; albumQuery: string }> = {
  indonesian: {
    label: "Indonesian Essentials",
    songQuery: "Hindia Tulus NIKI Pamungkas",
    albumQuery: "Indonesian Indie Pop Album",
  },
  lofi: {
    label: "Warm Lo-Fi & Study",
    songQuery: "lofi chill beats study instrumental",
    albumQuery: "lofi chillhop album",
  },
  indie: {
    label: "Indie & Post-Rock",
    songQuery: "Brambles Cigarettes After Sex Men I Trust",
    albumQuery: "Ambient Post Classical Indie Album",
  },
  rnb: {
    label: "Midnight R&B & Soul",
    songQuery: "Frank Ocean Daniel Caesar SZA Keshi",
    albumQuery: "Alternative R&B Soul Album",
  },
  electronic: {
    label: "Electronic & Synth",
    songQuery: "Fred again Four Tet Bonobo ODESZA",
    albumQuery: "Melodic Electronic Album",
  },
  acoustic: {
    label: "Acoustic & Piano",
    songQuery: "Nils Frahm Olafur Arnalds Max Richter",
    albumQuery: "Modern Classical Piano Album",
  },
};

async function searchSongs(query: string, limit = 12): Promise<Track[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await ytmPost("search", {
    query,
    params: "EgWKAQIIAWoMEAMQBBAJEAoQBRAV",
  });
  const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
    ?.sectionListRenderer?.contents || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shelf = tabs.find((t: any) => t.musicShelfRenderer)?.musicShelfRenderer;
  const items = shelf?.contents || [];
  const tracks: Track[] = [];
  for (const entry of items) {
    const parsed = parseResponsiveTrack(entry?.musicResponsiveListItemRenderer);
    if (parsed) tracks.push(parsed);
    if (tracks.length >= limit) break;
  }
  return tracks;
}

async function searchAlbums(query: string, limit = 10): Promise<CollectionSummary[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await ytmPost("search", {
    query,
    params: "EgWKAQIYAWoMEAMQBBAJEAoQBRAV",
  });
  const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
    ?.sectionListRenderer?.contents || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shelf = tabs.find((t: any) => t.musicShelfRenderer)?.musicShelfRenderer;
  const items = shelf?.contents || [];
  const collections: CollectionSummary[] = [];
  for (const entry of items) {
    const item = entry?.musicResponsiveListItemRenderer;
    const browseId = item?.navigationEndpoint?.browseEndpoint?.browseId;
    if (!browseId) continue;
    const col0 = extractRuns(item?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
    const col1 = extractRuns(item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text)
      .map((s) => s.trim())
      .filter((s) => s && s !== "•" && s !== "·");
    const thumbs = item?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    const rawThumb = Array.isArray(thumbs) && thumbs.length ? thumbs[thumbs.length - 1]?.url : "";
    const artwork = rawThumb.includes("googleusercontent.com")
      ? rawThumb.replace(/=w\d+-h\d+[^&]*/i, "=w544-h544-l90-rj")
      : rawThumb;
    collections.push({
      id: browseId,
      title: stripEmojis(col0.join("") || "Album"),
      subtitle: stripEmojis(
        col1.filter((s) => !/^(album|single|ep)$/i.test(s)).join(" — ") || "Album",
      ),
      type: "album",
      artwork,
      source: "ytm",
    });
    if (collections.length >= limit) break;
  }
  return collections;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
  const mood = String(req.query.mood || "all").toLowerCase();

  try {
    if (mood !== "all" && MOOD_QUERIES[mood]) {
      const cfg = MOOD_QUERIES[mood];
      const [tracks, albums] = await Promise.all([
        searchSongs(cfg.songQuery, 12),
        searchAlbums(cfg.albumQuery, 10),
      ]);
      const featuredAlbum = albums[0];
      const payload: HomePayload = {
        featured: featuredAlbum
          ? {
              ...featuredAlbum,
              artist: featuredAlbum.subtitle,
              tagline: `Curated live from YouTube Music for ${cfg.label}. Every artwork dynamically re-tints the listening deck.`,
              sampleTrackId: tracks[0]?.videoId,
            }
          : STUDIO_FEATURED_CHARCOAL,
        quickPicks: tracks.length ? tracks.slice(0, 8) : FALLBACK_QUICK_PICKS,
        shelves: [
          {
            id: `mood-albums-${mood}`,
            title: `${cfg.label} Albums`,
            kind: "collections",
            collections: albums,
          },
          {
            id: `mood-tracks-${mood}`,
            title: `Essential ${cfg.label} Tracks`,
            kind: "tracks",
            tracks,
          },
        ],
        mood,
        generatedAt: Date.now(),
      };
      return res.status(200).json(payload);
    }

    const [homeRes, exploreRes, chartsRes, editorialSongs] = await Promise.allSettled([
      ytmPost("browse", { browseId: "FEmusic_home" }),
      ytmPost("browse", { browseId: "FEmusic_explore" }),
      ytmPost("browse", { browseId: "FEmusic_charts" }),
      searchSongs("NIKI Lowkey Hindia Evaluasi Tulus Hati-Hati di Jalan", 6),
    ]);

    const quickPicks: Track[] = [];
    const shelves: HomeShelf[] = [];
    const seenCollectionIds = new Set<string>();

    // Helper to extract carousel shelves cleanly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseBrowseShelves = (raw: any, prefix: string) => {
      const sections =
        raw?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
          ?.sectionListRenderer?.contents || [];
      for (let i = 0; i < sections.length; i++) {
        const carousel = sections[i]?.musicCarouselShelfRenderer;
        if (!carousel) continue;
        const rawTitle = extractRuns(
          carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title,
        ).join("");
        const title = stripEmojis(rawTitle);
        if (!title || /videos/i.test(title) || /podcasts/i.test(title)) continue;

        const tracks: Track[] = [];
        const collections: CollectionSummary[] = [];

        for (const item of carousel.contents || []) {
          if (item.musicResponsiveListItemRenderer) {
            const tr = parseResponsiveTrack(item.musicResponsiveListItemRenderer);
            if (tr) tracks.push(tr);
          } else if (item.musicTwoRowItemRenderer) {
            const col = parseTwoRowCollection(item.musicTwoRowItemRenderer);
            if (col && !seenCollectionIds.has(col.id)) {
              seenCollectionIds.add(col.id);
              collections.push(col);
            }
          }
        }

        if (tracks.length >= 4 && quickPicks.length < 8) {
          for (const t of tracks) {
            if (quickPicks.length < 8 && !quickPicks.some((q) => q.id === t.id)) {
              quickPicks.push(t);
            }
          }
        } else if (collections.length >= 3) {
          shelves.push({
            id: `${prefix}-${i}`,
            title,
            kind: "collections",
            collections: collections.slice(0, 12),
          });
        } else if (tracks.length >= 4) {
          shelves.push({
            id: `${prefix}-${i}`,
            title,
            kind: "tracks",
            tracks: tracks.slice(0, 10),
          });
        }
      }
    };

    if (exploreRes.status === "fulfilled") {
      parseBrowseShelves(exploreRes.value, "explore");
    }
    if (homeRes.status === "fulfilled") {
      parseBrowseShelves(homeRes.value, "home");
    }
    if (chartsRes.status === "fulfilled") {
      parseBrowseShelves(chartsRes.value, "charts");
    }

    // Put verified Unsayable — Brambles (from featured Charcoal album) first, followed by live picks
    const curatedTracks =
      editorialSongs.status === "fulfilled" && editorialSongs.value.length > 0
        ? [FALLBACK_QUICK_PICKS[0], ...editorialSongs.value]
        : FALLBACK_QUICK_PICKS;

    const mergedQuickPicks: Track[] = [FALLBACK_QUICK_PICKS[0]];
    for (const candidate of [...curatedTracks, ...quickPicks]) {
      if (mergedQuickPicks.length >= 8) break;
      if (!mergedQuickPicks.some((t) => t.id === candidate.id)) {
        mergedQuickPicks.push(candidate);
      }
    }
    const finalQuickPicks = mergedQuickPicks;

    // Prepend signature studio album picks if needed
    const studioSpotlights: CollectionSummary[] = [
      STUDIO_FEATURED_CHARCOAL,
      {
        id: "VLPL4fGSI1pDJn4lW6MJA2q37CfnraqAizqE",
        title: "Indonesia Top Songs",
        subtitle: "Live Regional Chart — YouTube Music",
        type: "chart",
        artwork: finalQuickPicks[1]?.artwork || STUDIO_FEATURED_CHARCOAL.artwork,
        source: "ytm",
      },
      {
        id: "VLPL4fGSI1pDJn5QPpj0R4vVgRWk8sSq549G",
        title: "Global Top 100",
        subtitle: "Live Global Chart — YouTube Music",
        type: "chart",
        artwork: finalQuickPicks[2]?.artwork || STUDIO_FEATURED_CHARCOAL.artwork,
        source: "ytm",
      },
    ];

    if (shelves.length > 0 && shelves[0].kind === "collections" && shelves[0].collections) {
      shelves[0].collections = [
        ...studioSpotlights.filter((s) => !shelves[0].collections?.some((c) => c.id === s.id)),
        ...shelves[0].collections,
      ].slice(0, 12);
    } else {
      shelves.unshift({
        id: "studio-charts",
        title: "Charts & Studio Picks",
        kind: "collections",
        collections: studioSpotlights,
      });
    }

    const payload: HomePayload = {
      featured: STUDIO_FEATURED_CHARCOAL,
      quickPicks: finalQuickPicks,
      shelves: shelves.slice(0, 5),
      mood: "all",
      generatedAt: Date.now(),
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error("[api/home]", err);
    return res.status(200).json({
      featured: STUDIO_FEATURED_CHARCOAL,
      quickPicks: FALLBACK_QUICK_PICKS,
      shelves: [
        {
          id: "fallback-studio",
          title: "Featured Studio Album",
          kind: "collections",
          collections: [STUDIO_FEATURED_CHARCOAL],
        },
      ],
      mood,
      generatedAt: Date.now(),
    } satisfies HomePayload);
  }
}
