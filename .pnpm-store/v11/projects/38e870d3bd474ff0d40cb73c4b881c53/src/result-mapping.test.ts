import { describe, expect, it } from "vitest";
import { toSnapshot } from "./result-mapping";
import type { OrchestrationResult } from "./types";

const result: OrchestrationResult = {
  radio_analysis: {
    session_id: "session-live", lap_id: "lap-42", radio_event_id: "radio-42-a",
    lap_number: 42, timestamp: "2026-08-13T14:40:59Z", transcript: "Box this lap.",
    driver_state: { label: "CRITICAL", stress_score: 82, confidence: 0.9, trend: "RISING" },
    vocal_stress_score: 84, confidence: 0.9,
    intents: [{ label: "URGENT_REQUEST", confidence: 0.92, evidence: "box this lap" }],
    audio_emotions: [{ label: "angry", score: 0.9 }],
    models: { speech_to_text: "whisper", vocal_state: "acoustic", source: "huggingface", classifier_version: "rules-v2" },
  },
  risk_assessment: {
    session_id: "session-live", lap_id: "lap-42", lap_number: 42, telemetry_source: "LIVE",
    risk_score: 88, risk_level: "CRITICAL", trend: "RISING",
    components: { driver_stress_risk: 82, intent_urgency_risk: 92, pace_degradation_risk: 80 },
    reasons: ["Risk reason"], lap_delta_seconds: 2.1, delta_was_corrected: true,
  },
  racing_intelligence: {
    session_id: "session-live", lap_id: "lap-42", radio_event_id: "radio-42-a",
    summary: "Critical convergence", recommendation: { action: "BOX THIS LAP", recommended_compound: "HARD", urgency: "IMMEDIATE", pit_window_open: true, estimated_time_loss_sec: 22 },
    reasons: ["Live intelligence reason"], alerts: [], radio_advisory: "Box, box.",
  },
  temporal_window_size: 2,
  telemetry: { session_id: "session-live", lap_id: "lap-42", telemetry_source: "LIVE", lap_number: 42, lap_time_seconds: 104.1, baseline_lap_time_seconds: 102, lap_delta: 0.2, sector_deltas: [], tire_stint_age: 22, tire_compound: "SOFT" },
};

describe("live response mapping", () => {
  it("maps risk and intelligence from the authoritative live response", () => {
    const snapshot = toSnapshot(result);
    expect(snapshot.lap).toBe(42);
    expect(snapshot.risk).toBe(88);
    expect(snapshot.lapDelta).toBe(2.1);
    expect(snapshot.transcript).toBe("Box this lap.");
    expect(snapshot.reasons).toEqual(["Live intelligence reason"]);
  });
});
