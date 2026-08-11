import unittest

from app.risk_engine.calculator import RiskEngine
from app.schemas.analysis import DriverStateLabel, RacingIntentLabel, RacingIntentResult
from app.schemas.risk_engine import RiskAssessmentRequest, RiskLevel, RiskTrend, TelemetrySnapshot


class RiskEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = RiskEngine()

    def test_calm_driver_with_good_pace_results_in_low_risk(self) -> None:
        request = RiskAssessmentRequest(
            driver_state=DriverStateLabel.CALM,
            vocal_stress_score=15,
            confidence=0.95,
            intents=[],
            telemetry=TelemetrySnapshot(
                lap_number=31,
                lap_delta=-0.4,  # Faster than baseline
                tire_stint_age=5,
            ),
        )
        result = self.engine.evaluate(request)
        self.assertEqual(result.risk_level, RiskLevel.LOW)
        self.assertLess(result.risk_score, 30)
        self.assertEqual(result.trend, RiskTrend.FALLING)

    def test_critical_driver_with_severe_degradation_results_in_critical_risk(self) -> None:
        request = RiskAssessmentRequest(
            driver_state=DriverStateLabel.CRITICAL,
            vocal_stress_score=85,
            confidence=0.88,
            intents=[
                RacingIntentResult(
                    label=RacingIntentLabel.URGENT_REQUEST,
                    confidence=0.90,
                    evidence="Box this lap",
                ),
                RacingIntentResult(
                    label=RacingIntentLabel.TYRE_COMPLAINT,
                    confidence=0.85,
                    evidence="Rear tyres are completely gone",
                ),
            ],
            telemetry=TelemetrySnapshot(
                lap_number=42,
                lap_delta=2.1,  # 2.1s slower than baseline
                tire_stint_age=22,
            ),
        )
        result = self.engine.evaluate(request)
        self.assertEqual(result.risk_level, RiskLevel.CRITICAL)
        self.assertGreaterEqual(result.risk_score, 75)
        self.assertEqual(result.trend, RiskTrend.RISING)
        self.assertGreaterEqual(len(result.reasons), 3)

    def test_positive_lap_delta_means_slower_pace(self) -> None:
        request = RiskAssessmentRequest(
            driver_state=DriverStateLabel.STRESSED,
            vocal_stress_score=60,
            intents=[
                RacingIntentResult(
                    label=RacingIntentLabel.GRIP_ISSUE,
                    confidence=0.8,
                    evidence="sliding on exit",
                )
            ],
            telemetry=TelemetrySnapshot(lap_delta=1.5),
        )
        result = self.engine.evaluate(request)
        self.assertIn("Pace degraded by +1.50s", " ".join(result.reasons))
        self.assertGreaterEqual(result.components.pace_degradation_risk, 75)


if __name__ == "__main__":
    unittest.main()
