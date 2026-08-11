import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function DriverStatePanel({ lap }: { lap: LapSnapshot }) {
  const trendArrow = lap.trend === "RISING" ? "↑" : lap.trend === "FALLING" ? "↓" : "→";
  return (
    <section className="panel driver-panel">
      <div className="panel-heading"><span className="eyebrow">01 / DRIVER STATE</span><Icon name="info" size={15} /></div>
      <div className="state-heading-row">
        <div><div className="panel-kicker">OBSERVABLE STATE</div><h2 className={`state-title state-${lap.state.toLowerCase()}`}>{lap.state}</h2></div>
        <div className="state-trend"><span className="trend-arrow">{trendArrow}</span><span>{lap.trend}</span></div>
      </div>
      <div className="stress-readout"><span>STRESS INDEX</span><strong>{lap.stress}%</strong></div>
      <div className="meter"><span style={{ width: `${lap.stress}%` }} /></div>
      <div className="state-meta"><div><span>CONFIDENCE</span><strong>{lap.confidence}%</strong></div><div><span>3-LAP SHIFT</span><strong className="text-orange">+29%</strong></div></div>
      <div className="signal-strip"><span>VOCAL BASELINE</span><span>LANGUAGE PATTERN</span><span>RACE CONTEXT</span></div>
    </section>
  );
}

