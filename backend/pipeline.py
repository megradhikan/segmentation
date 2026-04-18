"""Inference pipeline: Grounding DINO → NMS → SAM 2 → mask overlay.

Flow:
    1. Resize image so the longest edge is at most MAX_IMAGE_DIMENSION.
    2. Correct EXIF orientation via Pillow.
    3. Transform PIL image → normalised torch tensor (required by Grounding DINO).
    4. Grounding DINO detects bounding boxes for the text query.
    5. NMS removes duplicate overlapping boxes.
    6. SAM 2 predicts a pixel mask for each box.
    7. Coloured semi-transparent masks are alpha-blended onto the original image.
"""

import logging
import urllib.request
from pathlib import Path

import cv2
import numpy as np
import torch
from PIL import Image, ImageOps

import groundingdino.datasets.transforms as GDT
from groundingdino.util.inference import load_model, predict
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

from config import (
    BOX_THRESHOLD,
    GDINO_CHECKPOINT_PATH,
    GDINO_CHECKPOINT_URL,
    GDINO_CONFIG_PATH,
    GDINO_CONFIG_URL,
    MASK_ALPHA,
    MASK_COLORS,
    MAX_IMAGE_DIMENSION,
    NMS_THRESHOLD,
    SAM2_CHECKPOINT_PATH,
    SAM2_CHECKPOINT_URL,
    SAM2_MODEL_CONFIG,
    TEXT_THRESHOLD,
)

logger = logging.getLogger(__name__)


