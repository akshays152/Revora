from collections import defaultdict, deque
from threading import Lock

from app.racing_intelligence.advisor import RacingIntelligenceAdvisor
from app.risk_engine.calculator import RiskEngine
from app.schemas.analysis import RadioAnalysisResponse, TrendLabel
from app.schemas.orchestration import OrchestrationResponse
from app.schemas.racing_intelligence import IntelligenceRequest
from app.schemas.risk_engine import RiskAssessmentRequest, TelemetrySnapshot


class AnalysisOrchestrator:
    """Combines one bound radio event with telemetry and rolling session history."""

    def __init__(self, window_size: int = 5) -> None:
        self.window_size = window_size
        self._history: dict[str, deque[tuple[int, int]]] = defaultdict(
            lambda: deque(maxlen=window_size)
        )
        self._lock = Lock()
        self.risk_engine = RiskEngine()
        self.advisor = RacingIntelligenceAdvisor()

    @staticmethod
    def _trend(previous: list[int], current: int) -> TrendLabel:
        if not previous:
            return TrendLabel.STABLE
        change = current - previous[0]
        return TrendLabel.RISING if change >= 5 else TrendLabel.FALLING if change <= -5 else TrendLabel.STABLE

    def evaluate(
        self, radio: RadioAnalysisResponse, telemetry: TelemetrySnapshot
    ) -> OrchestrationResponse:
        if (radio.session_id, radio.lap_id) != (telemetry.session_id, telemetry.lap_id):
            raise ValueError("Radio and telemetry identifiers must refer to the same session and lap.")

        with self._lock:
            history = list(self._history[radio.session_id])

        stress_history = [stress for stress, _ in history]
        risk_history = [risk for _, risk in history]
        driver_trend = self._trend(stress_history, radio.driver_state.stress_score)
        radio = radio.model_copy(
            update={"driver_state": radio.driver_state.model_copy(update={"trend": driver_trend})}
        )

        risk = self.risk_engine.evaluate(
            RiskAssessmentRequest(
                driver_state=radio.driver_state.label,
                vocal_stress_score=radio.vocal_stress_score,
                confidence=radio.confidence,
                intents=radio.intents,
                telemetry=telemetry,
                previous_risk_scores=risk_history,
            )
        )
        intelligence = self.advisor.analyze(
            IntelligenceRequest(
                session_id=radio.session_id,
                lap_id=radio.lap_id,
                radio_event_id=radio.radio_event_id,
                driver_state=radio.driver_state.label,
                vocal_stress_score=radio.vocal_stress_score,
                confidence=radio.confidence,
                intents=radio.intents,
                telemetry=telemetry,
                risk_assessment=risk,
            )
        )

        with self._lock:
            self._history[radio.session_id].append(
                (radio.driver_state.stress_score, risk.risk_score)
            )
            size = len(self._history[radio.session_id])

        return OrchestrationResponse(
            radio_analysis=radio,
            risk_assessment=risk,
            racing_intelligence=intelligence,
            telemetry=telemetry,
            temporal_window_size=size,
        )
