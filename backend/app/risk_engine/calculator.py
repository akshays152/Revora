from app.schemas.analysis import DriverStateLabel, RacingIntentLabel
from app.schemas.risk_engine import (
    RiskAssessmentRequest,
    RiskAssessmentResponse,
    RiskComponents,
    RiskLevel,
    RiskTrend,
    TelemetrySnapshot,
)

DRIVER_STATE_WEIGHTS: dict[DriverStateLabel, int] = {
    DriverStateLabel.CALM: 15,
    DriverStateLabel.FOCUSED: 35,
    DriverStateLabel.STRESSED: 65,
    DriverStateLabel.CRITICAL: 95,
}

INTENT_URGENCY_WEIGHTS: dict[RacingIntentLabel, int] = {
    RacingIntentLabel.URGENT_REQUEST: 90,
    RacingIntentLabel.STRATEGY_FRUSTRATION: 75,
    RacingIntentLabel.TYRE_COMPLAINT: 70,
    RacingIntentLabel.HANDLING_CONCERN: 60,
    RacingIntentLabel.GRIP_ISSUE: 50,
    RacingIntentLabel.PERFORMANCE_DIFFICULTY: 45,
}


class RiskEngine:
    """Calculates multi-factor driver and session risk score based on audio signals & telemetry."""

    @staticmethod
    def _calc_driver_stress_risk(vocal_stress: int, driver_state: DriverStateLabel) -> int:
        state_weight = DRIVER_STATE_WEIGHTS.get(driver_state, 30)
        # 60% vocal stress + 40% driver state label weight
        score = int(0.60 * vocal_stress + 0.40 * state_weight)
        return min(100, max(0, score))

    @staticmethod
    def _calc_intent_urgency_risk(intents: list) -> int:
        if not intents:
            return 0
        weights = [INTENT_URGENCY_WEIGHTS.get(i.label, 30) for i in intents]
        max_weight = max(weights)
        # Small boost (+5) for multiple active racing complaints
        modifier = min(10, (len(intents) - 1) * 5)
        return min(100, max(0, max_weight + modifier))

    @staticmethod
    def _calc_pace_degradation_risk(telemetry: TelemetrySnapshot) -> int:
        # positive lap_delta means driver is SLOWER than reference pace
        delta = telemetry.lap_delta
        if delta is None or telemetry.telemetry_source == "UNAVAILABLE":
            return 0
        if delta >= 2.0:
            base_risk = 95
        elif delta >= 1.5:
            base_risk = 80
        elif delta >= 1.0:
            base_risk = 65
        elif delta >= 0.5:
            base_risk = 45
        elif delta >= 0.2:
            base_risk = 30
        elif delta >= 0.0:
            base_risk = 20
        else:
            # Driver is faster than reference baseline
            base_risk = 10

        # Adjust slightly for high tire stint age (> 15 laps)
        stint_extra = min(15, max(0, (telemetry.tire_stint_age - 15) * 2))
        return min(100, max(0, base_risk + stint_extra))

    def evaluate(self, request: RiskAssessmentRequest) -> RiskAssessmentResponse:
        stress_risk = self._calc_driver_stress_risk(
            request.vocal_stress_score, request.driver_state)
        intent_risk = self._calc_intent_urgency_risk(request.intents)
        pace_risk = (
            self._calc_pace_degradation_risk(request.telemetry)
            if request.telemetry.telemetry_source != "UNAVAILABLE"
            else 0
        )

        # Composite weighting: Driver Stress (40%), Intent Urgency (35%), Pace Degradation (25%)
        composite_score = int(0.40 * stress_risk + 0.35 *
                              intent_risk + 0.25 * pace_risk)
        composite_score = min(100, max(0, composite_score))

        # Risk level categorization
        if composite_score >= 75:
            level = RiskLevel.CRITICAL
        elif composite_score >= 55:
            level = RiskLevel.HIGH
        elif composite_score >= 30:
            level = RiskLevel.MODERATE
        else:
            level = RiskLevel.LOW

        # Trend calculation
        if composite_score >= 55 or (
            request.telemetry.telemetry_source != "UNAVAILABLE"
            and request.telemetry.lap_delta is not None
            and request.telemetry.lap_delta >= 1.0
        ):
            trend = RiskTrend.RISING
        elif composite_score < 25 and request.driver_state == DriverStateLabel.CALM:
            trend = RiskTrend.FALLING
        else:
            trend = RiskTrend.STABLE

        reasons: list[str] = []
        reasons.append(
            f"Vocal stress signal at {request.vocal_stress_score}% (state: {request.driver_state.value})")
        if request.telemetry.telemetry_source == "UNAVAILABLE":
            reasons.append("Live telemetry unavailable; pace degradation excluded")
        elif request.telemetry.lap_delta is not None and request.telemetry.lap_delta > 0:
            reasons.append(
                f"Pace degraded by +{request.telemetry.lap_delta:.2f}s compared to baseline")
        elif request.telemetry.lap_delta is not None and request.telemetry.lap_delta < 0:
            reasons.append(
                f"Pace holding strong at {request.telemetry.lap_delta:.2f}s ahead of baseline")

        for intent in request.intents:
            reasons.append(
                f"Racing intent '{intent.label.value.replace('_', ' ')}' matched ({intent.evidence})")

        return RiskAssessmentResponse(
            session_id=request.telemetry.session_id,
            lap_id=request.telemetry.lap_id,
            lap_number=request.telemetry.lap_number,
            telemetry_source=request.telemetry.telemetry_source,
            lap_delta_seconds=request.telemetry.lap_delta,
            delta_was_corrected=request.telemetry.delta_was_corrected,
            risk_score=composite_score,
            risk_level=level,
            trend=trend,
            components=RiskComponents(
                driver_stress_risk=stress_risk,
                intent_urgency_risk=intent_risk,
                pace_degradation_risk=pace_risk,
            ),
            reasons=reasons,
        )
