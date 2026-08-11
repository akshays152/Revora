export type DriverState = "CALM" | "FOCUSED" | "STRESSED" | "CRITICAL";

export type RacingIntent =
  | "TYRE_COMPLAINT"
  | "GRIP_ISSUE"
  | "HANDLING_CONCERN"
  | "PERFORMANCE_DIFFICULTY"
  | "URGENT_REQUEST"
  | "STRATEGY_FRUSTRATION";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface LapSnapshot {
  lap: number;
  timestamp: string;
  lapTime: string;
  lapTimeSeconds: number;
  lapDelta: number;
  sectors: [string, string, string];
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
  };
}

