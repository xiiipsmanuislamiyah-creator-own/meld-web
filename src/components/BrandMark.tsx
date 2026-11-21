export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="24" y="24" width="464" height="464" rx="116" fill="var(--dock-bg)" />
      <rect
        x="28"
        y="28"
        width="456"
        height="456"
        rx="112"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="6"
      />
      <rect x="116" y="192" width="38" height="152" rx="19" fill="var(--dock-ink)" />
      <rect x="176" y="138" width="38" height="236" rx="19" fill="var(--dock-ink)" />
      <rect x="237" y="178" width="38" height="176" rx="19" fill="var(--dock-accent)" />
      <rect x="298" y="138" width="38" height="236" rx="19" fill="var(--dock-ink)" />
      <rect x="358" y="192" width="38" height="152" rx="19" fill="var(--dock-ink)" />
    </svg>
  );
}
