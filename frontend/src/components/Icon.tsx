import type { SVGProps } from "react";

type IconName = "radio" | "chevron" | "play" | "pause" | "rotate" | "wave" | "flag" | "pulse" | "info" | "arrow";

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...props }: IconProps) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...props };

  if (name === "radio") return <svg {...common}><path d="M4 7.5h16" /><path d="M6 7.5 9 3" /><path d="M8 11.5h2v6H8zM14 11.5h2v6h-2z" /><path d="M5 21h14" /><path d="M17.5 4.5a3 3 0 0 1 0 6" /></svg>;
  if (name === "chevron") return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
  if (name === "play") return <svg {...common} fill="currentColor" stroke="none"><path d="m8 5 11 7-11 7V5Z" /></svg>;
  if (name === "pause") return <svg {...common} fill="currentColor" stroke="none"><path d="M7 5h3v14H7zM14 5h3v14h-3z" /></svg>;
  if (name === "rotate") return <svg {...common}><path d="M20 11a8 8 0 1 0 1 4" /><path d="M20 5v6h-6" /></svg>;
  if (name === "wave") return <svg {...common}><path d="M3 12h2l2-5 4 10 3-8 2 3h5" /></svg>;
  if (name === "flag") return <svg {...common}><path d="M5 21V4" /><path d="M5 5c5-3 9 3 14 0v9c-5 3-9-3-14 0" /></svg>;
  if (name === "pulse") return <svg {...common}><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>;
  if (name === "info") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
  return <svg {...common}><path d="M5 12h13" /><path d="m14 7 5 5-5 5" /></svg>;
}

