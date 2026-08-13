import type {
  LiveEventInput,
  OrchestrationResult,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export interface EventMetadata {
  radioEventId: string;
  timestamp: string;
}

export function buildRaceEventFormData(
  file: File,
  event: LiveEventInput,
  metadata: EventMetadata,
): FormData {
  const telemetryValues = [
    event.lapTimeSeconds,
    event.baselineLapTimeSeconds,
    event.tireStintAge,
    event.tireCompound,
  ];
  const suppliedTelemetryFields = telemetryValues.filter(
    (value) => value !== undefined && value !== "",
  ).length;
  if (suppliedTelemetryFields !== 0 && suppliedTelemetryFields !== telemetryValues.length) {
    throw new Error(
      "Live telemetry requires lap time, baseline, tyre stint age, and compound.",
    );
  }

  const body = new FormData();
  body.append("audio", file);
  body.append("session_id", event.sessionId);
  body.append("lap_id", `lap-${event.lapNumber}`);
  body.append("radio_event_id", metadata.radioEventId);
  body.append("lap_number", String(event.lapNumber));
  body.append("timestamp", metadata.timestamp);
  const hasTelemetry = suppliedTelemetryFields === telemetryValues.length;
  body.append("telemetry_source", hasTelemetry ? "LIVE" : "UNAVAILABLE");
  if (hasTelemetry) {
    body.append("lap_time_seconds", String(event.lapTimeSeconds));
    body.append("baseline_lap_time_seconds", String(event.baselineLapTimeSeconds));
    body.append("tire_stint_age", String(event.tireStintAge));
    body.append("tire_compound", event.tireCompound ?? "");
  }
  return body;
}

export async function analyzeRaceEvent(
  file: File,
  event: LiveEventInput,
): Promise<OrchestrationResult> {
  const body = buildRaceEventFormData(file, event, {
    radioEventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(`${API_BASE_URL}/analysis/orchestrate`, {
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
