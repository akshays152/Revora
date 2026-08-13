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
import { demoAlerts, demoLaps } from "./demo-data";
import { transitionExperienceMode } from "./experience-mode";
import { toSnapshot } from "./result-mapping";
import type { ExperienceMode, LapSnapshot, OrchestrationResult } from "./types";

function App() {
  const [sessionId] = useState(() => `session-${crypto.randomUUID()}`);
  const [mode, setMode] = useState<ExperienceMode>("DEMO");
  const [demoRunning, setDemoRunning] = useState(true);
  const [demoIndex, setDemoIndex] = useState(0);
  const [results, setResults] = useState<OrchestrationResult[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [inputResetSignal, setInputResetSignal] = useState(0);

  useEffect(() => {
    if (mode !== "DEMO" || !demoRunning) return;
    const timer = window.setInterval(() => setDemoIndex((current) => (current + 1) % demoLaps.length), 1800);
    return () => window.clearInterval(timer);
  }, [mode, demoRunning]);

  const selectedResult = results.find((item) => item.radio_analysis.radio_event_id === selectedEventId) ?? results[results.length - 1] ?? null;
  const liveSnapshots = useMemo(() => results.map(toSnapshot), [results]);
  const isDemo = mode === "DEMO";
  const activeLap = isDemo ? demoLaps[demoIndex] : selectedResult ? toSnapshot(selectedResult) : demoLaps[demoIndex];
  const activeLaps = isDemo ? demoLaps : liveSnapshots;
  const isLiveResult = mode === "LIVE_RESULT" && selectedResult !== null;

  const handleAnalysis = (result: OrchestrationResult) => {
    setResults((current) => [...current, result]);
    setSelectedEventId(result.radio_analysis.radio_event_id);
    setMode((current) => transitionExperienceMode(current, "ANALYSIS_SUCCEEDED"));
  };
  const handleSelectLap = (lap: number) => {
    if (isDemo) { const index = demoLaps.findIndex((item) => item.lap === lap); if (index >= 0) setDemoIndex(index); return; }
    const result = [...results].reverse().find((item) => item.radio_analysis.lap_number === lap);
    if (result) setSelectedEventId(result.radio_analysis.radio_event_id);
  };
  const returnToDemo = () => { setMode((current) => transitionExperienceMode(current, "RETURN_TO_DEMO")); setDemoRunning(true); setInputResetSignal((value) => value + 1); };

  return <div className={`app-shell min-h-screen mode-${mode.toLowerCase()}`}>
    <TopBar mode={mode} currentLap={activeLap.lap} eventCount={results.length} />
    <main className="dashboard-shell">
      <div className="dashboard-intro"><div><div className="eyebrow intro-eyebrow">{isDemo ? "DEMO RACE CONTROL" : "LIVE DRIVER INTELLIGENCE"}</div><h1>The silent co-driver.</h1><p>{isDemo ? "Simulated presentation mode · select an audio clip to pause and enter live mode." : "Live mode · demo playback is paused and cannot affect these results."}</p></div><div className="intro-meta"><span>DATA MODE</span><strong><i className="status-dot cyan" /> {mode.replace(/_/g, " ")}</strong></div></div>
      <div className="section-grid radio-timeline"><RadioPanel sessionId={sessionId} nextLapNumber={(liveSnapshots[liveSnapshots.length - 1]?.lap ?? activeLap.lap) + 1} liveAnalysis={isLiveResult ? selectedResult?.radio_analysis ?? null : null} demoLap={activeLap} showDemoContent={isDemo} resetSignal={inputResetSignal} onFileSelected={(hasFile) => { if (hasFile) { setDemoRunning(false); setMode((current) => transitionExperienceMode(current, "AUDIO_SELECTED")); } else if (mode === "LIVE_INPUT_READY") returnToDemo(); }} onAnalysisStart={() => setMode((current) => transitionExperienceMode(current, "ANALYSIS_STARTED"))} onAnalysisError={() => setMode((current) => transitionExperienceMode(current, "ANALYSIS_FAILED"))} onAnalysis={handleAnalysis} /><StateTimeline laps={(activeLaps.length ? activeLaps : [activeLap]).slice(-5)} selectedLap={activeLap.lap} onSelectLap={handleSelectLap} /></div>
      <div className={`mode-bound-content ${mode === "LIVE_INPUT_READY" || mode === "ANALYZING" ? "is-demo-suspended" : ""}`}>
        <div className="section-grid top-panels"><DriverStatePanel lap={activeLap} /><PerformancePanel lap={activeLap} telemetrySource={isDemo ? "DEMO" : selectedResult?.telemetry.telemetry_source ?? "UNAVAILABLE"} /><RiskPanel lap={activeLap} assessment={isLiveResult ? selectedResult?.risk_assessment : null} /></div>
        <div className="section-grid analysis-row"><PerformanceChart laps={(activeLaps.length ? activeLaps : [activeLap])} selectedLap={activeLap.lap} telemetrySource={isDemo ? "DEMO" : selectedResult?.telemetry.telemetry_source ?? "UNAVAILABLE"} /><InsightPanel lap={activeLap} intelligence={isLiveResult ? selectedResult?.racing_intelligence ?? null : null} /></div>
        <div className="section-grid detail-row"><LapDetailPanel lap={activeLap} /><AlertPanel alerts={isDemo ? demoAlerts : isLiveResult ? selectedResult?.racing_intelligence.alerts ?? [] : []} onSelectLap={handleSelectLap} selectedLap={activeLap.lap} /></div>
      </div>
    </main>
    <DemoController mode={mode} isRunning={demoRunning} currentLap={demoLaps[demoIndex].lap} firstLap={demoLaps[0].lap} lastLap={demoLaps[demoLaps.length - 1].lap} onToggle={() => setDemoRunning((current) => !current)} onRestart={() => { setDemoIndex(0); setDemoRunning(true); }} onReturnToDemo={returnToDemo} />
  </div>;
}
export default App;
