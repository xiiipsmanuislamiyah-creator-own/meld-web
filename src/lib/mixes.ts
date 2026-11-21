import type { ListeningStatEntry, Track } from "../types/music";

export interface AutoMix {
  id: "top-mix" | "on-repeat" | "rediscover";
  title: string;
  subtitle: string;
  tracks: Track[];
  accentTint: string;
}

export interface ArtistCollageCard {
  id: string;
  artistName: string;
  subtitle: string;
  lead: Track;
  thumbs: string[];
  queue: Track[];
  paletteTint: string;
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const t of tracks) {
    const key = t.videoId || t.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export function buildAutoMixes(
  recentTracks: Track[],
  likedTracks: Track[],
  stats: Record<string, ListeningStatEntry>,
): AutoMix[] {
  const pool = dedupeTracks([...likedTracks, ...recentTracks]);
  if (pool.length === 0) return [];

  const trackById = new Map<string, Track>();
  for (const t of pool) {
    trackById.set(t.id, t);
    if (t.videoId) trackById.set(t.videoId, t);
  }

  const statEntries = Object.values(stats).sort((a, b) => b.playCount - a.playCount);
  const topFromStats = statEntries
    .map((s) => trackById.get(s.trackId))
    .filter((t): t is Track => Boolean(t));

  const myTopTracks = dedupeTracks([...topFromStats, ...likedTracks, ...recentTracks]).slice(0, 20);
  const onRepeatTracks = dedupeTracks(
    statEntries
      .filter((s) => s.playCount >= 2)
      .map((s) => trackById.get(s.trackId))
      .filter((t): t is Track => Boolean(t)),
  ).slice(0, 16);

  const recentSet = new Set(recentTracks.slice(0, 6).map((t) => t.id));
  const rediscoverTracks = dedupeTracks([
    ...likedTracks.filter((t) => !recentSet.has(t.id)),
    ...recentTracks.slice(6),
  ]).slice(0, 16);

  const mixes: AutoMix[] = [];
  if (myTopTracks.length > 0) {
    mixes.push({
      id: "top-mix",
      title: "My Top Mix",
      subtitle: `${myTopTracks.length} signature picks`,
      tracks: myTopTracks,
      accentTint: "rgba(38, 72, 105, 0.14)",
    });
  }
  if (onRepeatTracks.length > 0) {
    mixes.push({
      id: "on-repeat",
      title: "On Repeat",
      subtitle: `${onRepeatTracks.length} heavy rotation tracks`,
      tracks: onRepeatTracks,
      accentTint: "rgba(136, 58, 74, 0.14)",
    });
  }
  if (rediscoverTracks.length > 0) {
    mixes.push({
      id: "rediscover",
      title: "Rediscover",
      subtitle: `${rediscoverTracks.length} forgotten favorites`,
      tracks: rediscoverTracks,
      accentTint: "rgba(27, 107, 70, 0.14)",
    });
  }
  return mixes;
}

const COLLAGE_TINTS = [
  "linear-gradient(155deg, rgba(164, 72, 42, 0.16) 0%, rgba(164, 72, 42, 0.04) 100%)",
  "linear-gradient(155deg, rgba(58, 96, 138, 0.17) 0%, rgba(58, 96, 138, 0.04) 100%)",
  "linear-gradient(155deg, rgba(27, 107, 70, 0.16) 0%, rgba(27, 107, 70, 0.04) 100%)",
  "linear-gradient(155deg, rgba(132, 54, 88, 0.16) 0%, rgba(132, 54, 88, 0.04) 100%)",
  "linear-gradient(155deg, rgba(128, 90, 32, 0.16) 0%, rgba(128, 90, 32, 0.04) 100%)",
];

export function buildArtistCollages(tracks: Track[]): ArtistCollageCard[] {
  const unique = dedupeTracks(tracks);
  if (unique.length === 0) return [];

  const seenArtists = new Set<string>();
  const leads: Track[] = [];
  for (const t of unique) {
    const primary = (t.artist || "Meld").split(/[,&]|feat\.|ft\./i)[0].trim();
    const key = primary.toLowerCase();
    if (!key || seenArtists.has(key)) continue;
    seenArtists.add(key);
    leads.push(t);
    if (leads.length >= 6) break;
  }

  return leads.map((lead, idx) => {
    const artistName = (lead.artist || "Meld").split(/[,&]|feat\.|ft\./i)[0].trim();
    const others = unique.filter((t) => t.id !== lead.id);
    const second = others[(idx * 2) % Math.max(1, others.length)] || lead;
    const third = others[(idx * 2 + 1) % Math.max(1, others.length)] || lead;
    return {
      id: `collage-${lead.id}-${idx}`,
      artistName,
      subtitle: `Featuring ${artistName} & similar sounds`,
      lead,
      thumbs: [lead.artwork, second.artwork, third.artwork].filter(Boolean),
      queue: [lead, ...others.slice(0, 12)],
      paletteTint: COLLAGE_TINTS[idx % COLLAGE_TINTS.length],
    };
  });
}

export function buildSpeedDial(
  recentTracks: Track[],
  likedTracks: Track[],
  quickPicks: Track[],
  hideVideos: boolean,
): Track[] {
  const combined = dedupeTracks([...recentTracks, ...likedTracks, ...quickPicks]);
  const filtered = hideVideos ? combined.filter((t) => !t.isVideo) : combined;
  return filtered.slice(0, 8);
}

export function buildForgottenFavorites(
  recentTracks: Track[],
  likedTracks: Track[],
  stats: Record<string, ListeningStatEntry>,
): Track[] {
  const recentIds = new Set(recentTracks.slice(0, 8).map((t) => t.id));
  const pool = dedupeTracks([...likedTracks, ...recentTracks.slice(8)]);
  return pool
    .filter((t) => !recentIds.has(t.id))
    .sort((a, b) => (stats[b.id]?.playCount || 0) - (stats[a.id]?.playCount || 0))
    .slice(0, 6);
}

export function computeListenerPersona(
  totalPlays: number,
  totalMinutes: number,
  hourlyStats: number[],
): { label: string; detail: string } {
  if (totalPlays === 0) {
    return {
      label: "First Session Ready",
      detail: "Play any track to start building your local listening profile.",
    };
  }
  const peakHour = hourlyStats.reduce(
    (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
    0,
  );
  if (peakHour >= 22 || peakHour < 5) {
    return {
      label: "Midnight Listener",
      detail: `Most active around ${String(peakHour).padStart(2, "0")}:00 with ${totalMinutes}m logged.`,
    };
  }
  if (peakHour >= 5 && peakHour < 12) {
    return {
      label: "Morning Selector",
      detail: `Starts the day with music around ${String(peakHour).padStart(2, "0")}:00.`,
    };
  }
  if (totalPlays >= 30) {
    return {
      label: "Deep Rotation Curator",
      detail: `${totalPlays} plays across your personal studio library.`,
    };
  }
  return {
    label: "Afternoon Acoustic",
    detail: `${totalPlays} plays and ${totalMinutes} minutes logged privately on device.`,
  };
}
