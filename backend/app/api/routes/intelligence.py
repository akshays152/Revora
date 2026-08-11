from fastapi import APIRouter

from app.racing_intelligence.advisor import RacingIntelligenceAdvisor
from app.schemas.racing_intelligence import IntelligenceRequest, IntelligenceResponse

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
advisor = RacingIntelligenceAdvisor()


@router.post("/analyze", response_model=IntelligenceResponse)
async def analyze_intelligence(request: IntelligenceRequest) -> IntelligenceResponse:
    """Turn driver state signals + telemetry + risk assessment into strategy recommendations & alerts."""
    return advisor.analyze(request)
