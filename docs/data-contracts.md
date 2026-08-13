# REVORA Initial Data Contracts

These are shared, conceptual contracts for the first parallel development phase. They describe the shape and meaning of data without committing the team to a concrete transport format or implementation. Field names are preferred names for future TypeScript and Pydantic models.

All timestamps use ISO 8601 strings. Percentages and scores use a `0-100` range unless stated otherwise. These values are decision-support indicators, not scientifically validated or clinically meaningful measurements.

## RadioAnalysis

Represents the analysis of one driver radio message.

```ts
type RadioAnalysis = {
  session_id: string;
  lap_id: string;
  radio_event_id: string;
  lap_number: number;
  timestamp: string;
  audio_url?: string;
  transcript: string;
  driver_state: DriverState;
  vocal_stress_score: number; // 0-100
  confidence: number; // 0-1
  intents: RacingIntent[];
};
```

`RadioAnalysis` belongs at the boundary between audio/NLP analysis and racing intelligence. It should preserve the transcript and observable signals used to produce the estimate.

### Implemented transport

`POST /api/analysis/orchestrate` is the product endpoint. It accepts multipart audio, event identifiers, and explicit telemetry fields and returns radio analysis, risk assessment, and racing intelligence together. A rolling five-event session window calculates rising/falling trends. `POST /api/analysis/radio` remains a lower-level debugging endpoint.

The prototype stress score is a transparent heuristic over real acoustic features (RMS energy, zero-crossing rate, and spectral centroid) with a small transcript-language adjustment. Whisper remains the required Hugging Face speech-to-text component. An optional Hugging Face emotion model can replace the acoustic feature layer when explicitly enabled. This is an observable decision-support signal, not a diagnosis or a scientifically calibrated stress measurement.

## DriverState

Represents the small, racing-relevant state vocabulary used by REVORA.

```ts
type DriverState = {
  label: "CALM" | "FOCUSED" | "STRESSED" | "CRITICAL";
  stress_score: number; // 0-100
  confidence: number; // 0-1
  trend: "STABLE" | "RISING" | "FALLING";
};
```

This describes observable vocal and linguistic indicators. It must not be presented as a medical or psychological diagnosis.

## RacingIntent

Represents a racing-specific signal detected in a transcript.

```ts
type RacingIntent = {
  label:
    | "TYRE_COMPLAINT"
    | "GRIP_ISSUE"
    | "HANDLING_CONCERN"
    | "PERFORMANCE_DIFFICULTY"
    | "URGENT_REQUEST"
    | "STRATEGY_FRUSTRATION";
  confidence: number; // 0-1
  evidence: string;
};
```

The intent vocabulary can grow later, but additions should remain tied to racing decisions rather than generic emotion categories.

## LapPerformance

Represents performance context associated with a lap.

```ts
type LapPerformance = {
  lap: number;
  lap_time_seconds: number;
  lap_delta_seconds?: number;
  sector_times_seconds?: number[];
  timestamp?: string;
};
```

When live timing is supplied, `lap_delta_seconds` is derived as `lap_time_seconds - baseline_lap_time_seconds`. A caller-provided delta is audit-only and the response flags a correction when it disagrees. If timing is absent, telemetry is `UNAVAILABLE` and the delta remains empty. Pace contributes to risk only when `telemetry_source` is explicitly `LIVE`.

## RiskAssessment

Represents the transparent output of the future racing risk engine.

```ts
type RiskAssessment = {
  risk_score: number; // 0-100
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  trend: "STABLE" | "RISING" | "FALLING";
  reasons: string[];
  evidence_laps?: number[];
  generated_at: string;
};
```

The risk engine should expose enough evidence for the UI to explain why a risk level was produced, such as increasing stress, repeated tyre complaints, or lap-time degradation. The calculation must remain transparent and easy to modify.

## Ownership and compatibility

- Audio/NLP work produces `RadioAnalysis` and its nested `DriverState`/`RacingIntent` values.
- Lap/performance work produces `LapPerformance`.
- Racing intelligence and risk work consume those structures and produce `RiskAssessment`.
- Frontend work should consume these shapes without depending on model-specific internals.
- Breaking changes should be discussed before changing field names, enums, units, or score ranges.

