import React from "react";

export type SvgMotionPreset = "float" | "pulse" | "spin" | "wave" | "spark";

interface SvgIconMotionProps {
  preset?: SvgMotionPreset;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps any SVG icon (e.g. Phosphor Icons) with high-craft, hardware-accelerated 60fps CSS micro-animations.
 * Respects prefers-reduced-motion and avoids brittle runtime DOM manipulation.
 */
export function SvgIconMotion({
  preset = "float",
  duration,
  className = "",
  children,
}: SvgIconMotionProps) {
  const presetClass = `svg-motion-${preset}`;
  const style = duration ? { animationDuration: `${duration}ms` } : undefined;

  return (
    <span
      className={`svg-motion-wrap ${presetClass} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

interface AnimatedVibeWaveProps {
  accent: string;
  className?: string;
}

/**
 * Lively geometric SVG wave motif with flowing dual-path harmonics and soft ambient glow.
 * Pure GPU-accelerated SVG & CSS for zero jitter and 60fps responsiveness on all mobile viewports.
 */
export function AnimatedVibeWave({ accent, className = "vibe-wave" }: AnimatedVibeWaveProps) {
  // Use unique IDs for SVG gradients based on accent color hex
  const cleanId = accent.replace(/[^a-zA-Z0-9]/g, "");
  const gradId = `vibe-grad-${cleanId}`;

  return (
    <div className={className} aria-hidden="true">
      <svg
        viewBox="0 0 320 44"
        preserveAspectRatio="none"
        className="vibe-wave-svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.12" />
            <stop offset="50%" stopColor={accent} stopOpacity="0.45" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Ambient bottom frequency wash */}
        <path
          className="vibe-wave-wash"
          d="M0 26 Q 40 16, 80 24 T 160 20 T 240 26 T 320 22 L 320 44 L 0 44 Z"
          fill={accent}
          fillOpacity="0.08"
        />

        {/* Secondary Harmonic Wave */}
        <path
          className="vibe-wave-path-secondary"
          d="M -30 26 Q 25 14, 75 25 T 165 18 T 245 27 T 350 20"
          fill="none"
          stroke={accent}
          strokeOpacity="0.45"
          strokeWidth="2.2"
          strokeLinecap="round"
        />

        {/* Primary Glowing Wave */}
        <path
          className="vibe-wave-path-primary"
          d="M -20 20 Q 35 6, 85 20 T 175 14 T 265 22 T 340 12"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
