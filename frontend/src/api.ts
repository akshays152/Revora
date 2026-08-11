import type { RadioAnalysisResult } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export async function analyzeRadio(file: File): Promise<RadioAnalysisResult> {
  const body = new FormData();
  body.append("audio", file);

  const response = await fetch(`${API_BASE_URL}/analysis/radio`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    let message = `Analysis failed (${response.status}).`;
    try {
      const error = (await response.json()) as { detail?: string };
      if (error.detail) message = error.detail;
    } catch {
      // Keep the HTTP status fallback when the server does not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<RadioAnalysisResult>;
}
