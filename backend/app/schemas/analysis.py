from enum import StrEnum

from pydantic import BaseModel, Field


class DriverStateLabel(StrEnum):
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


class DriverStateResult(BaseModel):
    label: DriverStateLabel
    stress_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    trend: str = "STABLE"


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


class RadioAnalysisResponse(BaseModel):
    transcript: str
    driver_state: DriverStateResult
    vocal_stress_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    intents: list[RacingIntentResult]
    audio_emotions: list[AudioEmotion]
    models: ModelMetadata


class ModelStatusResponse(BaseModel):
    loaded: bool
    speech_to_text: str
    vocal_state: str
