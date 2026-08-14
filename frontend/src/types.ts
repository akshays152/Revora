export type DriverState = "UNCERTAIN" | "CALM" | "FOCUSED" | "STRESSED" | "CRITICAL";

export type RacingIntent =
  | "TYRE_COMPLAINT"
  | "GRIP_ISSUE"
  | "HANDLING_CONCERN"
  | "PERFORMANCE_DIFFICULTY"
  | "URGENT_REQUEST"
  | "STRATEGY_FRUSTRATION";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ExperienceMode = "DEMO" | "LIVE_INPUT_READY" | "ANALYZING" | "LIVE_RESULT";

export interface LapSnapshot {
  lap: number;
  timestamp: string;
  lapTime: string | null;
  lapTimeSeconds: number | null;
  lapDelta: number | null;
  sectors: [string, string, string] | null;
  state: DriverState;
  stress: number;
  confidence: number;
  risk: number;
  riskLevel: RiskLevel;
  trend: "STABLE" | "RISING" | "FALLING";
  transcript: string;
  intent: RacingIntent;
  intentLabel: string;
  reasons: string[];
}

export interface AlertItem {
  level: RiskLevel;
  title: string;
  detail: string;
  lap: number;
  time: string;
}

export interface RadioAnalysisResult {
  session_id: string;
  lap_id: string;
  radio_event_id: string;
  lap_number: number;
  timestamp: string; 
  transcript: string;
  driver_state: {
    label: DriverState;
    stress_score: number;
    confidence: number;
    trend: "STABLE" | "RISING" | "FALLING";
  };
  vocal_stress_score: number;
  confidence: number;
  intents: Array<{
    label: RacingIntent;
    confidence: number;
    evidence: string;
  }>;
  audio_emotions: Array<{ label: string; score: number }>;
  models: {
    speech_to_text: string;
    vocal_state: string;
    source: string;
    classifier_version?: string | null;
  };
}

export interface RiskAssessmentResult {
  session_id: string | null;
  lap_id: string | null;
  lap_number: number | null;
  telemetry_source: "LIVE" | "UNAVAILABLE" | "DEMO";
  lap_delta_seconds: number | null;
  delta_was_corrected: boolean;
  risk_score: number;
  risk_level: RiskLevel;
  trend: "STABLE" | "RISING" | "FALLING";
  components: {
    driver_stress_risk: number;
    intent_urgency_risk: number;
    pace_degradation_risk: number;
  };
  reasons: string[];
}

export interface IntelligenceResult {
  session_id: string | null;
  lap_id: string | null;
  radio_event_id: string | null;
  summary: string;
  recommendation: {
    action: string;
    recommended_compound: string;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "IMMEDIATE";
    pit_window_open: boolean;
    estimated_time_loss_sec: number;
  };
  reasons: string[];
  alerts: AlertItem[];
  radio_advisory: string;
}

export interface TelemetrySnapshot {
  session_id: string;
  lap_id: string;
  telemetry_source: "LIVE" | "UNAVAILABLE" | "DEMO";
  lap_number: number;
  lap_time_seconds: number | null;
  baseline_lap_time_seconds: number | null;
  lap_delta: number | null;
  sector_deltas: number[];
  tire_stint_age: number;
  tire_compound: string;
  delta_was_corrected?: boolean;
}

export interface OrchestrationResult {
  radio_analysis: RadioAnalysisResult;
  risk_assessment: RiskAssessmentResult;
  racing_intelligence: IntelligenceResult;
  telemetry: TelemetrySnapshot;
  temporal_window_size: number;
}
