from __future__ import annotations

import os
import re
import tempfile
from math import ceil
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any, Callable

from app.schemas.analysis import (
    AudioEmotion,
    DriverStateLabel,
    DriverStateResult,
    ModelMetadata,
    ModelLifecycleState,
    RadioAnalysisResponse,
    RacingIntentLabel,
    RacingIntentResult,
)


class PipelineConfigurationError(RuntimeError):
    """Raised when the local Hugging Face runtime cannot be initialized."""


class PipelineInferenceError(RuntimeError):
    """Raised when a model cannot analyze an uploaded audio clip."""


@dataclass(frozen=True)
class IntentRule:
    label: RacingIntentLabel
    terms: tuple[str, ...]
    base_confidence: float


class HuggingFaceAudioPipeline:
    """Local Hugging Face transcription plus dependable vocal-state features.

    Whisper is the required Hugging Face component. Vocal state defaults to
    real acoustic features so one unavailable optional model cannot block the
    complete pipeline. A Hub emotion model can be explicitly enabled.
    """

    STRESS_WEIGHTS = {
        "ang": 1.0,
        "angry": 1.0,
        "anger": 1.0,
        "fear": 0.88,
        "fearful": 0.88,
        "disgust": 0.76,
        "sad": 0.58,
        "sadness": 0.58,
        "surprise": 0.52,
        "surprised": 0.52,
        "hap": 0.14,
        "happy": 0.14,
        "happiness": 0.14,
        "neu": 0.08,
        "neutral": 0.08,
    }

    INTENT_RULES: tuple[IntentRule, ...] = (
        IntentRule(RacingIntentLabel.URGENT_REQUEST, ("box this lap", "box now", "urgent", "immediately", "stop the car"), 0.82),
        IntentRule(RacingIntentLabel.STRATEGY_FRUSTRATION, ("why are we", "strategy", "too late", "should have", "still on"), 0.66),
        IntentRule(RacingIntentLabel.TYRE_COMPLAINT, ("tyre", "tire", "fronts are gone", "rears are gone"), 0.70),
        IntentRule(RacingIntentLabel.GRIP_ISSUE, ("grip", "sliding", "traction", "no rear", "no front"), 0.72),
        IntentRule(RacingIntentLabel.HANDLING_CONCERN, ("understeer", "oversteer", "balance", "can't control", "cannot control", "moving around"), 0.72),
        IntentRule(RacingIntentLabel.PERFORMANCE_DIFFICULTY, ("losing time", "slow", "pace", "struggling", "difficult"), 0.64),
    )

    TEXT_STRESS_TERMS = (
        "gone",
        "can't",
        "cannot",
        "no grip",
        "sliding",
        "struggling",
        "urgent",
        "box now",
        "box this lap",
        "stop the car",
    )
    CLASSIFIER_VERSION = "revora-racing-language-rules-v2"

    def __init__(
        self,
        asr_pipeline: Callable[[Any], Any] | None = None,
        emotion_pipeline: Callable[[Any], Any] | None = None,
    ) -> None:
        self.asr_model = os.getenv("HF_ASR_MODEL", "openai/whisper-base.en")
        self.audio_model = os.getenv("HF_AUDIO_MODEL", "superb/wav2vec2-base-superb-er")
        self.use_audio_model = (
            emotion_pipeline is not None or os.getenv("HF_ENABLE_AUDIO_MODEL", "0") == "1"
        )
        self._asr = asr_pipeline
        self._emotion = emotion_pipeline
        self._load_lock = Lock()
        self.state = ModelLifecycleState.READY if self.loaded else ModelLifecycleState.UNAVAILABLE
        self.state_detail: str | None = None

    @property
    def loaded(self) -> bool:
        return self._asr is not None and (
            not self.use_audio_model or self._emotion is not None
        )

    @property
    def vocal_state_name(self) -> str:
        if self.use_audio_model:
            return self.audio_model
        return "librosa/acoustic-features-v1"

    def _ensure_loaded(self) -> None:
        if self.loaded:
            return
        with self._load_lock:
            if self.loaded:
                return
            self.state = ModelLifecycleState.LOADING
            self.state_detail = None
            try:
                download_timeout = self._positive_timeout(
                    "HF_MODEL_DOWNLOAD_TIMEOUT_SECONDS", 120.0
                )
                # huggingface_hub applies these values to metadata and file HTTP
                # requests. They must be set before importing the Hub module.
                hub_timeout = self._hub_timeout_value(download_timeout)
                os.environ["HF_HUB_ETAG_TIMEOUT"] = hub_timeout
                os.environ["HF_HUB_DOWNLOAD_TIMEOUT"] = hub_timeout
                from huggingface_hub import snapshot_download
                from transformers import pipeline

                device = int(os.getenv("HF_DEVICE", "-1"))
                token = os.getenv("HF_TOKEN") or None
                common: dict[str, Any] = {"device": device}
                if token:
                    common["token"] = token
                asr_model_ref = self._resolve_snapshot(
                    snapshot_download, self.asr_model, token
                )
                self._asr = pipeline(
                    "automatic-speech-recognition",
                    model=asr_model_ref,
                    **common,
                )
                if self.use_audio_model and self._emotion is None:
                    audio_model_ref = self._resolve_snapshot(
                        snapshot_download, self.audio_model, token
                    )
                    self._emotion = pipeline(
                        "audio-classification",
                        model=audio_model_ref,
                        **common,
                    )
                self.state = ModelLifecycleState.READY
            except Exception as exc:  # dependency/model errors need a clear API response
                self.state = ModelLifecycleState.FAILED
                timeout = os.getenv("HF_MODEL_DOWNLOAD_TIMEOUT_SECONDS", "120")
                self.state_detail = (
                    "Speech model initialization failed. Check model access, free disk "
                    f"space, and network connectivity; download request timeout is {timeout}s."
                )
                raise PipelineConfigurationError(
                    "Could not load the Hugging Face speech model. Install backend "
                    "requirements, ensure Hugging Face is reachable, optionally set HF_TOKEN, "
                    "and adjust HF_MODEL_DOWNLOAD_TIMEOUT_SECONDS for slow networks."
                ) from exc

    @staticmethod
    def _positive_timeout(name: str, default: float) -> float:
        raw = os.getenv(name, str(default))
        try:
            value = float(raw)
        except ValueError as exc:
            raise PipelineConfigurationError(f"{name} must be a number greater than zero.") from exc
        if value <= 0:
            raise PipelineConfigurationError(f"{name} must be greater than zero.")
        return value

    @staticmethod
    def _hub_timeout_value(timeout: float) -> str:
        """Return the positive integer string required by huggingface_hub."""
        return str(max(1, ceil(timeout)))

    @staticmethod
    def _resolve_snapshot(snapshot_download: Callable[..., str], model_id: str, token: str | None) -> str:
        options: dict[str, Any] = {"repo_id": model_id}
        if token:
            options["token"] = token
        try:
            return snapshot_download(local_files_only=True, **options)
        except Exception:
            return snapshot_download(local_files_only=False, **options)

    def analyze(
        self,
        audio: bytes,
        suffix: str = ".wav",
        *,
        session_id: str,
        lap_id: str,
        radio_event_id: str,
        lap_number: int,
        timestamp: str,
    ) -> RadioAnalysisResponse:
        self._ensure_loaded()
        assert self._asr is not None

        temp_path = ""
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temp_audio:
                temp_audio.write(audio)
                temp_path = temp_audio.name

            samples, sample_rate = self._decode_audio(temp_path)
            model_input = {"raw": samples, "sampling_rate": sample_rate}
            asr_result = self._asr(model_input)
            emotion_result = (
                self._emotion(model_input, top_k=None)
                if self._emotion is not None
                else None
            )
        except Exception as exc:
            raise PipelineInferenceError(
                "The audio models could not decode this clip. Use a short WAV, MP3, "
                "FLAC, M4A, or OGG speech recording."
            ) from exc
        finally:
            if temp_path:
                Path(temp_path).unlink(missing_ok=True)

        transcript = self._extract_transcript(asr_result)
        if emotion_result is not None:
            emotions = self._normalize_emotions(emotion_result)
            vocal_stress = self._stress_score(emotions)
            confidence = max((emotion.score for emotion in emotions), default=0.0)
        else:
            emotions, vocal_stress, confidence = self._acoustic_state(
                samples, sample_rate
            )
        text_stress = self._text_stress_score(transcript)
        combined_stress = round((vocal_stress * 0.85) + (text_stress * 0.15))
        intents = self._detect_intents(transcript)

        return RadioAnalysisResponse(
            session_id=session_id,
            lap_id=lap_id,
            radio_event_id=radio_event_id,
            lap_number=lap_number,
            timestamp=timestamp,
            transcript=transcript,
            driver_state=DriverStateResult(
                label=(
                    self._state_for_score(combined_stress)
                    if confidence >= 0.70
                    else DriverStateLabel.UNCERTAIN
                ),
                stress_score=combined_stress,
                confidence=round(confidence, 4),
            ),
            vocal_stress_score=vocal_stress,
            confidence=round(confidence, 4),
            intents=intents,
            audio_emotions=emotions,
            models=ModelMetadata(
                speech_to_text=self.asr_model,
                vocal_state=self.vocal_state_name,
                classifier_version=self.CLASSIFIER_VERSION,
            ),
        )

    @staticmethod
    def _decode_audio(path: str) -> tuple[Any, int]:
        import librosa

        samples, sample_rate = librosa.load(path, sr=16000, mono=True)
        if samples.size == 0:
            raise PipelineInferenceError("The uploaded audio clip contains no samples.")
        return samples.astype("float32"), int(sample_rate)

    @staticmethod
    def _acoustic_state(samples: Any, sample_rate: int) -> tuple[list[AudioEmotion], int, float]:
        import librosa
        import numpy as np

        rms = float(np.sqrt(np.mean(np.square(samples))))
        rms_db = float(librosa.amplitude_to_db(np.asarray([max(rms, 1e-8)]), ref=1.0)[0])
        zero_crossing = float(np.mean(librosa.feature.zero_crossing_rate(y=samples)))
        centroid = float(
            np.mean(librosa.feature.spectral_centroid(y=samples, sr=sample_rate))
        )

        energy_score = float(np.clip((rms_db + 45.0) / 35.0, 0.0, 1.0))
        crossing_score = float(np.clip(zero_crossing / 0.18, 0.0, 1.0))
        centroid_score = float(np.clip(centroid / 4000.0, 0.0, 1.0))
        stress_probability = float(
            np.clip(
                (0.50 * energy_score)
                + (0.30 * crossing_score)
                + (0.20 * centroid_score),
                0.0,
                1.0,
            )
        )
        stress_score = round(stress_probability * 100)
        confidence = float(
            np.clip(0.55 + (abs(stress_probability - 0.5) * 0.7), 0.55, 0.9)
        )
        emotions = [
            AudioEmotion(label="acoustic_stress", score=stress_probability),
            AudioEmotion(label="acoustic_calm", score=1.0 - stress_probability),
        ]
        return sorted(emotions, key=lambda item: item.score, reverse=True), stress_score, confidence

    @staticmethod
    def _extract_transcript(result: Any) -> str:
        if isinstance(result, str):
            transcript = result
        elif isinstance(result, dict):
            transcript = str(result.get("text", ""))
        else:
            transcript = str(getattr(result, "text", ""))
        transcript = re.sub(r"\s+", " ", transcript).strip()
        if not transcript:
            raise PipelineInferenceError("No speech was detected in the uploaded clip.")
        return transcript

    @staticmethod
    def _normalize_emotions(result: Any) -> list[AudioEmotion]:
        if isinstance(result, dict):
            result = [result]
        emotions: list[AudioEmotion] = []
        for item in result or []:
            if isinstance(item, dict):
                label, score = item.get("label", "unknown"), item.get("score", 0)
            else:
                label, score = getattr(item, "label", "unknown"), getattr(item, "score", 0)
            emotions.append(AudioEmotion(label=str(label), score=max(0.0, min(1.0, float(score)))))
        return sorted(emotions, key=lambda item: item.score, reverse=True)

    @classmethod
    def _stress_score(cls, emotions: list[AudioEmotion]) -> int:
        total = sum(item.score for item in emotions) or 1.0
        weighted = 0.0
        for item in emotions:
            label = item.label.lower().strip()
            weight = cls.STRESS_WEIGHTS.get(label, 0.45)
            weighted += item.score * weight
        return max(0, min(100, round((weighted / total) * 100)))

    @classmethod
    def _text_stress_score(cls, transcript: str) -> int:
        lowered = transcript.lower()
        matches = sum(term in lowered for term in cls.TEXT_STRESS_TERMS)
        exclamations = min(transcript.count("!"), 2)
        return min(100, 18 + (matches * 16) + (exclamations * 7))

    @classmethod
    def _detect_intents(cls, transcript: str) -> list[RacingIntentResult]:
        lowered = transcript.lower()
        results: list[RacingIntentResult] = []
        for rule in cls.INTENT_RULES:
            matches = [term for term in rule.terms if term in lowered]
            if matches:
                evidence = max(matches, key=len)
                corroboration = min(0.12, (len(matches) - 1) * 0.06)
                phrase_specificity = 0.04 if " " in evidence else 0.0
                confidence = min(0.95, rule.base_confidence + corroboration + phrase_specificity)
                results.append(
                    RacingIntentResult(
                        label=rule.label,
                        confidence=round(confidence, 2),
                        evidence=evidence,
                    )
                )
        return results

    @staticmethod
    def _state_for_score(score: int) -> DriverStateLabel:
        if score < 30:
            return DriverStateLabel.CALM
        if score < 50:
            return DriverStateLabel.FOCUSED
        if score < 75:
            return DriverStateLabel.STRESSED
        return DriverStateLabel.CRITICAL
