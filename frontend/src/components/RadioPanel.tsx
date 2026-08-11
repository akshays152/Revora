import { useEffect, useRef, useState } from "react";
import { analyzeRadio } from "../api";
import type { LapSnapshot, RadioAnalysisResult } from "../types";
import { Icon } from "./Icon";

type RadioPanelProps = {
  lap: LapSnapshot;
  onAnalysis: (analysis: RadioAnalysisResult) => void;
};

export function RadioPanel({ lap, onAnalysis }: RadioPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const handleFile = (nextFile: File | null) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(nextFile);
    setAudioUrl(nextFile ? URL.createObjectURL(nextFile) : null);
    setStatus("idle");
    setError("");
    setIsPlaying(false);
    setDurationSeconds(0);
    setAudioProgress(0);
  };

  const handlePlay = async () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) await audioRef.current.play();
    else audioRef.current.pause();
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStatus("analyzing");
    setError("");
    try {
      const result = await analyzeRadio(file);
      onAnalysis(result);
      setStatus("done");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "Audio analysis failed.");
    }
  };

  return (
    <section className="panel radio-panel">
      <div className="panel-heading"><span className="eyebrow">04 / DRIVER RADIO</span><span className="status-text"><span className="status-dot orange" /> CHANNEL 01</span></div>
      <div className="radio-upload-row">
        <label className="audio-upload">
          <input type="file" accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.webm" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
          <span>{file ? file.name : "SELECT RADIO CLIP"}</span>
        </label>
        <button className="analyze-button" disabled={!file || status === "analyzing"} onClick={handleAnalyze}>
          {status === "analyzing" ? "ANALYZING…" : "RUN HF ANALYSIS"}
        </button>
      </div>
      <div className="radio-topline"><div className="audio-time"><span>RADIO / {lap.timestamp}</span><strong>{durationSeconds ? `00:${Math.min(59, Math.round(durationSeconds)).toString().padStart(2, "0")}` : "00:00"}</strong></div><div className={`waveform ${isPlaying ? "is-playing" : ""}`}>{Array.from({ length: 26 }, (_, index) => <i key={index} style={{ height: `${10 + ((index * 17) % 26)}%` }} />)}</div></div>
      {audioUrl && <audio ref={audioRef} src={audioUrl} onLoadedMetadata={(event) => setDurationSeconds(event.currentTarget.duration)} onTimeUpdate={(event) => setAudioProgress(event.currentTarget.duration ? (event.currentTarget.currentTime / event.currentTarget.duration) * 100 : 0)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => { setIsPlaying(false); setAudioProgress(0); }} />}
      <div className="audio-controls"><button className="play-button" disabled={!audioUrl} onClick={handlePlay} aria-label={isPlaying ? "Pause radio" : "Play radio"}><Icon name={isPlaying ? "pause" : "play"} size={16} /></button><div className="audio-track"><span style={{ width: `${audioProgress}%` }} /></div><span className="audio-label">{isPlaying ? "PLAYING" : audioUrl ? "READY" : "NO CLIP"}</span></div>
      {error && <div className="analysis-error" role="alert">{error}</div>}
      {status === "done" && <div className="analysis-success">LIVE HUGGING FACE RESULT</div>}
      <blockquote>“{lap.transcript}”</blockquote>
      <div className="intent-row"><span className="panel-kicker">DETECTED RACING INTENT</span><span className="intent-chip">{lap.intentLabel}</span></div>
    </section>
  );
}
