import io
import math
import struct
import unittest
import wave
from unittest.mock import patch

from app.ai.huggingface_pipeline import HuggingFaceAudioPipeline


class HuggingFaceAudioPipelineTests(unittest.TestCase):
    METADATA = {
        "session_id": "session-test",
        "lap_id": "lap-42",
        "radio_event_id": "radio-42-a",
        "lap_number": 42,
        "timestamp": "2026-08-13T14:40:59Z",
    }
    @staticmethod
    def wav_fixture() -> bytes:
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as audio:
            audio.setparams((1, 2, 16000, 0, "NONE", "not compressed"))
            audio.writeframes(
                b"".join(
                    struct.pack("<h", int(3000 * math.sin(2 * math.pi * 440 * i / 16000)))
                    for i in range(16000)
                )
            )
        return buffer.getvalue()

    def test_audio_becomes_transcript_and_driver_state(self) -> None:
        def fake_asr(model_input):
            self.assertEqual(model_input["sampling_rate"], 16000)
            self.assertGreater(model_input["raw"].size, 0)
            return {"text": "Rear tyres are completely gone. Box this lap."}

        def fake_emotion(model_input, top_k=None):
            self.assertEqual(model_input["sampling_rate"], 16000)
            self.assertIsNone(top_k)
            return [
                {"label": "ang", "score": 0.82},
                {"label": "neu", "score": 0.12},
                {"label": "sad", "score": 0.06},
            ]

        pipeline = HuggingFaceAudioPipeline(fake_asr, fake_emotion)
        result = pipeline.analyze(self.wav_fixture(), **self.METADATA)

        self.assertEqual(result.transcript, "Rear tyres are completely gone. Box this lap.")
        self.assertEqual(result.driver_state.label, "CRITICAL")
        self.assertGreaterEqual(result.vocal_stress_score, 80)
        self.assertEqual(result.intents[0].label, "URGENT_REQUEST")
        self.assertIn("TYRE_COMPLAINT", {intent.label for intent in result.intents})

    def test_neutral_voice_maps_to_calm(self) -> None:
        pipeline = HuggingFaceAudioPipeline(
            lambda _: {"text": "Balance is good, we can keep this pace."},
            lambda _, top_k=None: [
                {"label": "neu", "score": 0.92},
                {"label": "hap", "score": 0.08},
            ],
        )

        result = pipeline.analyze(self.wav_fixture(), **self.METADATA)

        self.assertEqual(result.driver_state.label, "CALM")
        self.assertLess(result.driver_state.stress_score, 30)

    def test_acoustic_fallback_requires_no_emotion_model(self) -> None:
        pipeline = HuggingFaceAudioPipeline(
            lambda _: {"text": "Rear is moving around on traction."}
        )

        result = pipeline.analyze(self.wav_fixture(), **self.METADATA)

        self.assertEqual(result.models.vocal_state, "librosa/acoustic-features-v1")
        self.assertEqual(len(result.audio_emotions), 2)
        self.assertGreaterEqual(result.vocal_stress_score, 0)
        self.assertLessEqual(result.vocal_stress_score, 100)

    def test_low_confidence_state_is_reported_as_uncertain(self) -> None:
        pipeline = HuggingFaceAudioPipeline(
            lambda _: {"text": "Everything feels normal and stable."}
        )
        result = pipeline.analyze(self.wav_fixture(), **self.METADATA)
        if result.confidence < 0.70:
            self.assertEqual(result.driver_state.label, "UNCERTAIN")

    def test_download_timeout_must_be_positive(self) -> None:
        with patch.dict("os.environ", {"HF_MODEL_DOWNLOAD_TIMEOUT_SECONDS": "0"}):
            with self.assertRaisesRegex(Exception, "must be greater than zero"):
                HuggingFaceAudioPipeline._positive_timeout(
                    "HF_MODEL_DOWNLOAD_TIMEOUT_SECONDS", 120
                )
        self.assertEqual(HuggingFaceAudioPipeline._hub_timeout_value(120.0), "120")
        self.assertEqual(HuggingFaceAudioPipeline._hub_timeout_value(0.5), "1")

    def test_versioned_intent_rules_reward_specific_and_corroborating_language(self) -> None:
        single = HuggingFaceAudioPipeline._detect_intents("Tyre temperatures are dropping")
        corroborated = HuggingFaceAudioPipeline._detect_intents(
            "The tyre is gone, box this lap immediately"
        )
        self.assertEqual(HuggingFaceAudioPipeline.CLASSIFIER_VERSION, "revora-racing-language-rules-v2")
        tyre_single = next(item for item in single if item.label == "TYRE_COMPLAINT")
        urgent = next(item for item in corroborated if item.label == "URGENT_REQUEST")
        self.assertEqual(tyre_single.confidence, 0.70)
        self.assertGreaterEqual(urgent.confidence, 0.92)


if __name__ == "__main__":
    unittest.main()
