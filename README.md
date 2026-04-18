<div align="center">

# Open-Vocabulary Image Segmentation

**Describe any object in plain English — get pixel-precise masks back in seconds.**

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/your-username/segmentation/ci.yml?label=CI)](https://github.com/your-username/segmentation/actions)

</div>

---

## Demo

> _Replace the placeholder below with a real screen-capture GIF after recording a demo._

<div align="center">
  <img src="assets/demo.gif" alt="App demo" width="800"/>
</div>

---

## Pipeline

```
User uploads image + types query ("the red car")
            │
            ▼
   ┌─────────────────┐
   │  Grounding DINO │  open-vocab detection → bounding boxes + confidence
   └────────┬────────┘
            │  boxes (cx/cy/w/h, normalised) → pixel xyxy + NMS
            ▼
   ┌─────────────────┐
   │    SAM 2        │  box-prompted segmentation → binary masks
   └────────┬────────┘
            │  alpha-blend coloured masks onto original image
            ▼
   ┌─────────────────┐
   │  React frontend │  side-by-side original / segmented + detection chips
   └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Detection | [Grounding DINO](https://github.com/IDEA-Research/GroundingDINO) | Open-vocabulary object detection from text |
| Segmentation | [SAM 2](https://github.com/facebookresearch/sam2) | Pixel-precise mask prediction |
| Backend | [FastAPI](https://fastapi.tiangolo.com/) + [uvicorn](https://www.uvicorn.org/) | Async REST API, model lifecycle |
| Frontend | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) | Interactive UI, drag-and-drop upload |
| HTTP | [Axios](https://axios-http.com/) | API client with 60 s timeout |
| Image processing | [OpenCV](https://opencv.org/), [Pillow](https://pillow.readthedocs.io/) | Resizing, colour conversion, overlay |
| CI | [GitHub Actions](https://github.com/features/actions) | Lint on every push / PR |

---

## Project Structure

```
segmentation/
├── backend/
│   ├── config.py          # Thresholds, model paths, CORS origins
│   ├── main.py            # FastAPI app, lifespan, /segment endpoint
│   ├── pipeline.py        # Grounding DINO → NMS → SAM 2 → overlay
│   ├── utils.py           # Image validation, bytes↔numpy, base64 encode
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.jsx
│   │   │   ├── QueryInput.jsx
│   │   │   ├── ResultView.jsx
│   │   │   ├── DetectionChips.jsx
│   │   │   └── LoadingState.jsx
│   │   ├── hooks/
│   │   │   └── useSegment.js
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── App.css
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
├── assets/                # Demo GIF, screenshots (not in git LFS)
├── .github/
│   └── workflows/
│       └── ci.yml
├── .gitignore
├── LICENSE
└── README.md              ← you are here
```

---

## Quickstart

### Prerequisites

| Requirement | Version |
|---|---|
| Python | ≥ 3.11 |
| Node.js | ≥ 20 |
| RAM | ≥ 8 GB (CPU) / 6 GB VRAM (GPU) |
| Disk | ~2 GB (model checkpoints) |

### 1 — Clone

```bash
git clone https://github.com/your-username/segmentation.git
cd segmentation
```

### 2 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt   # ~5 min on first install
uvicorn main:app --host 0.0.0.0 --port 8000
```

Model checkpoints (~1.5 GB total) are downloaded automatically on first startup.

### 3 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

> **Tip:** `VITE_API_URL` in a `.env` file overrides the default proxy target. See [`frontend/README.md`](frontend/README.md).

---

## API Reference

### `GET /health`

Returns model readiness.

```bash
curl http://localhost:8000/health
# {"status":"ok","models_loaded":true}
```

### `POST /segment`

Segments objects matching a natural-language query.

| Field | Type | Description |
|---|---|---|
| `image` | `file` | JPG / PNG / WEBP, max 10 MB |
| `query` | `string` | Plain-English description, e.g. `"the red car"` |

```bash
curl -X POST http://localhost:8000/segment \
  -F "image=@photo.jpg" \
  -F "query=the red car"
```

**Response**

```json
{
  "masked_image_b64": "<base64-encoded PNG>",
  "detections": [
    {
      "label": "car",
      "confidence": 0.812,
      "box": [120.4, 88.1, 410.7, 305.2],
      "color": [0, 114, 178]
    }
  ],
  "count": 1,
  "query": "the red car"
}
```

---

## Configuration

| Variable | File | Default | Description |
|---|---|---|---|
| `BOX_THRESHOLD` | `backend/config.py` | `0.35` | Grounding DINO detection confidence cutoff |
| `TEXT_THRESHOLD` | `backend/config.py` | `0.25` | Token-level text matching threshold |
| `NMS_THRESHOLD` | `backend/config.py` | `0.8` | IoU threshold for duplicate box removal |
| `MASK_ALPHA` | `backend/config.py` | `0.45` | Mask overlay opacity (0–1) |
| `MAX_IMAGE_DIMENSION` | `backend/config.py` | `1024` | Longest edge cap before inference |
| `VITE_API_URL` | `frontend/.env` | _(proxy)_ | Backend base URL for production builds |
| `ALLOWED_ORIGINS` | `backend/config.py` | `localhost:5173` | CORS allowed origins |

---

## Results

> _Add screenshots here once you have them._

| Query | Result |
|---|---|
| `"the red car"` | _[screenshot]_ |
| `"all people"` | _[screenshot]_ |
| `"the dog on the left"` | _[screenshot]_ |

---

## Acknowledgements

- [Grounding DINO](https://arxiv.org/abs/2303.05499) — Shilong Liu et al., IDEA Research
- [Segment Anything Model 2](https://arxiv.org/abs/2408.00714) — Meta FAIR
- [GroundingDINO-py](https://github.com/IDEA-Research/GroundingDINO) packaging by IDEA Research

---

<div align="center">
  <sub>Built with FastAPI · React · Grounding DINO · SAM 2</sub>
</div>
