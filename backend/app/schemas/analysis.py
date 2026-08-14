from enum import StrEnum

from pydantic import BaseModel, Field


class DriverStateLabel(StrEnum):
    UNCERTAIN = "UNCERTAIN"
    CALM = "CALM"
    FOCUSED = "FOCUSED"
    STRESSED = "STRESSED"
    CRITICAL = "CRITICAL"


class RacingIntentLabel(StrEnum):
    TYRE_COMPLAINT = "TYRE_COMPLAINT"
    GRIP_ISSUE = "GRIP_ISSUE"
    HANDLING_CONCERN = "HANDLING_CONCERN"
    PERFORMANCE_DIFFICULTY = "PERFORMANCE_DIFFICULTY"
    URGENT_REQUEST = "URGENT_REQUEST"
    STRATEGY_FRUSTRATION = "STRATEGY_FRUSTRATION"


class TrendLabel(StrEnum):
    STABLE = "STABLE"
    RISING = "RISING"
    FALLING = "FALLING"


class ModelLifecycleState(StrEnum):
    LOADING = "loading"
    READY = "ready"
    FAILED = "failed"
    UNAVAILABLE = "unavailable"


class DriverStateResult(BaseModel):
    label: DriverStateLabel
    stress_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    trend: TrendLabel = TrendLabel.STABLE


class RacingIntentResult(BaseModel):
    label: RacingIntentLabel
    confidence: float = Field(ge=0, le=1)
    evidence: str


class AudioEmotion(BaseModel):
    label: str
    score: float = Field(ge=0, le=1)


class ModelMetadata(BaseModel):
    speech_to_text: str
    vocal_state: str
    source: str = "Hugging Face Hub"
    classifier_version: str | None = None


class RadioAnalysisResponse(BaseModel):
    session_id: str
    lap_id: str
    radio_event_id: str
    lap_number: int
    timestamp: str
    transcript: str
    driver_state: DriverStateResult
    vocal_stress_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    intents: list[RacingIntentResult]
    audio_emotions: list[AudioEmotion]
    models: ModelMetadata


class ModelStatusResponse(BaseModel):
    state: ModelLifecycleState
    loaded: bool
    speech_to_text: str
    vocal_state: str
    detail: str | None = None
