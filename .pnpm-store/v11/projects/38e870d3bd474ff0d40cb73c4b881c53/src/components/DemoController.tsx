import type { ExperienceMode } from "../types";
import { Icon } from "./Icon";

export function DemoController({ mode, isRunning, currentLap, firstLap, lastLap, onToggle, onRestart, onReturnToDemo }: {
  mode: ExperienceMode;
  isRunning: boolean;
  currentLap: number;
  firstLap: number;
  lastLap: number;
  onToggle: () => void;
  onRestart: () => void;
  onReturnToDemo: () => void;
}) {
  if (mode !== "DEMO") {
    return <section className="demo-control mode-control"><div className="demo-label"><span className="demo-dot" /> {mode.replace(/_/g, " ")}</div><div className="demo-progress"><span style={{ width: mode === "LIVE_RESULT" ? "100%" : mode === "ANALYZING" ? "65%" : "25%" }} /></div><button className="demo-action" onClick={onReturnToDemo}>RETURN TO DEMO</button></section>;
  }
  const progress = ((currentLap - firstLap) / (lastLap - firstLap)) * 100;
  return <section className="demo-control"><div className="demo-label"><span className="demo-dot" /> DEMO / REPLAY</div><div className="demo-progress"><span style={{ width: `${progress}%` }} /></div><span className="demo-position">LAP {currentLap} / {lastLap}</span><button className="demo-action" onClick={onToggle}><Icon name={isRunning ? "pause" : "play"} size={13} /> {isRunning ? "PAUSE" : "PLAY"}</button><button className="demo-restart" onClick={onRestart} aria-label="Restart demo"><Icon name="rotate" size={16} /></button></section>;
}