def _download_if_missing(url: str, dest: Path) -> None:
    """Download *url* to *dest* if the file does not already exist.

    Args:
        url: Direct download URL for the checkpoint or config file.
        dest: Local path where the file should be saved.
    """
    if not dest.exists():
        logger.info("Downloading %s ...", dest.name)
        urllib.request.urlretrieve(url, dest)
        logger.info("Saved %s (%d MB)", dest.name, dest.stat().st_size // 1_000_000)


def load_models() -> tuple:
    """Download checkpoints if needed and load both models onto the best device.

    Returns:
        Tuple of ``(gdino_model, sam2_predictor)`` ready for inference.
    """
    _download_if_missing(GDINO_CONFIG_URL, GDINO_CONFIG_PATH)
    _download_if_missing(GDINO_CHECKPOINT_URL, GDINO_CHECKPOINT_PATH)
    _download_if_missing(SAM2_CHECKPOINT_URL, SAM2_CHECKPOINT_PATH)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info("Loading models on device: %s", device)

    gdino_model = load_model(
        str(GDINO_CONFIG_PATH),
        str(GDINO_CHECKPOINT_PATH),
        device=device,
    )

    sam2_model = build_sam2(SAM2_MODEL_CONFIG, str(SAM2_CHECKPOINT_PATH), device=device)
    sam2_predictor = SAM2ImagePredictor(sam2_model)

    logger.info("Both models loaded successfully.")
    return gdino_model, sam2_predictor


def _resize_if_needed(image_np: np.ndarray) -> np.ndarray:
    """Downscale *image_np* so that its longest edge is at most MAX_IMAGE_DIMENSION.

    Args:
        image_np: BGR image as a NumPy array (H × W × 3).

    Returns:
        Resized image, or the original array unchanged if already within limits.
    """
    h, w = image_np.shape[:2]
    longer = max(h, w)
    if longer <= MAX_IMAGE_DIMENSION:
        return image_np
    scale = MAX_IMAGE_DIMENSION / longer
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(image_np, (new_w, new_h), interpolation=cv2.INTER_AREA)


def _boxes_to_xyxy_pixels(
    boxes_cxcywh: torch.Tensor,
    image_np: np.ndarray,
) -> np.ndarray:
    """Convert Grounding DINO output boxes to absolute pixel coordinates.

    Grounding DINO returns boxes as normalised (cx, cy, w, h) in [0, 1].
    SAM 2 expects absolute (x1, y1, x2, y2) pixel coordinates.

    Args:
        boxes_cxcywh: Float tensor of shape (N, 4) with normalised cx/cy/w/h.
        image_np: BGR image array used to read the pixel dimensions.

    Returns:
        Float32 NumPy array of shape (N, 4) with pixel-space x1/y1/x2/y2.
    """
    h, w = image_np.shape[:2]
    cx, cy, bw, bh = boxes_cxcywh.unbind(-1)

    # Convert centre + size to corner coordinates, then scale to pixels.
    x1 = ((cx - bw / 2) * w).clamp(0, w).cpu().numpy()
    y1 = ((cy - bh / 2) * h).clamp(0, h).cpu().numpy()
    x2 = ((cx + bw / 2) * w).clamp(0, w).cpu().numpy()
    y2 = ((cy + bh / 2) * h).clamp(0, h).cpu().numpy()

    return np.stack([x1, y1, x2, y2], axis=-1)


def _apply_nms(
    boxes_xyxy: np.ndarray,
    scores: list[float],
    iou_threshold: float,
) -> list[int]:
    """Remove duplicate boxes with Non-Maximum Suppression.

    Grounding DINO can return several overlapping boxes for the same object
    instance when the text query matches multiple tokens. NMS keeps the
    highest-confidence box in each cluster of overlapping predictions.

    Args:
        boxes_xyxy: Float array (N, 4) of x1/y1/x2/y2 pixel boxes.
        scores: Confidence scores for each box (length N).
        iou_threshold: IoU above which two boxes are considered duplicates.

    Returns:
        List of indices of the boxes to keep.
    """
    if len(boxes_xyxy) == 0:
        return []
    from torchvision.ops import nms
    kept = nms(
        torch.tensor(boxes_xyxy, dtype=torch.float32),
        torch.tensor(scores, dtype=torch.float32),
        iou_threshold,
    )
    return kept.tolist()


def overlay_masks(image_np: np.ndarray, masks: list[np.ndarray]) -> np.ndarray:
    """Alpha-blend a distinct colour over each boolean mask region.

    Each mask is composited with:
        result = original * (1 - ALPHA) + color_layer * ALPHA

    only at pixels where the mask is True, leaving unmasked pixels unchanged.

    Args:
        image_np: BGR image (H × W × 3, uint8) to composite onto.
        masks: List of boolean arrays (H × W), one per detected object.

    Returns:
        New BGR uint8 image with all masks blended in.
    """
    result = image_np.copy().astype(np.float32)
    for i, mask in enumerate(masks):
        color = MASK_COLORS[i % len(MASK_COLORS)]
        color_layer = np.zeros_like(result)
        color_layer[mask] = color
        result = np.where(
            mask[:, :, None],
            result * (1 - MASK_ALPHA) + color_layer * MASK_ALPHA,
            result,
        )
    return result.astype(np.uint8)


def run_segmentation(
    image_np: np.ndarray,
    query: str,
    gdino_model,
    sam2_predictor: SAM2ImagePredictor,
) -> dict:
    """Run the full Grounding DINO → NMS → SAM 2 → overlay pipeline.

    Args:
        image_np: Input image in BGR format (H × W × 3, uint8).
        query: Natural-language description of objects to segment.
        gdino_model: Loaded Grounding DINO model instance.
        sam2_predictor: Loaded SAM2ImagePredictor instance.

    Returns:
        dict with keys:
            - ``masked_image``: BGR uint8 array with coloured masks overlaid.
            - ``detections``: List of dicts (label, confidence, box, color).
            - ``count``: Number of detections after NMS.
    """
    image_np = _resize_if_needed(image_np)

    # Convert to RGB for PIL and correct any EXIF-encoded rotation.
    image_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
    pil_image = ImageOps.exif_transpose(Image.fromarray(image_rgb))

    # Sync numpy arrays with the (possibly rotated) PIL image.
    image_rgb = np.array(pil_image)
    image_np = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

    # Grounding DINO's predict() calls image.to(device) internally, so we must
    # pass a torch tensor rather than a PIL Image.
    _gdino_transform = GDT.Compose([
        GDT.RandomResize([800], max_size=1333),
        GDT.ToTensor(),
        GDT.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    image_tensor, _ = _gdino_transform(pil_image, None)

    # Grounding DINO expects period-separated noun phrases, e.g. "car . person ."
    gdino_query = query.strip().rstrip(".") + " ."

    device = "cuda" if torch.cuda.is_available() else "cpu"
    boxes, logits, phrases = predict(
        model=gdino_model,
        image=image_tensor,
        caption=gdino_query,
        box_threshold=BOX_THRESHOLD,
        text_threshold=TEXT_THRESHOLD,
        # device must be passed explicitly; the default is "cuda" which raises
        # AssertionError on CPU-only builds.
        device=device,
    )

    if boxes is None or len(boxes) == 0:
        logger.info("No objects detected for query=%r", query)
        return {"masked_image": image_np, "detections": [], "count": 0}

    boxes_xyxy = _boxes_to_xyxy_pixels(boxes, image_np)
    confidences = logits.cpu().numpy().tolist()

    kept_indices = _apply_nms(boxes_xyxy, confidences, NMS_THRESHOLD)
    boxes_xyxy = boxes_xyxy[kept_indices]
    confidences = [confidences[i] for i in kept_indices]
    phrases = [phrases[i] for i in kept_indices]

    logger.info("query=%r -> %d detections after NMS", query, len(kept_indices))

    # SAM 2 requires set_image() to be called before predict().
    sam2_predictor.set_image(image_rgb)

    all_masks = []
    for box in boxes_xyxy:
        masks, _, _ = sam2_predictor.predict(
            point_coords=None,
            point_labels=None,
            box=box[None, :],
            multimask_output=False,  # one best mask per box
        )
        all_masks.append(masks[0].astype(bool))

    # Free GPU memory so subsequent requests don't accumulate cached state.
    sam2_predictor.reset_predictor()

    masked_image = overlay_masks(image_np, all_masks)

    detections = [
        {
            "label": label,
            "confidence": round(float(conf), 3),
            "box": [round(float(v), 1) for v in box],
            "color": list(MASK_COLORS[i % len(MASK_COLORS)]),
        }
        for i, (label, conf, box) in enumerate(zip(phrases, confidences, boxes_xyxy))
    ]

    return {"masked_image": masked_image, "detections": detections, "count": len(detections)}
