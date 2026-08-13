import type {
  LapSnapshot,
  RadioAnalysisResult,
  RiskAssessmentResult,
  IntelligenceResult,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export async function analyzeRadio(
  file: File,
  lap: LapSnapshot,
): Promise<RadioAnalysisResult> {
  const body = new FormData();
  body.append("audio", file);
  body.append("session_id", "revora-demo-session-001");
  body.append("event_id", "apex-grand-prix-suzuka");
  body.append("lap_number", String(lap.lap));
  body.append("timestamp", lap.timestamp);

  const response = await fetch(`${API_BASE_URL}/analysis/radio`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    let message = `Analysis failed (${response.status}).`;
    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail) message = error.detail;
    } catch {
      // Keep the HTTP status fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<OrchestrationResult>;
}
export async function evaluateRisk(
  request: unknown,
): Promise<RiskAssessmentResult> {
  const response = await fetch(`${API_BASE_URL}/risk/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Risk evaluation failed (${response.status}).`);
  }

  return response.json() as Promise<RiskAssessmentResult>;
}

export async function analyzeIntelligence(
  request: unknown,
): Promise<IntelligenceResult> {
  const response = await fetch(`${API_BASE_URL}/intelligence/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Intelligence analysis failed (${response.status}).`);
  }

  return response.json() as Promise<IntelligenceResult>;
}