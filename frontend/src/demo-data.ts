import type { AlertItem, LapSnapshot } from "./types";

const messages = [
  "Balance is good. We can keep this pace.",
  "Tyres are coming in nicely.",
  "Front is starting to wash in sector two.",
  "Managing the entry now.",
  "Rear is moving around on traction.",
  "The rear is sliding everywhere now.",
  "I am losing the car on exit.",
  "The front tyres are fading.",
  "Why are we still on these tyres?",
  "Rear tyres are completely gone.",
  "I cannot control the car through the esses.",
  "Rear tyres are gone. Box this lap.",
];

export const demoLaps: LapSnapshot[] = messages.map((transcript, index) => {
  const lap = 31 + index;
  const stress = 24 + index * 5;
  const lapDelta = -0.4 + index * 0.2;
  const lapTimeSeconds = 102 + lapDelta;
  const lapMinutes = Math.floor(lapTimeSeconds / 60);
  const lapSeconds = (lapTimeSeconds % 60).toFixed(3).padStart(6, "0");
  const risk = Math.min(82, 12 + index * 6);
  const state = stress >= 75 ? "CRITICAL" : stress >= 50 ? "STRESSED" : stress >= 30 ? "FOCUSED" : "CALM";
  const intent = transcript.toLowerCase().includes("tyre") ? "TYRE_COMPLAINT" : transcript.toLowerCase().includes("control") ? "HANDLING_CONCERN" : "GRIP_ISSUE";
  return {
    lap,
    timestamp: `14:${String(22 + index * 2).padStart(2, "0")}:00`,
    lapTime: `${lapMinutes}:${lapSeconds}`,
    lapTimeSeconds,
    lapDelta,
    sectors: ["33.000", "40.500", "29.500"],
    state,
    stress,
    confidence: 87,
    risk,
    riskLevel: risk >= 75 ? "CRITICAL" : risk >= 55 ? "HIGH" : risk >= 30 ? "MODERATE" : "LOW",
    trend: index < 2 ? "STABLE" : "RISING",
    transcript,
    intent,
    intentLabel: intent.replace(/_/g, " "),
    reasons: ["Simulated radio progression", "Simulated lap context"],
  };
});

export const demoAlerts: AlertItem[] = [
  { level: "HIGH", title: "Demo tyre degradation", detail: "Simulated tyre complaint sequence.", lap: 42, time: "DEMO" },
];
