import type { IntelligenceResult, LapSnapshot } from "../types";
import { Icon } from "./Icon";

export function InsightPanel({
  lap,
  intelligence,
}: {
  lap: LapSnapshot;
  intelligence: IntelligenceResult | null;
}) {
  return (
    <section className="panel insight-panel">
      <div className="panel-heading"><span className="eyebrow">07 / AI RACE ENGINEER</span><span className="insight-spark">✦</span></div>
      <div className="insight-label"><span className="insight-pulse" /> {lap.risk >= 70 ? "EARLY WARNING" : "MONITORING"}</div>
      <h2>{intelligence?.summary ?? "Driver performance risk is increasing."}</h2>
      <p className="insight-lead">
        {intelligence
          ? intelligence.radio_advisory
          : "Monitoring driver signals and race performance for emerging risk."}
      </p>
      <div className="evidence-list">{lap.reasons.map((reason) => <div key={reason}><Icon name="arrow" size={14} /><span>{reason}</span></div>)}</div>
      <div className="insight-status"><span>STATUS</span><strong>PERFORMANCE RISK INCREASING</strong></div>
      <div className="insight-note"><Icon name="info" size={14} /> Decision-support indicator · explainable by observable signals</div>
    </section>
  );
}

