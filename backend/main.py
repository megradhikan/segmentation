"""FastAPI application — Open-Vocabulary Segmentation API.

Exposes two endpoints:
- GET  /health   — liveness + model-readiness check
- POST /segment  — run Grounding DINO + SAM 2 on an uploaded image
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from pipeline import load_models, run_segmentation
from utils import validate_image_file, bytes_to_numpy_bgr, numpy_bgr_to_base64_png
from config import ALLOWED_ORIGINS

logger = logging.getLogger(__name__)

# Shared state populated during lifespan startup.
app_state: dict = {}

# Single lock so concurrent HTTP requests don't run inference in parallel;
# PyTorch (especially on CPU) is not safe to call from multiple threads at once.
inference_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models at startup; release resources on shutdown."""
    logger.info("Loading ML models...")
    gdino_model, sam2_predictor = load_models()
    app_state["gdino"] = gdino_model
    app_state["sam2"] = sam2_predictor
    logger.info("Models loaded — app ready.")
    yield
    app_state.clear()
    logger.info("App shutdown complete.")


app = FastAPI(
    title="Open-Vocabulary Segmentation API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Return service liveness and model readiness.

    Returns:
        dict: Keys ``status`` ("ok") and ``models_loaded`` (bool).
    """
    return {
        "status": "ok",
        "models_loaded": "gdino" in app_state and "sam2" in app_state,
    }


@app.post("/segment")
async def segment(
    image: UploadFile = File(..., description="Image file (JPG, PNG, WEBP)"),
    query: str = Form(..., description="Natural language query describing objects to segment"),
):
    """Segment objects in *image* that match the plain-English *query*.

    Args:
        image: Uploaded image file. Accepted formats: JPG, PNG, WEBP. Max 10 MB.
        query: Free-text description, e.g. ``"the red car"`` or ``"all people"``.

    Returns:
        JSONResponse with keys:
            - ``masked_image_b64``: Base64-encoded PNG with coloured masks overlaid.
            - ``detections``: List of detection objects (label, confidence, box, color).
            - ``count``: Number of detected objects.
            - ``query``: Echo of the original query.

    Raises:
        HTTPException 400: Query is empty or image format/size is invalid.
        HTTPException 503: Models have not finished loading.
        HTTPException 500: Unexpected inference failure.
    """
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if "gdino" not in app_state or "sam2" not in app_state:
        raise HTTPException(status_code=503, detail="Models are still loading, try again shortly.")

    image_bytes = await image.read()
    validate_image_file(image.filename, len(image_bytes))

    image_np = bytes_to_numpy_bgr(image_bytes)

    try:
        # Serialise inference: only one request runs through the GPU/CPU at a time.
        async with inference_lock:
            result = run_segmentation(
                image_np=image_np,
                query=query,
                gdino_model=app_state["gdino"],
                sam2_predictor=app_state["sam2"],
            )
    except Exception:
        logger.exception("Inference failed for query=%r", query)
        raise HTTPException(status_code=500, detail="Internal segmentation error.")

    masked_b64 = numpy_bgr_to_base64_png(result["masked_image"])

    return JSONResponse({
        "masked_image_b64": masked_b64,
        "detections": result["detections"],
        "count": result["count"],
        "query": query,
    })


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
