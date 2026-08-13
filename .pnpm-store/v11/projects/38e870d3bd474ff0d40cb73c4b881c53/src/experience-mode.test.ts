import { describe, expect, it } from "vitest";
import { transitionExperienceMode } from "./experience-mode";

describe("live/demo state isolation", () => {
  it("pauses the demo path as soon as audio is selected", () => {
    expect(transitionExperienceMode("DEMO", "AUDIO_SELECTED")).toBe(
      "LIVE_INPUT_READY",
    );
  });

  it("shows a live result only after a successful analysis", () => {
    const analyzing = transitionExperienceMode(
      "LIVE_INPUT_READY",
      "ANALYSIS_STARTED",
    );
    expect(analyzing).toBe("ANALYZING");
    expect(transitionExperienceMode(analyzing, "ANALYSIS_SUCCEEDED")).toBe(
      "LIVE_RESULT",
    );
  });

  it("never advances the live workflow from a demo replay action", () => {
    expect(transitionExperienceMode("DEMO", "ANALYSIS_STARTED")).toBe("DEMO");
    expect(transitionExperienceMode("LIVE_RESULT", "RETURN_TO_DEMO")).toBe(
      "DEMO",
    );
  });
});
