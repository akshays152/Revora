import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function PerformanceChart({ laps, selectedLap, telemetrySource }: { laps: LapSnapshot[]; selectedLap: number; telemetrySource: "LIVE" | "UNAVAILABLE" | "DEMO" }) {
  const width = 760, height = 254, left = 44, right = 16, top = 22, bottom = 30;
  const innerWidth = width - left - right, innerHeight = height - top - bottom;
  const x = (index: number) => left + (laps.length <= 1 ? innerWidth / 2 : index * innerWidth / (laps.length - 1));
  const yStress = (value: number) => top + innerHeight - value / 100 * innerHeight;
  const stressPath = laps.map((item, index) => `${x(index)},${yStress(item.stress)}`).join(" ");
  const livePace = laps.filter((item) => item.lapDelta !== null);
  const maxDelta = Math.max(1, ...livePace.map((item) => Math.abs(item.lapDelta ?? 0)));
  const yDelta = (value: number) => top + innerHeight / 2 - value / maxDelta * (innerHeight / 2);
  const deltaPath = laps.map((item, index) => item.lapDelta === null ? null : `${x(index)},${yDelta(item.lapDelta)}`).filter(Boolean).join(" ");

  return (
    <section className="panel chart-panel">
      <div className="panel-heading"><span className="eyebrow">06 / LIVE EVENT HISTORY</span><span className="status-text"><span className="status-dot orange" /> MEASURED VALUES</span></div>
      <div className="chart-heading"><div><h2>Radio state progression</h2><p>{telemetrySource === "DEMO" ? "Simulated stress and lap delta" : `Measured stress${telemetrySource === "LIVE" ? " and supplied live lap delta" : " · live telemetry unavailable"}`}</p></div><div className="chart-legend"><span><i className="line-swatch orange" /> STRESS</span>{telemetrySource !== "UNAVAILABLE" && <span><i className="line-swatch cyan" /> {telemetrySource} LAP DELTA</span>}</div></div>
      <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Measured live event history">{[0,25,50,75,100].map((value) => <g key={value}><line x1={left} x2={width-right} y1={yStress(value)} y2={yStress(value)} className="chart-grid"/><text x="8" y={yStress(value)+4} className="chart-axis">{value}</text></g>)}{deltaPath && <polyline points={deltaPath} className="chart-line cyan-line"/>}<polyline points={stressPath} className="chart-line orange-line"/>{laps.map((item,index)=><g key={`${item.lap}-${index}`}><circle cx={x(index)} cy={yStress(item.stress)} r={item.lap===selectedLap?5:3} className={`chart-point stress-point ${item.lap===selectedLap?"selected":""}`}/><text x={x(index)} y={height-8} textAnchor="middle" className="chart-axis">{item.lap}</text></g>)}</svg></div>
      <div className="chart-callout"><Icon name="arrow" size={16}/><span>{telemetrySource === "DEMO" ? "DEMO ONLY" : "LIVE ONLY"}</span><strong>{telemetrySource === "DEMO" ? "Simulated presentation data" : telemetrySource === "LIVE" ? "No simulated values included" : "Connect live telemetry to enable pace correlation"}</strong></div>
    </section>
  );
}
