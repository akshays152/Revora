import type { LapSnapshot, RiskAssessmentResult } from "../types";
import { Icon } from "./Icon";

export function RiskPanel({ lap, assessment }: { lap: LapSnapshot; assessment?: RiskAssessmentResult | null }) {
  const radius = 53;
  const circumference = 2 * Math.PI * radius;
  const usesLivePace = assessment?.telemetry_source === "LIVE";
  const riskCopy = assessment
    ? usesLivePace && assessment.components.pace_degradation_risk > 0
      ? "Live driver-state and pace signals are included in this assessment."
      : `Risk is based on live radio signals; ${assessment.telemetry_source.toLowerCase()} pace is excluded.`
    : "Awaiting measured radio signals.";
  const status = lap.riskLevel === "CRITICAL" ? "ACT NOW" : lap.trend === "RISING" ? "MONITOR CLOSELY" : "CONTINUE MONITORING";
  return (
    <section className={`panel risk-panel risk-${lap.riskLevel.toLowerCase()}`}>
      <div className="panel-heading"><span className="eyebrow">03 / PERFORMANCE RISK</span><span className="risk-live-label"><span className="risk-pulse" /> AI SIGNAL</span></div>
      <div className="risk-body">
        <div className="risk-ring"><svg viewBox="0 0 124 124"><circle className="ring-track" cx="62" cy="62" r={radius} /><circle className="ring-value" cx="62" cy="62" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference - (lap.risk / 100) * circumference} /></svg><div className="risk-number"><strong>{lap.risk}</strong><span>/ 100</span></div></div>
        <div className="risk-copy"><div className="risk-level">{lap.riskLevel}</div><div className="risk-trend"><Icon name="arrow" size={15} /> TREND {lap.trend}</div><p>{riskCopy}</p></div>
      </div>
      <div className="risk-footer"><span>DECISION-SUPPORT INDICATOR</span><span className="risk-status-bar">{status}</span></div>
    </section>
  );
}

