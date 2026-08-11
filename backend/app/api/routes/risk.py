from fastapi import APIRouter

from app.risk_engine.calculator import RiskEngine
from app.schemas.risk_engine import RiskAssessmentRequest, RiskAssessmentResponse

router = APIRouter(prefix="/risk", tags=["risk"])
risk_engine = RiskEngine()


@router.post("/evaluate", response_model=RiskAssessmentResponse)
async def evaluate_risk(request: RiskAssessmentRequest) -> RiskAssessmentResponse:
    """Evaluates multi-factor driver and session risk score independently."""
    return risk_engine.evaluate(request)
