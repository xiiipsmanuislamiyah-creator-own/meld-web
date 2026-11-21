export function EqualizerBars({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`eq-bars${paused ? " paused" : ""}`} aria-hidden="true">
      <span className="eq-bar" style={{ height: "72%" }} />
      <span className="eq-bar" style={{ height: "100%" }} />
      <span className="eq-bar" style={{ height: "54%" }} />
    </span>
  );
}
