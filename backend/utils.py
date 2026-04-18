"""Utility helpers for image I/O, validation, and encoding."""

import base64
import logging
from io import BytesIO
from pathlib import Path

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image

from config import ALLOWED_EXTENSIONS, MAX_IMAGE_SIZE_MB

logger = logging.getLogger(__name__)


def validate_image_file(filename: str, file_size_bytes: int) -> None:
    """Raise HTTPException if the upload has an unsupported extension or is too large.

    Args:
        filename: Original filename from the multipart upload.
        file_size_bytes: Size of the uploaded content in bytes.

    Raises:
        HTTPException 400: Extension not in ALLOWED_EXTENSIONS or file exceeds MAX_IMAGE_SIZE_MB.
    """
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )
    max_bytes = MAX_IMAGE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File too large ({file_size_bytes // 1_048_576} MB). "
                f"Max: {MAX_IMAGE_SIZE_MB} MB."
            ),
        )


def bytes_to_numpy_bgr(image_bytes: bytes) -> np.ndarray:
    """Decode raw image bytes into a BGR NumPy array.

    Args:
        image_bytes: Raw bytes of a JPG, PNG, or WEBP image.

    Returns:
        BGR uint8 array of shape (H, W, 3).
    """
    pil_img = Image.open(BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def numpy_bgr_to_base64_png(image_np: np.ndarray) -> str:
    """Encode a BGR NumPy image as a base64 PNG string.

    Args:
        image_np: BGR uint8 array of shape (H, W, 3).

    Returns:
        Base64-encoded UTF-8 string of the PNG-encoded image.
    """
    _, buffer = cv2.imencode(".png", image_np)
    return base64.b64encode(buffer).decode("utf-8")
