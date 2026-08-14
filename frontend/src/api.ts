import type {
  LapSnapshot,
  OrchestrationResult,
  RiskAssessmentResult,
  IntelligenceResult,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

type TelemetryInput = {
  lapTimeSeconds?: number | null;
  baselineLapTimeSeconds?: number | null;
  tireStintAge?: number | null;
  tireCompound?: string | null;
};

type RadioEventMetadata = {
  radioEventId: string;
  timestamp: string;
};

export function buildRaceEventFormData(
  file: File,
  input: { sessionId: string; lapNumber: number } & TelemetryInput,
  metadata: RadioEventMetadata,
): FormData {
  const body = new FormData();
  body.append("audio", file);
  body.append("session_id", input.sessionId);
  body.append("lap_id", `lap-${input.lapNumber}`);
  body.append("radio_event_id", metadata.radioEventId);
  body.append("lap_number", String(input.lapNumber));
  body.append("timestamp", metadata.timestamp);

  const telemetryValues = [
    input.lapTimeSeconds,
    input.baselineLapTimeSeconds,
    input.tireStintAge,
    input.tireCompound,
  ];
  const hasAnyTelemetry = telemetryValues.some((value) => value !== undefined && value !== null && value !== "");
  const hasCompleteTelemetry = telemetryValues.every((value) => value !== undefined && value !== null && value !== "");

  if (hasAnyTelemetry && !hasCompleteTelemetry) {
    throw new Error("Live telemetry requires lap time, baseline, tyre stint age, and compound.");
  }

  if (hasCompleteTelemetry) {
    body.append("telemetry_source", "LIVE");
    body.append("lap_time_seconds", String(input.lapTimeSeconds));
    body.append("baseline_lap_time_seconds", String(input.baselineLapTimeSeconds));
    body.append("tire_stint_age", String(input.tireStintAge));
    body.append("tire_compound", String(input.tireCompound));
  } else {
    body.append("telemetry_source", "UNAVAILABLE");
  }

  return body;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const error = (await response.json()) as { detail?: string };
    return new Error(error.detail ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function analyzeRadio(
  file: File,
  lap: LapSnapshot,
): Promise<OrchestrationResult> {
  const body = buildRaceEventFormData(
    file,
    { sessionId: "revora-live-session", lapNumber: lap.lap },
    { radioEventId: `radio-${lap.lap}`, timestamp: lap.timestamp },
  );
  const response = await fetch(`${API_BASE_URL}/analysis/orchestrate`, {
    method: "POST",
    body,
  });
  if (!response.ok) throw await readError(response, `Analysis failed (${response.status}).`);
  return response.json() as Promise<OrchestrationResult>;
}

export async function evaluateRisk(request: unknown): Promise<RiskAssessmentResult> {
  const response = await fetch(`${API_BASE_URL}/risk/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await readError(response, `Risk evaluation failed (${response.status}).`);
  return response.json() as Promise<RiskAssessmentResult>;
}

export async function analyzeIntelligence(request: unknown): Promise<IntelligenceResult> {
  const response = await fetch(`${API_BASE_URL}/intelligence/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await readError(response, `Intelligence analysis failed (${response.status}).`);
  return response.json() as Promise<IntelligenceResult>;
}
