import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function PerformanceChart({ laps, selectedLap }: { laps: LapSnapshot[]; selectedLap: number }) {
  const width = 760;
  const height = 254;
  const padLeft = 44;
  const padRight = 16;
  const padTop = 22;
  const padBottom = 30;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const x = (index: number) => padLeft + (index * innerWidth) / (laps.length - 1);
  const yStress = (value: number) => padTop + innerHeight - (value / 100) * innerHeight;
  const maxDelta = 2.2;
  const yDelta = (value: number) => padTop + innerHeight - (Math.max(0, value + 0.4) / maxDelta) * innerHeight;
  const stressPath = laps.map((item, index) => `${x(index)},${yStress(item.stress)}`).join(" ");
  const deltaPath = laps.map((item, index) => `${x(index)},${yDelta(item.lapDelta)}`).join(" ");
  const selectedIndex = laps.findIndex((item) => item.lap === selectedLap);
  const selected = laps[selectedIndex];

  return (
    <section className="panel chart-panel">
      <div className="panel-heading"><span className="eyebrow">06 / STRESS VS PERFORMANCE</span><span className="status-text"><span className="status-dot orange" /> CORRELATION VIEW</span></div>
      <div className="chart-heading"><div><h2>When voice becomes pace</h2><p>Stress index vs. lap-time delta · last 12 laps</p></div><div className="chart-legend"><span><i className="line-swatch orange" /> STRESS</span><span><i className="line-swatch cyan" /> LAP DELTA</span></div></div>
      <div className="chart-wrap"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stress and lap delta correlation chart"><defs><linearGradient id="stress-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff6b35" stopOpacity=".20" /><stop offset="1" stopColor="#ff6b35" stopOpacity="0" /></linearGradient></defs>{[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1={padLeft} x2={width - padRight} y1={yStress(value)} y2={yStress(value)} className="chart-grid" /><text x="8" y={yStress(value) + 4} className="chart-axis">{value}</text></g>)}<polyline points={`${padLeft},${padTop + innerHeight} ${stressPath} ${width - padRight},${padTop + innerHeight}`} fill="url(#stress-fill)" stroke="none" /><polyline points={deltaPath} className="chart-line cyan-line" /><polyline points={stressPath} className="chart-line orange-line" />{laps.map((item, index) => <g key={item.lap}><circle cx={x(index)} cy={yStress(item.stress)} r={item.lap === selectedLap ? 5 : 3} className={`chart-point stress-point ${item.lap === selectedLap ? "selected" : ""}`} /><circle cx={x(index)} cy={yDelta(item.lapDelta)} r={3} className="chart-point delta-point" /><text x={x(index)} y={height - 8} textAnchor="middle" className={`chart-axis ${item.lap === selectedLap ? "selected-axis" : ""}`}>{item.lap}</text></g>)}{selected && <g><line x1={x(selectedIndex)} x2={x(selectedIndex)} y1={padTop} y2={padTop + innerHeight} className="chart-focus" /><rect x={Math.min(x(selectedIndex) - 38, width - 82)} y="5" width="76" height="20" rx="4" className="chart-tooltip" /><text x={Math.min(x(selectedIndex), width - 44)} y="19" textAnchor="middle" className="chart-tooltip-text">LAP {selected.lap}</text></g>}</svg></div>
      <div className="chart-callout"><Icon name="arrow" size={16} /><span>Correlation emerging</span><strong>Stress rising alongside +{selected?.lapDelta.toFixed(1)}s lap delta</strong></div>
    </section>
  );
}

