import type { DynamicPalette } from "../types/music";

export const DEFAULT_PALETTE: DynamicPalette = {
  hue: 215,
  chroma: 0.34,
  accentLight: "#264869",
  accentDark: "#8EB8E5",
  accentSoftLight: "rgba(38, 72, 105, 0.11)",
  accentSoftDark: "rgba(142, 184, 229, 0.16)",
  dockBg: "#171B22",
  dockSurface: "#232934",
  ambientLight: "rgba(38, 72, 105, 0.065)",
  ambientDark: "rgba(58, 96, 138, 0.24)",
  swatches: {
    dominant: "#2C394B",
    vibrant: "#365B82",
    light: "#D7E2EE",
    dark: "#171B22",
  },
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hn = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(rgbA: [number, number, number], rgbB: [number, number, number]): number {
  const la = relativeLuminance(...rgbA);
  const lb = relativeLuminance(...rgbB);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// Clamps accent lightness dynamically so text/icons ALWAYS meet WCAG AA >= 4.8:1
function makeContrastSafeColor(
  hue: number,
  sat: number,
  targetBg: [number, number, number],
  direction: "darker" | "lighter",
  minRatio = 4.9,
): [number, number, number] {
  let l = direction === "darker" ? 0.44 : 0.74;
  for (let i = 0; i < 24; i++) {
    const candidate = hslToRgb(hue, sat, l);
    if (contrastRatio(candidate, targetBg) >= minRatio) {
      return candidate;
    }
    l = direction === "darker" ? Math.max(0.14, l - 0.025) : Math.min(0.92, l + 0.02);
  }
  return hslToRgb(hue, sat, direction === "darker" ? 0.22 : 0.84);
}

export function buildPaletteFromHue(hue: number, satRaw: number): DynamicPalette {
  const sat = Math.max(0.18, Math.min(0.68, satRaw));
  const mutedSat = Math.max(0.10, Math.min(0.32, satRaw * 0.55));

  const lightCanvas: [number, number, number] = [246, 244, 239]; // #F6F4EF
  const darkBgRgb = hslToRgb(hue, Math.min(0.24, mutedSat), 0.095);
  const dockBgRgb = hslToRgb(hue, Math.min(0.28, mutedSat * 1.15), 0.115);
  const dockSurfaceRgb = hslToRgb(hue, Math.min(0.24, mutedSat), 0.165);

  const accentLightRgb = makeContrastSafeColor(hue, Math.min(0.62, sat), lightCanvas, "darker", 5.0);
  const accentDarkRgb = makeContrastSafeColor(hue, Math.min(0.68, sat * 0.92), darkBgRgb, "lighter", 5.5);

  const dominantRgb = hslToRgb(hue, mutedSat, 0.26);
  const lightSwatchRgb = hslToRgb(hue, Math.min(0.35, mutedSat), 0.88);

  return {
    hue: Math.round(hue),
    chroma: Number(sat.toFixed(2)),
    accentLight: rgbToHex(...accentLightRgb),
    accentDark: rgbToHex(...accentDarkRgb),
    accentSoftLight: `rgba(${accentLightRgb[0]}, ${accentLightRgb[1]}, ${accentLightRgb[2]}, 0.11)`,
    accentSoftDark: `rgba(${accentDarkRgb[0]}, ${accentDarkRgb[1]}, ${accentDarkRgb[2]}, 0.17)`,
    dockBg: rgbToHex(...dockBgRgb),
    dockSurface: rgbToHex(...dockSurfaceRgb),
    ambientLight: `rgba(${accentLightRgb[0]}, ${accentLightRgb[1]}, ${accentLightRgb[2]}, 0.075)`,
    ambientDark: `rgba(${accentDarkRgb[0]}, ${accentDarkRgb[1]}, ${accentDarkRgb[2]}, 0.22)`,
    swatches: {
      dominant: rgbToHex(...dominantRgb),
      vibrant: rgbToHex(...accentLightRgb),
      light: rgbToHex(...lightSwatchRgb),
      dark: rgbToHex(...dockBgRgb),
    },
  };
}

const paletteCache = new Map<string, DynamicPalette>();

export async function extractPaletteFromArtwork(artworkUrl: string): Promise<DynamicPalette> {
  if (!artworkUrl) return DEFAULT_PALETTE;
  const cached = paletteCache.get(artworkUrl);
  if (cached) return cached;

  try {
    const proxied = artworkUrl.startsWith("http")
      ? `/api/artwork?url=${encodeURIComponent(artworkUrl)}`
      : artworkUrl;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = proxied;
    });

    const size = 40;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return DEFAULT_PALETTE;

    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    // Weighted hue bucket quantization preferring expressive mid-tone cover pixels
    const buckets = new Array(24).fill(0).map(() => ({ weight: 0, hSin: 0, hCos: 0, sSum: 0 }));

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 180) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, g, b);

      // Ignore near-pure black/white noise unless whole sleeve is monochrome
      const lumWeight = 1 - Math.abs(l - 0.48) * 1.4;
      const satWeight = 0.22 + s * 2.4;
      const weight = Math.max(0.05, lumWeight * satWeight);

      const bucketIdx = Math.floor(((h % 360) / 360) * 24) % 24;
      const rad = (h * Math.PI) / 180;
      buckets[bucketIdx].weight += weight;
      buckets[bucketIdx].hSin += Math.sin(rad) * weight;
      buckets[bucketIdx].hCos += Math.cos(rad) * weight;
      buckets[bucketIdx].sSum += s * weight;
    }

    buckets.sort((a, b) => b.weight - a.weight);
    const winner = buckets[0];
    if (!winner || winner.weight <= 0) return DEFAULT_PALETTE;

    const avgHue = ((Math.atan2(winner.hSin, winner.hCos) * 180) / Math.PI + 360) % 360;
    const avgSat = winner.sSum / winner.weight;

    // For monochrome covers like Charcoal (Brambles), keep cool slate tone rather than muddy red hue 0
    const finalHue = avgSat < 0.08 ? 214 : avgHue;
    const finalSat = avgSat < 0.08 ? 0.24 : Math.max(0.32, avgSat);

    const palette = buildPaletteFromHue(finalHue, finalSat);
    paletteCache.set(artworkUrl, palette);
    return palette;
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function applyDynamicPaletteToDocument(palette: DynamicPalette, enabled: boolean): void {
  const root = document.documentElement;
  const p = enabled ? palette : DEFAULT_PALETTE;

  // Derived dark-mode tinted canvas surfaces
  const darkBg = p.dockBg;
  const darkSurface = p.dockSurface;
  const darkRaised = `color-mix(in srgb, ${p.dockSurface} 82%, #FFFFFF 18%)`;

  root.style.setProperty("--dyn-h", String(p.hue));
  root.style.setProperty("--dyn-accent-light", p.accentLight);
  root.style.setProperty("--dyn-accent-dark", p.accentDark);
  root.style.setProperty("--dyn-accent-soft-light", p.accentSoftLight);
  root.style.setProperty("--dyn-accent-soft-dark", p.accentSoftDark);
  root.style.setProperty("--dyn-ambient-light", p.ambientLight);
  root.style.setProperty("--dyn-ambient-dark", p.ambientDark);
  root.style.setProperty("--dyn-dock-bg", p.dockBg);
  root.style.setProperty("--dyn-dock-surface", p.dockSurface);
  root.style.setProperty("--dyn-dark-bg", darkBg);
  root.style.setProperty("--dyn-dark-surface", darkSurface);
  root.style.setProperty("--dyn-dark-raised", darkRaised);
}
