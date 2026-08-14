from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.ai.huggingface_pipeline import (
    HuggingFaceAudioPipeline,
    PipelineConfigurationError,
    PipelineInferenceError,
)
from app.schemas.analysis import ModelStatusResponse, RadioAnalysisResponse
from app.schemas.orchestration import OrchestrationResponse
from app.schemas.risk_engine import TelemetrySnapshot
from app.services.orchestration import AnalysisOrchestrator


router = APIRouter(prefix="/analysis", tags=["analysis"])
audio_pipeline = HuggingFaceAudioPipeline()
orchestrator = AnalysisOrchestrator()

MAX_AUDIO_BYTES = 15 * 1024 * 1024
ALLOWED_SUFFIXES = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"}


@router.get("/models", response_model=ModelStatusResponse)
async def model_status() -> ModelStatusResponse:
    return ModelStatusResponse(
        state=audio_pipeline.state,
        loaded=audio_pipeline.loaded,
        speech_to_text=audio_pipeline.asr_model,
        vocal_state=audio_pipeline.vocal_state_name,
        detail=audio_pipeline.state_detail,
    )


async def _read_audio(audio: UploadFile) -> tuple[bytes, str]:
    suffix = Path(audio.filename or "radio.wav").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported audio format. Upload WAV, MP3, FLAC, M4A, OGG, or WebM.",
        )

    payload = await audio.read(MAX_AUDIO_BYTES + 1)
    await audio.close()
    if not payload:
        raise HTTPException(status_code=400, detail="The uploaded audio file is empty.")
    if len(payload) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio clips must be 15 MB or smaller.")
    return payload, suffix


async def _run_pipeline(
    payload: bytes,
    suffix: str,
    *,
    session_id: str,
    lap_id: str,
    radio_event_id: str,
    lap_number: int,
    timestamp: str,
) -> RadioAnalysisResponse:
    try:
        return await run_in_threadpool(
            audio_pipeline.analyze,
            payload,
            suffix,
            session_id=session_id,
            lap_id=lap_id,
            radio_event_id=radio_event_id,
            lap_number=lap_number,
            timestamp=timestamp,
        )
    except PipelineConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PipelineInferenceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _build_telemetry(
    *,
    session_id: str,
    lap_id: str,
    lap_number: int,
    telemetry_source: str,
    lap_time_seconds: float | None,
    baseline_lap_time_seconds: float | None,
    lap_delta: float | None,
    tire_stint_age: int | None,
    tire_compound: str | None,
) -> TelemetrySnapshot:
    source = telemetry_source.upper()
    if source == "UNAVAILABLE":
        return TelemetrySnapshot(
            session_id=session_id,
            lap_id=lap_id,
            telemetry_source="UNAVAILABLE",
            lap_number=lap_number,
            lap_time_seconds=None,
            baseline_lap_time_seconds=None,
            lap_delta=None,
            sector_deltas=[],
            tire_stint_age=0,
            tire_compound="UNKNOWN",
        )

    required = (
        lap_time_seconds,
        baseline_lap_time_seconds,
        tire_stint_age,
        tire_compound,
    )
    if any(value is None for value in required):
        raise HTTPException(
            status_code=422,
            detail=(
                "Live telemetry requires lap time, baseline, tyre stint age, and compound. "
                "Use telemetry_source=UNAVAILABLE when telemetry is not supplied."
            ),
        )

    derived_delta = round(lap_time_seconds - baseline_lap_time_seconds, 3)
    corrected = lap_delta is not None and abs(lap_delta - derived_delta) > 0.05
    return TelemetrySnapshot(
        session_id=session_id,
        lap_id=lap_id,
        telemetry_source="LIVE",
        lap_number=lap_number,
        lap_time_seconds=lap_time_seconds,
        baseline_lap_time_seconds=baseline_lap_time_seconds,
        lap_delta=derived_delta,
        delta_was_corrected=corrected,
        sector_deltas=[],
        tire_stint_age=tire_stint_age,
        tire_compound=tire_compound,
    )


@router.post("/radio", response_model=RadioAnalysisResponse)
async def analyze_radio(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    lap_id: str = Form(...),
    radio_event_id: str = Form(...),
    lap_number: int = Form(...),
    timestamp: str = Form(...),
) -> RadioAnalysisResponse:
    payload, suffix = await _read_audio(audio)
    return await _run_pipeline(
        payload,
        suffix,
        session_id=session_id,
        lap_id=lap_id,
        radio_event_id=radio_event_id,
        lap_number=lap_number,
        timestamp=timestamp,
    )


@router.post("/orchestrate", response_model=OrchestrationResponse)
async def orchestrate_analysis(
    audio: UploadFile = File(...),
    session_id: str = Form(...),
    lap_id: str = Form(...),
    radio_event_id: str = Form(...),
    lap_number: int = Form(...),
    timestamp: str = Form(...),
    telemetry_source: str = Form("UNAVAILABLE"),
    lap_time_seconds: float | None = Form(None),
    baseline_lap_time_seconds: float | None = Form(None),
    lap_delta: float | None = Form(None),
    tire_stint_age: int | None = Form(None),
    tire_compound: str | None = Form(None),
) -> OrchestrationResponse:
    payload, suffix = await _read_audio(audio)
    radio = await _run_pipeline(
        payload,
        suffix,
        session_id=session_id,
        lap_id=lap_id,
        radio_event_id=radio_event_id,
        lap_number=lap_number,
        timestamp=timestamp,
    )
    telemetry = _build_telemetry(
        session_id=session_id,
        lap_id=lap_id,
        lap_number=lap_number,
        telemetry_source=telemetry_source,
        lap_time_seconds=lap_time_seconds,
        baseline_lap_time_seconds=baseline_lap_time_seconds,
        lap_delta=lap_delta,
        tire_stint_age=tire_stint_age,
        tire_compound=tire_compound,
    )
    return orchestrator.evaluate(radio, telemetry)
