import { Icon } from "./Icon";
import { session } from "../mock-data";

interface TopBarProps {
  isDemoRunning: boolean;
  currentLap: number;
}

export function TopBar({ isDemoRunning, currentLap }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark"><span>R</span></div>
        <div>
          <div className="brand-name">REVORA</div>
          <div className="brand-tagline">HEAR THE DIFFERENCE</div>
        </div>
      </div>
      <div className="session-lockup">
        <div className="session-primary"><Icon name="flag" size={15} /> {session.race}</div>
        <div className="session-secondary">{session.track} <span className="session-separator">/</span> {session.driver} <span className="session-separator">/</span> {session.car}</div>
      </div>
      <div className="lap-lockup">
        <span className="topbar-label">LAP</span>
        <strong>{currentLap}</strong><span className="lap-total">/ {session.totalLaps}</span>
      </div>
      <div className="live-lockup">
        <span className={`live-dot ${isDemoRunning ? "is-replaying" : ""}`} />
        <span>{isDemoRunning ? "REPLAYING" : "LIVE"}</span>
        <span className="live-time">14:41:08</span>
      </div>
      <button className="topbar-menu" aria-label="Open session menu"><span /><span /><span /></button>
    </header>
  );
}
