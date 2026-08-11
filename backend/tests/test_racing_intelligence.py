import unittest

from app.racing_intelligence.advisor import RacingIntelligenceAdvisor
from app.schemas.analysis import DriverStateLabel, RacingIntentLabel, RacingIntentResult
from app.schemas.racing_intelligence import ActionUrgency, IntelligenceRequest
from app.schemas.risk_engine import RiskLevel, TelemetrySnapshot


class RacingIntelligenceAdvisorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.advisor = RacingIntelligenceAdvisor()

    def test_critical_risk_recommends_box_this_lap(self) -> None:
        request = IntelligenceRequest(
            driver_state=DriverStateLabel.CRITICAL,
            vocal_stress_score=82,
            intents=[
                RacingIntentResult(
                    label=RacingIntentLabel.TYRE_COMPLAINT,
                    confidence=0.88,
                    evidence="Rear tyres are completely gone",
                )
            ],
            telemetry=TelemetrySnapshot(
                lap_number=42,
                lap_delta=1.8,  # Slower pace
                tire_stint_age=18,
            ),
        )

        response = self.advisor.analyze(request)
        self.assertEqual(response.recommendation.action, "BOX THIS LAP")
        self.assertEqual(response.recommendation.urgency, ActionUrgency.IMMEDIATE)
        self.assertEqual(response.recommendation.recommended_compound, "HARD")
        self.assertIn("Box this lap", response.radio_advisory)
        self.assertGreaterEqual(len(response.alerts), 1)

    def test_calm_driver_recommends_maintain_pace(self) -> None:
        request = IntelligenceRequest(
            driver_state=DriverStateLabel.CALM,
            vocal_stress_score=20,
            intents=[],
            telemetry=TelemetrySnapshot(
                lap_number=31,
                lap_delta=-0.3,
                tire_stint_age=4,
            ),
        )

        response = self.advisor.analyze(request)
        self.assertEqual(response.recommendation.action, "MAINTAIN PACE & STINT")
        self.assertEqual(response.recommendation.urgency, ActionUrgency.LOW)
        self.assertEqual(len(response.alerts), 0)


if __name__ == "__main__":
    unittest.main()
