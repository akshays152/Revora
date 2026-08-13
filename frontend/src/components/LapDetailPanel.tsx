import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function LapDetailPanel({ lap }: { lap: LapSnapshot }) {
  return (
    <section className="panel detail-panel">
      <div className="panel-heading"><span className="eyebrow">09 / SELECTED MESSAGE</span><span className="status-text"><Icon name="radio" size={15} /> RADIO EVENT</span></div>
      <div className="detail-header"><div><span className="detail-lap">LAP {lap.lap}</span><span className="detail-time">{lap.timestamp}</span></div><span className={`state-pill state-pill-${lap.state.toLowerCase()}`}>{lap.state}</span></div>
      <div className="detail-grid"><div><span className="detail-label">STRESS</span><strong className="detail-value text-orange">{lap.stress}%</strong></div><div><span className="detail-label">LAP DELTA</span><strong className="detail-value text-red">{lap.lapDelta === null ? "UNAVAILABLE" : `${lap.lapDelta >= 0 ? "+" : ""}${lap.lapDelta.toFixed(3)}s`}</strong></div><div><span className="detail-label">RISK</span><strong className="detail-value">{lap.risk}</strong></div><div><span className="detail-label">INTENT</span><strong className="detail-intent">{lap.intentLabel}</strong></div></div>
      <div className="detail-message"><span className="quote-mark">“</span><p>{lap.transcript}</p></div>
    </section>
  );
}

