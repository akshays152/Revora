import io
import math
import struct
import unittest
import wave

from app.ai.huggingface_pipeline import HuggingFaceAudioPipeline


class HuggingFaceAudioPipelineTests(unittest.TestCase):
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
        result = pipeline.analyze(self.wav_fixture())

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

        result = pipeline.analyze(self.wav_fixture())

        self.assertEqual(result.driver_state.label, "CALM")
        self.assertLess(result.driver_state.stress_score, 30)

    def test_acoustic_fallback_requires_no_emotion_model(self) -> None:
        pipeline = HuggingFaceAudioPipeline(
            lambda _: {"text": "Rear is moving around on traction."}
        )

        result = pipeline.analyze(self.wav_fixture())

        self.assertEqual(result.models.vocal_state, "librosa/acoustic-features-v1")
        self.assertEqual(len(result.audio_emotions), 2)
        self.assertGreaterEqual(result.vocal_stress_score, 0)
        self.assertLessEqual(result.vocal_stress_score, 100)


if __name__ == "__main__":
    unittest.main()
