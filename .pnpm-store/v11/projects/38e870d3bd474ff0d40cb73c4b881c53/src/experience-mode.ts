import type { ExperienceMode } from "./types";

export type ExperienceEvent =
  | "AUDIO_SELECTED"
  | "AUDIO_CLEARED"
  | "ANALYSIS_STARTED"
  | "ANALYSIS_SUCCEEDED"
  | "ANALYSIS_FAILED"
  | "RETURN_TO_DEMO";

export function transitionExperienceMode(
  current: ExperienceMode,
  event: ExperienceEvent,
): ExperienceMode {
  switch (event) {
    case "AUDIO_SELECTED":
      return "LIVE_INPUT_READY";
    case "ANALYSIS_STARTED":
      return current === "LIVE_INPUT_READY" || current === "LIVE_RESULT"
        ? "ANALYZING"
        : current;
    case "ANALYSIS_SUCCEEDED":
      return current === "ANALYZING" ? "LIVE_RESULT" : current;
    case "ANALYSIS_FAILED":
      return current === "ANALYZING" ? "LIVE_INPUT_READY" : current;
    case "AUDIO_CLEARED":
      return current === "LIVE_INPUT_READY" ? "DEMO" : current;
    case "RETURN_TO_DEMO":
      return "DEMO";
  }
}
