# Backend — Open-Vocabulary Segmentation API

FastAPI service that runs **Grounding DINO** (open-vocabulary detection) and **SAM 2** (segmentation) on a single `/segment` endpoint. Models are loaded once at startup; an `asyncio.Lock` serialises concurrent inference requests.

---

## What it does

1. Accepts a multipart POST with an image and a text query.
2. Runs the image through Grounding DINO to get bounding boxes.
3. Applies NMS to remove duplicate overlapping boxes.
4. Passes each box to SAM 2 to obtain a pixel-precise binary mask.
5. Alpha-blends coloured masks onto the original image.
6. Returns a base64-encoded PNG plus per-detection metadata (label, confidence, box, colour).

---

## How to run

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Model checkpoints (~1.5 GB) are downloaded automatically on first startup into `backend/models/`.

---

## Endpoints

### `GET /health`

```json
{"status": "ok", "models_loaded": true}
```

### `POST /segment`

**Form fields**

| Field | Type | Constraints |
|---|---|---|
| `image` | file | JPG / PNG / WEBP, ≤ 10 MB |
| `query` | string | Non-empty natural-language description |

**Success response (200)**

```json
{
  "masked_image_b64": "<base64 PNG>",
  "detections": [{"label": "car", "confidence": 0.812, "box": [...], "color": [...]}],
  "count": 1,
  "query": "the red car"
}
```

**Error responses**

| Status | Cause |
|---|---|
| 400 | Empty query or unsupported file type |
| 413 | Image exceeds 10 MB |
| 503 | Models still loading |
| 500 | Inference failure (check server logs) |

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins (set in `config.py`) |

No `.env` file is required for local development.

---

## Key files

| File | Purpose |
|---|---|
| `main.py` | FastAPI app, lifespan, `/segment` route |
| `pipeline.py` | Full inference pipeline (DINO → NMS → SAM 2 → overlay) |
| `config.py` | Thresholds, model URLs/paths, CORS, image limits |
| `utils.py` | File validation, bytes↔numpy conversion, base64 encode |
| `requirements.txt` | Pinned dependencies |
