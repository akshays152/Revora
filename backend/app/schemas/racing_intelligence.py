from enum import StrEnum
from pydantic import BaseModel, Field

from app.schemas.analysis import DriverStateLabel, RacingIntentResult
from app.schemas.risk_engine import RiskAssessmentResponse, RiskLevel, TelemetrySnapshot


class ActionUrgency(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    IMMEDIATE = "IMMEDIATE"


class PitRecommendation(BaseModel):
    action: str = Field(default="MONITOR_PACE", description="Primary strategy action e.g. BOX THIS LAP, MONITOR PACE")
    recommended_compound: str = Field(default="HARD", description="Target tire compound if pitting")
    urgency: ActionUrgency = ActionUrgency.MEDIUM
    pit_window_open: bool = True
    estimated_time_loss_sec: float = Field(default=22.5, description="Pits stop delta time loss")


class AlertItemSchema(BaseModel):
    level: RiskLevel
    title: str
    detail: str
    lap: int
    time: str


class IntelligenceRequest(BaseModel):
    driver_state: DriverStateLabel = DriverStateLabel.STRESSED
    vocal_stress_score: int = Field(default=62, ge=0, le=100)
    intents: list[RacingIntentResult] = Field(default_factory=list)
    telemetry: TelemetrySnapshot = Field(default_factory=TelemetrySnapshot)
    risk_assessment: RiskAssessmentResponse | None = None


class IntelligenceResponse(BaseModel):
    summary: str
    recommendation: PitRecommendation
    reasons: list[str] = Field(default_factory=list)
    alerts: list[AlertItemSchema] = Field(default_factory=list)
    radio_advisory: str = Field(description="Suggested radio message back to driver")
