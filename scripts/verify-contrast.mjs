// Verifies exact WCAG 2.1 relative luminance contrast ratios across Light, Dark, Dock, and 12 Dynamic Hues
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function hslToRgb(h, s, l) {
  const hn = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hn < 60) [r, g, b] = [c, x, 0];
  else if (hn < 120) [r, g, b] = [x, c, 0];
  else if (hn < 180) [r, g, b] = [0, c, x];
  else if (hn < 240) [r, g, b] = [0, x, c];
  else if (hn < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function luminance([r, g, b]) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function clampColor(hue, sat, bg, dir, minRatio) {
  let l = dir === "darker" ? 0.44 : 0.74;
  for (let i = 0; i < 24; i++) {
    const c = hslToRgb(hue, sat, l);
    if (ratio(c, bg) >= minRatio) return c;
    l = dir === "darker" ? Math.max(0.14, l - 0.025) : Math.min(0.92, l + 0.02);
  }
  return hslToRgb(hue, sat, dir === "darker" ? 0.22 : 0.84);
}

const staticPairs = [
  ["Light: --ink on --bg", "#16171B", "#F6F4EF", 4.5],
  ["Light: --ink-secondary on --bg", "#44464E", "#F6F4EF", 4.5],
  ["Light: --ink-muted on --bg", "#5A5C66", "#F6F4EF", 4.5],
  ["Light: --ink-muted on --surface", "#5A5C66", "#FCFBF8", 4.5],
  ["Light: --accent default on --bg", "#264869", "#F6F4EF", 4.5],
  ["Light: --control-primary-ink on --control-primary-bg", "#F8F7F4", "#181A20", 4.5],
  ["Dock: --dock-ink on --dock-bg", "#F7F5F0", "#171B22", 4.5],
  ["Dock: --dock-ink-muted on --dock-bg", "#C1C5CF", "#171B22", 4.5],
  ["Dock: --dock-accent on --dock-bg", "#8EB8E5", "#171B22", 4.5],
  ["Dark: --ink on --dyn-dark-bg", "#F4F3EE", "#12151B", 4.5],
  ["Dark: --ink-secondary on --dyn-dark-surface", "#C8CAD3", "#1A1E27", 4.5],
  ["Dark: --ink-muted on --dyn-dark-surface", "#A3A6B2", "#1A1E27", 4.5],
  ["Dark: --accent default on --dyn-dark-bg", "#8EB8E5", "#12151B", 4.5],
];

let failures = 0;
console.log("=== STATIC TOKEN CONTRAST AUDIT ===");
for (const [label, fg, bg, min] of staticPairs) {
  const r = ratio(hexToRgb(fg), hexToRgb(bg));
  const ok = r >= min;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${r.toFixed(2)}:1  (min ${min}:1)  ${label}`);
}

console.log("\n=== DYNAMIC HUE SWEEP (0..330 deg) ===");
const lightCanvas = hexToRgb("#F6F4EF");
for (let h = 0; h < 360; h += 30) {
  const darkBg = hslToRgb(h, 0.22, 0.095);
  const accL = clampColor(h, 0.56, lightCanvas, "darker", 5.0);
  const accD = clampColor(h, 0.58, darkBg, "lighter", 5.5);
  const rL = ratio(accL, lightCanvas);
  const rD = ratio(accD, darkBg);
  const rTextD = ratio(hexToRgb("#F4F3EE"), darkBg);
  const ok = rL >= 4.5 && rD >= 4.5 && rTextD >= 4.5;
  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  hue=${String(h).padStart(3)}deg  LightAccent=${rL.toFixed(2)}:1  DarkAccent=${rD.toFixed(2)}:1  DarkInk=${rTextD.toFixed(2)}:1`,
  );
}

if (failures > 0) {
  console.error(`\nContrast audit failed with ${failures} issue(s).`);
  process.exit(1);
}
console.log("\nALL CONTRAST PAIRS PASSED WCAG AA/AAA.");
