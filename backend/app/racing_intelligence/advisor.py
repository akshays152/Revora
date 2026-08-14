from app.risk_engine.calculator import RiskEngine
from app.schemas.analysis import DriverStateLabel, RacingIntentLabel
from app.schemas.racing_intelligence import (
    ActionUrgency,
    AlertItemSchema,
    IntelligenceRequest,
    IntelligenceResponse,
    PitRecommendation,
)
from app.schemas.risk_engine import RiskAssessmentRequest, RiskLevel


class RacingIntelligenceAdvisor:
    """Turn driver state signals + telemetry + risk assessment into explainable racing intelligence."""

    def __init__(self) -> None:
        self.risk_engine = RiskEngine()

    def analyze(self, request: IntelligenceRequest) -> IntelligenceResponse:
        # If risk assessment is not supplied, evaluate using RiskEngine
        if request.risk_assessment is not None:
            risk = request.risk_assessment
        else:
            risk = self.risk_engine.evaluate(
                RiskAssessmentRequest(
                    driver_state=request.driver_state,
                    vocal_stress_score=request.vocal_stress_score,
                    intents=request.intents,
                    telemetry=request.telemetry,
                )
            )

        intent_labels = {i.label for i in request.intents}
        lap_delta = request.telemetry.lap_delta or 0.0  # positive = slower than reference

        # Determine pit recommendation
        if risk.risk_level == RiskLevel.CRITICAL or (
            RacingIntentLabel.TYRE_COMPLAINT in intent_labels and lap_delta >= 1.2
        ) or (RacingIntentLabel.URGENT_REQUEST in intent_labels and risk.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)):
            recommendation = PitRecommendation(
                action="BOX THIS LAP",
                recommended_compound="HARD",
                urgency=ActionUrgency.IMMEDIATE,
                pit_window_open=True,
                estimated_time_loss_sec=21.8,
            )
            summary = "Critical driver stress and severe pace loss converge. Immediate pit stop recommended."
            radio_advisory = "Box this lap, Box this lap. Pitting for Hard compound."
        elif risk.risk_level == RiskLevel.HIGH or (
            (RacingIntentLabel.GRIP_ISSUE in intent_labels or RacingIntentLabel.HANDLING_CONCERN in intent_labels)
            and lap_delta >= 0.6
        ):
            recommendation = PitRecommendation(
                action="PREPARE PIT WINDOW",
                recommended_compound="HARD",
                urgency=ActionUrgency.HIGH,
                pit_window_open=True,
                estimated_time_loss_sec=22.0,
            )
            summary = "Tyre degradation and grip issues escalating. Prepare pit crew for next 2 laps."
            radio_advisory = "Copy radio. Pit window is open, box in 1 lap. Focus on entry stability."
        elif request.vocal_stress_score >= 50:
            recommendation = PitRecommendation(
                action="ADJUST BIAS & CALM DRIVER",
                recommended_compound="MEDIUM",
                urgency=ActionUrgency.MEDIUM,
                pit_window_open=False,
                estimated_time_loss_sec=0.0,
            )
            summary = "Driver stress elevated despite acceptable pace. Recommend car adjustments."
            radio_advisory = "Copy. Adjust brake bias +1 forward and manage rear tyre slip."
        else:
            recommendation = PitRecommendation(
                action="MAINTAIN PACE & STINT",
                recommended_compound="MEDIUM",
                urgency=ActionUrgency.LOW,
                pit_window_open=False,
                estimated_time_loss_sec=0.0,
            )
            summary = "Driver state calm and pace within nominal window. Continue current stint."
            radio_advisory = "Copy, balance looks good. Keep building stint gap."

        # Build alerts
        alerts: list[AlertItemSchema] = []
        if risk.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
            alerts.append(
                AlertItemSchema(
                    level=risk.risk_level,
                    title="Driver Stress Threshold Exceeded",
                    detail=f"Driver state is {request.driver_state.value} with vocal stress at {request.vocal_stress_score}%.",
                    lap=request.telemetry.lap_number,
                    time="LIVE",
                )
            )

        if lap_delta >= 1.0 and any(i in intent_labels for i in (RacingIntentLabel.TYRE_COMPLAINT, RacingIntentLabel.GRIP_ISSUE)):
            alerts.append(
                AlertItemSchema(
                    level=RiskLevel.HIGH,
                    title="Tyre Degradation Pattern",
                    detail=f"Lap time degraded by +{lap_delta:.2f}s with driver complaints.",
                    lap=request.telemetry.lap_number,
                    time="LIVE",
                )
            )

        # Build evidence/reasons list
        reasons: list[str] = list(risk.reasons)
        reasons.append(f"AI Risk Score: {risk.risk_score}/100 ({risk.risk_level.value})")

        return IntelligenceResponse(
            session_id=request.session_id or request.telemetry.session_id,
            lap_id=request.lap_id or request.telemetry.lap_id,
            radio_event_id=request.radio_event_id,
            summary=summary,
            recommendation=recommendation,
            reasons=reasons,
            alerts=alerts,
            radio_advisory=radio_advisory,
        )
