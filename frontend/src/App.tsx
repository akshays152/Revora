import { useEffect, useMemo, useState } from "react";
import { AlertPanel } from "./components/AlertPanel";
import { DemoController } from "./components/DemoController";
import { DriverStatePanel } from "./components/DriverStatePanel";
import { InsightPanel } from "./components/InsightPanel";
import { LapDetailPanel } from "./components/LapDetailPanel";
import { PerformanceChart } from "./components/PerformanceChart";
import { PerformancePanel } from "./components/PerformancePanel";
import { RadioPanel } from "./components/RadioPanel";
import { RiskPanel } from "./components/RiskPanel";
import { StateTimeline } from "./components/StateTimeline";
import { TopBar } from "./components/TopBar";
import { demoLaps } from "./mock-data";
import { analyzeIntelligence, evaluateRisk } from "./api";
import type {
  LapSnapshot,
  RadioAnalysisResult,
  RiskAssessmentResult,
  IntelligenceResult,
} from "./types";

function App() {
  const [selectedIndex, setSelectedIndex] = useState(demoLaps.length - 1);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<RadioAnalysisResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceResult | null>(null);
  const handleRadioAnalysis = async (analysis: RadioAnalysisResult) => {
    setLiveAnalysis(analysis);

    const telemetry = {
      lap_number: demoLaps[selectedIndex].lap,
      lap_time_seconds: demoLaps[selectedIndex].lapTimeSeconds,
      baseline_lap_time_seconds:
        demoLaps[selectedIndex].lapTimeSeconds - demoLaps[selectedIndex].lapDelta,
      lap_delta: demoLaps[selectedIndex].lapDelta,
      sector_deltas: [0, 0, 0],
      tire_stint_age: 18,
      tire_compound: "SOFT",
    };

    const request = {
      driver_state: analysis.driver_state.label,
      vocal_stress_score: analysis.vocal_stress_score,
      confidence: analysis.confidence,
      intents: analysis.intents,
      telemetry,
    };

    try {
      const [risk, intelligence] = await Promise.all([
        evaluateRisk(request),
        analyzeIntelligence(request),
      ]);

      setRiskResult(risk);
      setIntelligenceResult(intelligence);
    } catch (error) {
      console.error("Racing intelligence integration failed:", error);
    }
  };

  const selectedLap = useMemo<LapSnapshot>(() => {
    const lap = demoLaps[selectedIndex];
    if (!liveAnalysis) return lap;

    const primaryIntent = liveAnalysis.intents[0];

    return {
      ...lap,
      state: liveAnalysis.driver_state.label,
      stress: liveAnalysis.driver_state.stress_score,
      confidence: Math.round(liveAnalysis.confidence * 100),
      risk: riskResult?.risk_score ?? lap.risk,
      riskLevel: riskResult?.risk_level ?? lap.riskLevel,
      trend: riskResult?.trend ?? liveAnalysis.driver_state.trend,
      transcript: liveAnalysis.transcript,
      intent: primaryIntent?.label ?? "PERFORMANCE_DIFFICULTY",
      intentLabel:
        primaryIntent?.label.replace(/_/g, " ") ?? "NO RACING CONCERN",
      reasons:
        intelligenceResult?.reasons ??
        [
          `Vocal stress signal ${liveAnalysis.vocal_stress_score}%`,
          primaryIntent
            ? `Racing language matched “${primaryIntent.evidence}”`
            : "No racing-specific concern detected",
        ],
    };
  }, [liveAnalysis, riskResult, intelligenceResult, selectedIndex]);

  useEffect(() => {
    if (!isDemoRunning) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => current >= demoLaps.length - 1 ? 0 : current + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isDemoRunning]);

  const timelineLaps = useMemo(() => demoLaps.slice(-5), []);

  const handleSelectLap = (lap: number) => {
  const index = demoLaps.findIndex((item) => item.lap === lap);
  if (index >= 0) {
    setSelectedIndex(index);
    setLiveAnalysis(null);
    setRiskResult(null);
    setIntelligenceResult(null);
  }
};

    return (
    <div className="app-shell min-h-screen">
      <TopBar isDemoRunning={isDemoRunning} currentLap={selectedLap.lap} />

      <main className="dashboard-shell">
        <div className="dashboard-intro">
          <div>
            <div className="eyebrow intro-eyebrow">RACE CONTROL / DRIVER INTELLIGENCE</div>
            <h1>The silent co-driver.</h1>
            <p>Reading the driver before the numbers tell the story.</p>
          </div>

          <div className="intro-meta">
            <span>SESSION HEALTH</span>
            <strong>
              <i className="status-dot cyan" /> NOMINAL
            </strong>
          </div>
        </div>

        <div className="section-grid top-panels">
          <DriverStatePanel lap={selectedLap} />
          <PerformancePanel lap={selectedLap} />
          <RiskPanel lap={selectedLap} />
        </div>

        <div className="section-grid radio-timeline">
          <RadioPanel
            lap={selectedLap}
            onAnalysis={handleRadioAnalysis}
          />
          <StateTimeline
            laps={timelineLaps}
            selectedLap={selectedLap.lap}
            onSelectLap={handleSelectLap}
          />
        </div>

        <div className="section-grid analysis-row">
          <PerformanceChart
            laps={demoLaps}
            selectedLap={selectedLap.lap}
          />
          <InsightPanel
            lap={selectedLap}
            intelligence={intelligenceResult}
          />
        </div>

        <div className="section-grid detail-row">
          <LapDetailPanel lap={selectedLap} />
          <AlertPanel
            alerts={intelligenceResult?.alerts ?? []}
            onSelectLap={handleSelectLap}
            selectedLap={selectedLap.lap}
          />
        </div>
      </main>

      <DemoController
        isRunning={isDemoRunning}
        currentLap={selectedLap.lap}
        firstLap={demoLaps[0].lap}
        lastLap={demoLaps[demoLaps.length - 1].lap}
        onToggle={() => {
          setLiveAnalysis(null);
          setIsDemoRunning((current) => !current);
        }}
        onRestart={() => {
          setLiveAnalysis(null);
          setSelectedIndex(0);
          setIsDemoRunning(true);
        }}
      />
    </div>
  );
}

export default App;