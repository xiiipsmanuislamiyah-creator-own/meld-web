// Deterministic acoustic waveform peak generator seeded by track id
// Produces organic musical phrase envelopes (intro -> build -> chorus -> bridge -> outro)
export function generateTrackWaveform(seed: string, barCount = 56): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 1000) / 1000;
  };

  const peaks: number[] = [];
  for (let i = 0; i < barCount; i++) {
    const t = i / (barCount - 1);
    // Natural song dynamics envelope
    const introFade = Math.min(1, t * 7 + 0.18);
    const outroFade = Math.min(1, (1 - t) * 7 + 0.22);
    const chorusWave =
      0.55 +
      0.26 * Math.sin(t * Math.PI * 3.1 - 0.5) +
      0.16 * Math.cos(t * Math.PI * 7.4);
    const transient = 0.42 + nextRand() * 0.58;
    const height = Math.max(0.14, Math.min(1, introFade * outroFade * chorusWave * transient));
    peaks.push(Number(height.toFixed(3)));
  }

  return peaks;
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
