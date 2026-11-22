import React, { useEffect, useState } from "react";
import { MusicNotes } from "@phosphor-icons/react";

interface ArtworkProps {
  src?: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  size?: number;
}

export function Artwork({
  src,
  alt,
  className = "",
  style,
  priority = false,
  size = 300,
}: ArtworkProps) {
  const [failed, setFailed] = useState(false);

  // Reset error state whenever artwork source URL changes (fixes stale broken cover bug)
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-raised)",
          color: "var(--ink-muted)",
          width: "100%",
          height: "100%",
          ...style,
        }}
        role="img"
        aria-label={alt}
      >
        <MusicNotes size={Math.max(20, Math.round(size * 0.24))} weight="duotone" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
