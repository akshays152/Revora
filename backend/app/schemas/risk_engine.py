from enum import StrEnum
from pydantic import BaseModel, Field

from app.schemas.analysis import DriverStateLabel, RacingIntentLabel, RacingIntentResult


class RiskLevel(StrEnum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskTrend(StrEnum):
    STABLE = "STABLE"
    RISING = "RISING"
    FALLING = "FALLING"


class TelemetrySnapshot(BaseModel):
    lap_number: int = Field(default=42, ge=1)
    lap_time_seconds: float = Field(default=103.821, gt=0)
    baseline_lap_time_seconds: float = Field(default=102.000, gt=0)
    # Convention: positive lap_delta (+0.8s) means SLOWER than reference pace
    lap_delta: float = Field(default=1.821)
    sector_deltas: list[float] = Field(default_factory=lambda: [0.2, 0.9, 0.721])
    tire_stint_age: int = Field(default=18, ge=0)
    tire_compound: str = Field(default="SOFT")


class RiskAssessmentRequest(BaseModel):
    driver_state: DriverStateLabel = DriverStateLabel.STRESSED
    vocal_stress_score: int = Field(default=62, ge=0, le=100)
    confidence: float = Field(default=0.87, ge=0, le=1)
    intents: list[RacingIntentResult] = Field(default_factory=list)
    telemetry: TelemetrySnapshot = Field(default_factory=TelemetrySnapshot)


class RiskComponents(BaseModel):
    driver_stress_risk: int = Field(ge=0, le=100)
    intent_urgency_risk: int = Field(ge=0, le=100)
    pace_degradation_risk: int = Field(ge=0, le=100)


class RiskAssessmentResponse(BaseModel):
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    trend: RiskTrend = RiskTrend.STABLE
    components: RiskComponents
    reasons: list[str] = Field(default_factory=list)
