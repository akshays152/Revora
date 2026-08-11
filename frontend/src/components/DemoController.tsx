import { Icon } from "./Icon";

interface DemoControllerProps {
  isRunning: boolean;
  currentLap: number;
  firstLap: number;
  lastLap: number;
  onToggle: () => void;
  onRestart: () => void;
}

export function DemoController({ isRunning, currentLap, firstLap, lastLap, onToggle, onRestart }: DemoControllerProps) {
  const progress = ((currentLap - firstLap) / (lastLap - firstLap)) * 100;
  return (
    <section className="demo-control"><div className="demo-label"><span className="demo-dot" /> DEMO / REPLAY</div><div className="demo-progress"><span style={{ width: `${progress}%` }} /></div><span className="demo-position">LAP {currentLap} / {lastLap}</span><button className="demo-action" onClick={onToggle}><Icon name={isRunning ? "pause" : "play"} size={13} /> {isRunning ? "PAUSE" : "PLAY"}</button><button className="demo-restart" onClick={onRestart} aria-label="Restart demo"><Icon name="rotate" size={16} /></button></section>
  );
}

