import type { ExperienceMode } from "../types";
import { Icon } from "./Icon";

export function TopBar({ mode, currentLap, eventCount }: { mode: ExperienceMode; currentLap: number | null; eventCount: number }) {
  const isDemo = mode === "DEMO";
  return <header className="topbar">
    <div className="brand-lockup"><div className="brand-mark"><span>R</span></div><div><div className="brand-name">REVORA</div><div className="brand-tagline">HEAR THE DIFFERENCE</div></div></div>
    <div className="session-lockup"><div className="session-primary"><Icon name="flag" size={15} /> {isDemo ? "APEX GRAND PRIX · DEMO" : "LIVE ANALYSIS SESSION"}</div><div className="session-secondary">{isDemo ? "SIMULATED PRESENTATION DATA" : "REAL RADIO · TELEMETRY ONLY WHEN SUPPLIED"}</div></div>
    <div className="lap-lockup"><span className="topbar-label">LAP</span><strong>{currentLap ?? "--"}</strong><span className="lap-total"> · {eventCount} LIVE EVENTS</span></div>
    <div className="live-lockup"><span className={`live-dot ${isDemo ? "is-replaying" : ""}`} /><span>{mode.replace(/_/g, " ")}</span></div>
    <button className="topbar-menu" aria-label="Open session menu"><span /><span /><span /></button>
  </header>;
}
