import React, { useRef } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

interface HorizontalRailProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function HorizontalRail({ title, subtitle, children }: HorizontalRailProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  const scrollByCards = (direction: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const distance = Math.max(240, el.clientWidth * 0.72) * direction;
    el.scrollBy({
      left: distance,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  return (
    <section className="section-block" role="region" aria-label={title}>
      <div className="section-head">
        <div style={{ minWidth: 0 }}>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-sub">{subtitle}</p>}
        </div>
        <div className="rail-controls">
          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={() => scrollByCards(-1)}
            aria-label={`Scroll ${title} left`}
          >
            <CaretLeft size={18} weight="bold" />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={() => scrollByCards(1)}
            aria-label={`Scroll ${title} right`}
          >
            <CaretRight size={18} weight="bold" />
          </button>
        </div>
      </div>

      <div className="rail-wrap">
        <div ref={trackRef} className="rail-track" tabIndex={0}>
          {children}
        </div>
      </div>
    </section>
  );
}
