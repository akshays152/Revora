from pydantic import BaseModel

from app.schemas.analysis import RadioAnalysisResponse
from app.schemas.racing_intelligence import IntelligenceResponse
from app.schemas.risk_engine import RiskAssessmentResponse
from app.schemas.risk_engine import TelemetrySnapshot


class OrchestrationResponse(BaseModel):
    radio_analysis: RadioAnalysisResponse
    risk_assessment: RiskAssessmentResponse
    racing_intelligence: IntelligenceResponse
    telemetry: TelemetrySnapshot
    temporal_window_size: int
