import { describe, expect, it } from "vitest";
import { buildRaceEventFormData } from "./api";

const metadata = {
  radioEventId: "radio-42-a",
  timestamp: "2026-08-13T14:40:59Z",
};

describe("orchestration multipart mapping", () => {
  it("marks audio-only analysis as unavailable without invented telemetry", () => {
    const data = buildRaceEventFormData(
      new File(["audio"], "radio.wav", { type: "audio/wav" }),
      { sessionId: "session-live", lapNumber: 42 },
      metadata,
    );
    expect(data.get("telemetry_source")).toBe("UNAVAILABLE");
    expect(data.get("lap_time_seconds")).toBeNull();
    expect(data.get("radio_event_id")).toBe("radio-42-a");
  });

  it("sends complete operator-supplied telemetry as live", () => {
    const data = buildRaceEventFormData(
      new File(["audio"], "radio.wav", { type: "audio/wav" }),
      {
        sessionId: "session-live",
        lapNumber: 42,
        lapTimeSeconds: 104.1,
        baselineLapTimeSeconds: 102,
        tireStintAge: 22,
        tireCompound: "SOFT",
      },
      metadata,
    );
    expect(data.get("telemetry_source")).toBe("LIVE");
    expect(data.get("baseline_lap_time_seconds")).toBe("102");
  });

  it("rejects partial telemetry instead of serializing defaults", () => {
    expect(() =>
      buildRaceEventFormData(
        new File(["audio"], "radio.wav", { type: "audio/wav" }),
        { sessionId: "session-live", lapNumber: 42, lapTimeSeconds: 104.1 },
        metadata,
      ),
    ).toThrow(/requires lap time, baseline, tyre stint age, and compound/i);
  });
});
