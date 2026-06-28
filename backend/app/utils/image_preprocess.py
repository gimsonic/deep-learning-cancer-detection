from io import BytesIO
from PIL import Image
import numpy as np
import cv2

# ── CLAHE helper (matches training pipeline exactly) ─────────────────────────
def _apply_clahe(img_uint8: np.ndarray) -> np.ndarray:
    """Dual-pass adaptive CLAHE — same parameters as used during training.
    Input / output: uint8 2-D array (H, W).
    """
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(img_uint8)

    if np.std(enhanced) < 25:
        clahe_strong = cv2.createCLAHE(clipLimit=5.0, tileGridSize=(4, 4))
        enhanced = clahe_strong.apply(enhanced)

    return enhanced


# Utility function to preprocess uploaded images for model input
# - Grayscale for mammograms/CT scans
# - RGB for dermoscopy images
def preprocess_image(
    file_bytes: bytes,
    image_size: tuple = (224, 224),
    image_mode: str = "L",
    apply_clahe: bool = True,       # Set False if your model was trained without CLAHE
) -> np.ndarray:
    """Convert raw image bytes to a preprocessed numpy array suitable for model input.
    
    IMPORTANT: Pixel values are kept in [0, 255] range because the model
    architecture includes ResNet50's `preprocess_input` layer which expects
    [0, 255] and handles the caffe-style normalization (BGR mean subtraction)
    internally. Dividing by 255 here would break the preprocessing chain.
    """
    # Open image and convert to the required mode (grayscale or RGB)
    image = Image.open(BytesIO(file_bytes)).convert(image_mode)
    image = image.resize(image_size)

    # Keep pixel values in [0, 255] range — the model's built-in
    # preprocess_input layer handles normalization
    arr = np.array(image, dtype=np.float32)

    # Apply CLAHE for grayscale images (mammograms) to match training pipeline
    if image_mode == "L" and apply_clahe:
        arr = _apply_clahe(arr.astype(np.uint8)).astype(np.float32)

    # Add channel dimension for grayscale images to match model input shape (H, W, C)
    if image_mode == "L":
        arr = np.expand_dims(arr, axis=-1)   # (H, W) -> (H, W, 1)

    # Add batch dimension to create final shape (1, H, W, C) for model input
    arr = np.expand_dims(arr, axis=0)        # (H, W, C) -> (1, H, W, C)

    # final output shape: (1, 224, 224, 1) for grayscale 
    #                     (1, 224, 224, 3) for RGB
    return arr
