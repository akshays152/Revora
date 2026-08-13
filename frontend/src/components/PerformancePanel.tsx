import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function PerformancePanel({ lap }: { lap: LapSnapshot }) {
  const points = [0, 4, 9, 12, 18, 23, 29, 37, 46].map((value, index) => `${index * 12},${42 - value}`);
  return (
    <section className="panel performance-panel">
      <div className="panel-heading"><span className="eyebrow">02 / PERFORMANCE</span><span className="status-text"><span className="status-dot cyan" /> PACE TRACE</span></div>
      <div className="performance-readout"><div><div className="panel-kicker">CURRENT LAP TIME</div><strong>{lap.lapTime}</strong></div><div className="delta-block"><span>LAP DELTA</span><strong>+{lap.lapDelta.toFixed(1)}s</strong></div></div>
      <div className="mini-chart"><svg viewBox="0 0 108 46" role="img" aria-label="Lap time trend"><polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg><span>{lap.lapDelta > 0 ? `+${lap.lapDelta.toFixed(1)}s degradation` : lap.lapDelta < 0 ? `${Math.abs(lap.lapDelta).toFixed(1)}s faster` : "ON BASELINE"}</span></div>
      <div className="sector-row">{lap.sectors.map((sector, index) => <div key={sector}><span>S{index + 1}</span><strong>{sector}</strong></div>)}</div>
    </section>
  );
}

