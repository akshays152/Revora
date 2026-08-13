import type { LapSnapshot } from "../types";
import { Icon } from "./Icon";

interface StateTimelineProps {
  laps: LapSnapshot[];
  selectedLap: number;
  onSelectLap: (lap: number) => void;
}

export function StateTimeline({ laps, selectedLap, onSelectLap }: StateTimelineProps) {
  return (
    <section className="panel timeline-panel">
      <div className="panel-heading"><span className="eyebrow">05 / DRIVER STATE TIMELINE</span><span className="status-text"><Icon name="pulse" size={15} /> {laps.length} LIVE EVENTS</span></div>
      <div className="timeline-intro"><div><h2>State progression</h2><p>Driver-state trend across recent radio calls</p></div><div className="timeline-legend"><span><i className="legend-dot calm" /> NORMAL</span><span><i className="legend-dot warn" /> WARNING</span><span><i className="legend-dot critical" /> CRITICAL</span></div></div>
      <div className="timeline-scroll"><div className="timeline-track" />{laps.map((item) => <button key={item.lap} className={`timeline-node node-${item.state.toLowerCase()} ${item.lap === selectedLap ? "is-selected" : ""}`} onClick={() => onSelectLap(item.lap)}><span className="node-marker"><span /></span><span className="node-lap">LAP {item.lap}</span><strong>{item.state}</strong><span className="node-stress">{item.stress}%</span></button>)}</div>
      <div className="timeline-footer"><span>NORMAL <Icon name="chevron" size={13} /> WARNING <Icon name="chevron" size={13} /> STRESS ESCALATION <Icon name="chevron" size={13} /> CRITICAL</span><span>SELECT A LAP TO INSPECT <Icon name="chevron" size={13} /></span></div>
    </section>
  );
}

