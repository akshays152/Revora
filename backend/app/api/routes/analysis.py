from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from app.ai.huggingface_pipeline import (
    HuggingFaceAudioPipeline,
    PipelineConfigurationError,
    PipelineInferenceError,
)
from app.schemas.analysis import ModelStatusResponse, RadioAnalysisResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])
audio_pipeline = HuggingFaceAudioPipeline()

MAX_AUDIO_BYTES = 15 * 1024 * 1024
ALLOWED_SUFFIXES = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"}


@router.get("/models", response_model=ModelStatusResponse)
async def model_status() -> ModelStatusResponse:
    return ModelStatusResponse(
        loaded=audio_pipeline.loaded,
        speech_to_text=audio_pipeline.asr_model,
        vocal_state=audio_pipeline.vocal_state_name,
    )


@router.post("/radio", response_model=RadioAnalysisResponse)
async def analyze_radio(audio: UploadFile = File(...)) -> RadioAnalysisResponse:
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

    try:
        return await run_in_threadpool(audio_pipeline.analyze, payload, suffix)
    except PipelineConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PipelineInferenceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
