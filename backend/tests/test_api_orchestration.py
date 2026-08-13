import asyncio
import io
import unittest
from uuid import uuid4

import httpx
from starlette.datastructures import UploadFile

from app.api.routes import analysis as analysis_route
from app.main import app
from app.schemas.analysis import (
    AudioEmotion,
    DriverStateLabel,
    DriverStateResult,
    ModelMetadata,
    RadioAnalysisResponse,
    RacingIntentLabel,
    RacingIntentResult,
)
from app.schemas.risk_engine import TelemetrySnapshot
from app.services.orchestration import AnalysisOrchestrator


class FakeAudioPipeline:
    def analyze(self, _payload, _suffix, **metadata):
        return RadioAnalysisResponse(
            **metadata,
            transcript="Rear tyres are completely gone. Box this lap.",
            driver_state=DriverStateResult(
                label=DriverStateLabel.CRITICAL,
                stress_score=82,
                confidence=0.9,
            ),
            vocal_stress_score=84,
            confidence=0.9,
            intents=[
                RacingIntentResult(
                    label=RacingIntentLabel.URGENT_REQUEST,
                    confidence=0.91,
                    evidence="box this lap",
                ),
                RacingIntentResult(
                    label=RacingIntentLabel.TYRE_COMPLAINT,
                    confidence=0.86,
                    evidence="tyres",
                ),
            ],
            audio_emotions=[AudioEmotion(label="angry", score=0.9)],
            models=ModelMetadata(speech_to_text="fake-asr", vocal_state="fake-state"),
        )


class OrchestrationApiTests(unittest.TestCase):
    def test_real_http_multipart_upload_maps_complete_response(self):
        original = analysis_route.audio_pipeline
        analysis_route.audio_pipeline = FakeAudioPipeline()
        try:
            async def post_event():
                transport = httpx.ASGITransport(app=app)
                async with httpx.AsyncClient(
                    transport=transport, base_url="http://testserver"
                ) as client:
                    return await client.post(
                    "/api/analysis/orchestrate",
                    files={"audio": ("radio.wav", b"fake-wave", "audio/wav")},
                    data={
                        "session_id": "http-session",
                        "lap_id": "lap-42",
                        "radio_event_id": "radio-http-42",
                        "lap_number": "42",
                        "timestamp": "2026-08-13T14:40:59Z",
                        "telemetry_source": "LIVE",
                        "lap_time_seconds": "104.1",
                        "baseline_lap_time_seconds": "102.0",
                        "lap_delta": "0.2",
                        "tire_stint_age": "22",
                        "tire_compound": "SOFT",
                    },
                    )

            response = asyncio.run(post_event())
        finally:
            analysis_route.audio_pipeline = original

        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()
        self.assertEqual(result["radio_analysis"]["radio_event_id"], "radio-http-42")
        self.assertEqual(result["risk_assessment"]["lap_delta_seconds"], 2.1)
        self.assertEqual(result["racing_intelligence"]["recommendation"]["action"], "BOX THIS LAP")
        self.assertEqual(result["telemetry"]["telemetry_source"], "LIVE")

    def test_audio_only_request_never_invents_telemetry(self):
        original = analysis_route.audio_pipeline
        analysis_route.audio_pipeline = FakeAudioPipeline()
        try:
            result = asyncio.run(
                analysis_route.orchestrate_analysis(
                    audio=UploadFile(io.BytesIO(b"fake-wave"), filename="radio.wav"),
                    session_id="audio-only-session",
                    lap_id="lap-7",
                    radio_event_id="radio-7-a",
                    lap_number=7,
                    timestamp="2026-08-13T15:00:00Z",
                    telemetry_source="UNAVAILABLE",
                    lap_time_seconds=None,
                    baseline_lap_time_seconds=None,
                    lap_delta=None,
                    tire_stint_age=None,
                    tire_compound=None,
                )
            )
        finally:
            analysis_route.audio_pipeline = original

        self.assertEqual(result.telemetry.telemetry_source, "UNAVAILABLE")
        self.assertIsNone(result.telemetry.lap_time_seconds)
        self.assertIsNone(result.risk_assessment.lap_delta_seconds)
        self.assertEqual(result.risk_assessment.components.pace_degradation_risk, 0)
        self.assertIn("Live telemetry unavailable", " ".join(result.risk_assessment.reasons))

    def test_upload_maps_metadata_risk_and_intelligence_in_one_response(self):
        original = analysis_route.audio_pipeline
        analysis_route.audio_pipeline = FakeAudioPipeline()
        session_id = f"session-{uuid4()}"
        try:
            result = asyncio.run(
                analysis_route.orchestrate_analysis(
                    audio=UploadFile(io.BytesIO(b"fake-wave"), filename="radio.wav"),
                    session_id=session_id,
                    lap_id="lap-42",
                    radio_event_id="radio-42-a",
                    lap_number=42,
                    timestamp="2026-08-13T14:40:59Z",
                    telemetry_source="LIVE",
                    lap_time_seconds=104.1,
                    baseline_lap_time_seconds=102.0,
                    lap_delta=0.2,
                    tire_stint_age=22,
                    tire_compound="SOFT",
                )
            )
        finally:
            analysis_route.audio_pipeline = original

        result = result.model_dump(mode="json")
        self.assertEqual(result["radio_analysis"]["radio_event_id"], "radio-42-a")
        self.assertEqual(result["risk_assessment"]["lap_id"], "lap-42")
        self.assertEqual(result["risk_assessment"]["lap_delta_seconds"], 2.1)
        self.assertTrue(result["risk_assessment"]["delta_was_corrected"])
        self.assertEqual(result["racing_intelligence"]["recommendation"]["action"], "BOX THIS LAP")
        self.assertGreaterEqual(len(result["racing_intelligence"]["alerts"]), 1)

    def test_rolling_window_calculates_a_real_rising_trend(self):
        service = AnalysisOrchestrator()
        pipeline = FakeAudioPipeline()
        first = pipeline.analyze(
            b"x", ".wav", session_id="trend-session", lap_id="lap-41",
            radio_event_id="radio-41", lap_number=41, timestamp="14:39:16",
        )
        first = first.model_copy(
            update={"driver_state": first.driver_state.model_copy(update={"stress_score": 30})}
        )
        second = pipeline.analyze(
            b"x", ".wav", session_id="trend-session", lap_id="lap-42",
            radio_event_id="radio-42", lap_number=42, timestamp="14:40:59",
        )
        for radio, lap, delta in ((first, 41, 0.2), (second, 42, 2.1)):
            result = service.evaluate(
                radio,
                TelemetrySnapshot(
                    session_id="trend-session", lap_id=f"lap-{lap}",
                    telemetry_source="LIVE", lap_number=lap,
                    lap_time_seconds=102.0 + delta, baseline_lap_time_seconds=102.0,
                    tire_stint_age=18, tire_compound="SOFT",
                ),
            )
        self.assertEqual(result.temporal_window_size, 2)
        self.assertEqual(result.radio_analysis.driver_state.trend, "RISING")
        self.assertEqual(result.risk_assessment.trend, "RISING")


if __name__ == "__main__":
    unittest.main()
