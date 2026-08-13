import type { LapSnapshot, OrchestrationResult } from "./types";

export const formatLapTime = (seconds: number | null): string | null =>
  seconds === null
    ? null
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(3).padStart(6, "0")}`;

export function toSnapshot(result: OrchestrationResult): LapSnapshot {
  const { radio_analysis: radio, risk_assessment: risk } = result;
  const intent = radio.intents[0];
  return {
    lap: radio.lap_number,
    timestamp: new Date(radio.timestamp).toLocaleTimeString(),
    lapTime: formatLapTime(result.telemetry.lap_time_seconds),
    lapTimeSeconds: result.telemetry.lap_time_seconds,
    lapDelta: risk.lap_delta_seconds,
    sectors: null,
    state: radio.driver_state.label,
    stress: radio.driver_state.stress_score,
    confidence: Math.round(radio.confidence * 100),
    risk: risk.risk_score,
    riskLevel: risk.risk_level,
    trend: risk.trend,
    transcript: radio.transcript,
    intent: intent?.label ?? "PERFORMANCE_DIFFICULTY",
    intentLabel: intent?.label.replace(/_/g, " ") ?? "NO RACING INTENT DETECTED",
    reasons: result.racing_intelligence.reasons,
  };
}
