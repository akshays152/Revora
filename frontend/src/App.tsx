import { useEffect, useMemo, useState } from "react";
import { analyzeRadio } from "./api";
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
import { demoLaps } from "./demo-data";
import type {
  ExperienceMode,
  IntelligenceResult,
  LapSnapshot,
  OrchestrationResult,
  RadioAnalysisResult,
  RiskAssessmentResult,
} from "./types";

function App() {
  const [selectedIndex, setSelectedIndex] = useState(demoLaps.length - 1);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [liveAnalysis, setLiveAnalysis] = useState<RadioAnalysisResult | null>(null);
  const [riskResult, setRiskResult] = useState<RiskAssessmentResult | null>(null);
  const [intelligenceResult, setIntelligenceResult] = useState<IntelligenceResult | null>(null);
  const [liveAnalysisLap, setLiveAnalysisLap] = useState<number | null>(null);

  const handleRadioAnalysis = (result: OrchestrationResult) => {
    const analysis = result.radio_analysis;
    setIsDemoRunning(false);
    setLiveAnalysis(analysis);
    setRiskResult(result.risk_assessment);
    setIntelligenceResult(result.racing_intelligence);
    setLiveAnalysisLap(analysis.lap_number);
  };

  const returnToDemo = () => {
    setLiveAnalysis(null);
    setRiskResult(null);
    setIntelligenceResult(null);
    setLiveAnalysisLap(null);
    setSelectedIndex(demoLaps.length - 1);
    setIsDemoRunning(false);
  };

  const hasLiveResultForSelectedLap =
    liveAnalysis !== null && liveAnalysisLap === demoLaps[selectedIndex].lap;

  const selectedLap = useMemo<LapSnapshot>(() => {
    const lap = demoLaps[selectedIndex];
    if (!liveAnalysis || liveAnalysisLap !== lap.lap) return lap;
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
      intentLabel: primaryIntent?.label.replace(/_/g, " ") ?? "NO RACING CONCERN",
      reasons: intelligenceResult?.reasons ?? [
        `Vocal stress signal ${liveAnalysis.vocal_stress_score}%`,
        primaryIntent ? `Racing language matched \"${primaryIntent.evidence}\"` : "No racing-specific concern detected",
      ],
    };
  }, [liveAnalysis, riskResult, intelligenceResult, liveAnalysisLap, selectedIndex]);

  useEffect(() => {
    if (!isDemoRunning) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((current) => current >= demoLaps.length - 1 ? 0 : current + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [isDemoRunning]);

  const timelineLaps = useMemo(() => demoLaps.slice(-5), []);
  const mode: ExperienceMode = liveAnalysis ? "LIVE_RESULT" : "DEMO";
  const telemetrySource = hasLiveResultForSelectedLap
    ? riskResult?.telemetry_source ?? "UNAVAILABLE"
    : "DEMO";

  const handleSelectLap = (lap: number) => {
    const index = demoLaps.findIndex((item) => item.lap === lap);
    if (index >= 0) {
      setSelectedIndex(index);
      if (!liveAnalysis || liveAnalysisLap !== lap) {
        setLiveAnalysis(null);
        setRiskResult(null);
        setIntelligenceResult(null);
        setLiveAnalysisLap(null);
      }
    }
  };

  return (
    <div className="app-shell min-h-screen">
      <TopBar mode={mode} currentLap={selectedLap.lap} eventCount={timelineLaps.length} />

      <main className="dashboard-shell">
        <div className="dashboard-intro">
          <div>
            <div className="eyebrow intro-eyebrow">RACE CONTROL / DRIVER INTELLIGENCE</div>
            <h1>The silent co-driver.</h1>
            <p>Reading the driver before the numbers tell the story.</p>
          </div>
          <div className="intro-meta"><span>SESSION HEALTH</span><strong><i className="status-dot cyan" /> NOMINAL</strong></div>
        </div>

        <div className="section-grid top-panels">
          <DriverStatePanel lap={selectedLap} />
          <PerformancePanel lap={selectedLap} />
          <RiskPanel lap={selectedLap} assessment={hasLiveResultForSelectedLap ? riskResult : null} />
        </div>

        <div className="section-grid radio-timeline">
          <RadioPanel lap={selectedLap} liveAnalysis={liveAnalysis} onAnalysis={handleRadioAnalysis} />
          <StateTimeline laps={timelineLaps} selectedLap={selectedLap.lap} onSelectLap={handleSelectLap} />
        </div>

        <div className="section-grid analysis-row">
          <PerformanceChart laps={demoLaps} selectedLap={selectedLap.lap} telemetrySource={telemetrySource} />
          <InsightPanel lap={selectedLap} intelligence={hasLiveResultForSelectedLap ? intelligenceResult : null} />
        </div>

        <div className="section-grid detail-row">
          <LapDetailPanel lap={selectedLap} />
          <AlertPanel alerts={hasLiveResultForSelectedLap ? intelligenceResult?.alerts ?? [] : []} onSelectLap={handleSelectLap} selectedLap={selectedLap.lap} />
        </div>
      </main>

      <DemoController
        mode={mode}
        isRunning={isDemoRunning}
        currentLap={selectedLap.lap}
        firstLap={demoLaps[0].lap}
        lastLap={demoLaps[demoLaps.length - 1].lap}
        onToggle={() => setIsDemoRunning((current) => !current)}
        onRestart={() => { returnToDemo(); setIsDemoRunning(true); }}
        onReturnToDemo={returnToDemo}
      />
    </div>
  );
}

export default App;
