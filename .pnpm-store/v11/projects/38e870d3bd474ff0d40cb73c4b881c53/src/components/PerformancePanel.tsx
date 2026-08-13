import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function PerformancePanel({ lap, telemetrySource }: { lap: LapSnapshot; telemetrySource: "LIVE" | "UNAVAILABLE" | "DEMO" }) {
  const points = [0, 4, 9, 12, 18, 23, 29, 37, 46].map((value, index) => `${index * 12},${42 - value}`);
  return (
    <section className="panel performance-panel">
      <div className="panel-heading"><span className="eyebrow">02 / PERFORMANCE</span><span className="status-text"><span className="status-dot cyan" /> {telemetrySource} PACE TRACE</span></div>
      <div className="performance-readout"><div><div className="panel-kicker">CURRENT LAP TIME</div><strong>{lap.lapTime ?? "UNAVAILABLE"}</strong></div><div className="delta-block"><span>LAP DELTA</span><strong>{lap.lapDelta === null ? "--" : `${lap.lapDelta >= 0 ? "+" : ""}${lap.lapDelta.toFixed(3)}s`}</strong></div></div>
      {telemetrySource !== "UNAVAILABLE" ? <div className="mini-chart"><svg viewBox="0 0 108 46" role="img" aria-label="Lap time trend"><polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /></svg><span>{telemetrySource === "LIVE" ? "Derived from supplied live timing" : "SIMULATED DEMO TIMING"}</span></div> : <div className="mini-chart"><span>NO LIVE TELEMETRY CONNECTED</span></div>}
      <div className="sector-row">{lap.sectors ? lap.sectors.map((sector, index) => <div key={sector}><span>S{index + 1}</span><strong>{sector}</strong></div>) : <div><span>SECTORS</span><strong>UNAVAILABLE</strong></div>}</div>
    </section>
  );
}
