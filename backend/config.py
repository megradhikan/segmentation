import os
from pathlib import Path

BASE_DIR = Path(__file__).parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

# Grounding DINO
GDINO_CONFIG_URL = (
    "https://raw.githubusercontent.com/IDEA-Research/GroundingDINO/main"
    "/groundingdino/config/GroundingDINO_SwinT_OGC.py"
)
GDINO_CHECKPOINT_URL = (
    "https://github.com/IDEA-Research/GroundingDINO/releases/download"
    "/v0.1.0-alpha/groundingdino_swint_ogc.pth"
)
GDINO_CONFIG_PATH = MODELS_DIR / "GroundingDINO_SwinT_OGC.py"
GDINO_CHECKPOINT_PATH = MODELS_DIR / "groundingdino_swint_ogc.pth"

# SAM 2
SAM2_CHECKPOINT_URL = (
    "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt"
)
SAM2_CHECKPOINT_PATH = MODELS_DIR / "sam2.1_hiera_large.pt"
SAM2_MODEL_CONFIG = "configs/sam2.1/sam2.1_hiera_l.yaml"

# Inference thresholds
BOX_THRESHOLD = float(os.getenv("BOX_THRESHOLD", "0.35"))
TEXT_THRESHOLD = float(os.getenv("TEXT_THRESHOLD", "0.25"))
NMS_THRESHOLD = float(os.getenv("NMS_THRESHOLD", "0.8"))

# Image constraints
MAX_IMAGE_SIZE_MB = 10
MAX_IMAGE_DIMENSION = 1920
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Mask overlay
MASK_ALPHA = 0.45
MASK_COLORS = [
    (255, 56, 56),
    (56, 255, 56),
    (56, 56, 255),
    (255, 157, 56),
    (157, 56, 255),
    (56, 255, 157),
    (255, 56, 157),
    (157, 255, 56),
]

# CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
