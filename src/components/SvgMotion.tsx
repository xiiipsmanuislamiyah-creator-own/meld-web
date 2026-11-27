import React, { useEffect, useRef } from "react";
import { SVG } from "@svgdotjs/svg.js";

export type SvgMotionPreset = "float" | "pulse" | "spin" | "wave" | "spark";

interface SvgIconMotionProps {
  preset?: SvgMotionPreset;
  duration?: number;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps any SVG icon (e.g. @phosphor-icons/react) and animates it via @svgdotjs/svg.js.
 */
export function SvgIconMotion({
  preset = "float",
  duration = 2400,
  className = "",
  children,
}: SvgIconMotionProps) {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const svgEl = host.querySelector("svg");
    if (!svgEl) return;

    // Respect user reduced-motion preference
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const draw = SVG(svgEl);
    let runner: ReturnType<typeof draw.animate> | null = null;

    try {
      if (preset === "spin") {
        runner = draw
          .animate(duration * 2.5, 0, "now")
          .ease("-")
          .rotate(360)
          .loop(Infinity, false);
      } else if (preset === "pulse") {
        runner = draw
          .animate(duration, 0, "now")
          .ease("<>")
          .transform({ scale: 1.12 })
          .loop(Infinity, true);
      } else if (preset === "spark") {
        runner = draw
          .animate(duration * 0.85, 0, "now")
          .ease("<>")
          .transform({ scale: 1.15, rotate: 8 })
          .loop(Infinity, true);
      } else if (preset === "wave") {
        runner = draw
          .animate(duration * 0.9, 0, "now")
          .ease("<>")
          .transform({ translateY: -2, scaleY: 1.08 })
          .loop(Infinity, true);
      } else {
        // float
        runner = draw
          .animate(duration, 0, "now")
          .ease("<>")
          .transform({ translateY: -2.5 })
          .loop(Infinity, true);
      }
    } catch {
      // Fallback safely if SVG element cannot be animated
    }

    return () => {
      try {
        runner?.unschedule();
        draw.timeline().stop();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [preset, duration]);

  return (
    <span
      ref={hostRef}
      className={`svg-motion-wrap ${className}`.trim()}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
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
 * Animated geometric SVG wave motif powered by @svgdotjs/svg.js.
 */
export function AnimatedVibeWave({ accent, className = "vibe-wave" }: AnimatedVibeWaveProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const draw = SVG(svgEl);
    const paths = draw.find("path");
    const runners: Array<ReturnType<typeof draw.animate>> = [];

    try {
      const p1 = paths[0];
      const p2 = paths[1];
      if (p1) {
        runners.push(
          p1
            .animate(3200, 0, "now")
            .ease("<>")
            .attr({ d: "M0 14 Q 22 24, 45 12 T 90 18 T 135 10 T 180 16" })
            .loop(Infinity, true),
        );
      }
      if (p2) {
        runners.push(
          p2
            .animate(3800, 200, "now")
            .ease("<>")
            .attr({ d: "M0 20 Q 25 26, 50 16 T 100 22 T 150 14 T 180 20" })
            .loop(Infinity, true),
        );
      }
    } catch {
      // Ignore animation errors
    }

    return () => {
      runners.forEach((r) => {
        try {
          r.unschedule();
        } catch {
          // Ignore
        }
      });
      try {
        draw.timeline().stop();
      } catch {
        // Ignore
      }
    };
  }, [accent]);

  return (
    <svg ref={svgRef} viewBox="0 0 180 28" className={className} aria-hidden="true">
      <path
        d="M0 18 Q 22 4, 45 16 T 90 14 T 135 16 T 180 10"
        fill="none"
        stroke={accent}
        strokeOpacity="0.34"
        strokeWidth="2"
      />
      <path
        d="M0 24 Q 25 10, 50 22 T 100 18 T 150 22 T 180 16"
        fill="none"
        stroke={accent}
        strokeOpacity="0.18"
        strokeWidth="1.5"
      />
    </svg>
  );
}
