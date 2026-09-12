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


# ── Lung-specific preprocessor for Vidmal's CT nodule model ──────────────────
def preprocess_lung_image(file_bytes: bytes) -> np.ndarray:
    """Preprocess a single CT slice image for Vidmal's 47×47×5 nodule model.

    The model was trained on 47×47 crops with 5 consecutive CT slices as
    channels. Since we only have a single uploaded slice, we resize to 47×47
    grayscale and stack 5 identical copies to match the expected input shape.

    Preprocessing mirrors the training pipeline in two_stage_pipeline.py:
        x = crop.astype("float32")[None, ...] / 255.0

    Returns:
        np.ndarray of shape (1, 47, 47, 5), dtype float32, values in [0, 1]
    """
    # Open as grayscale (CT images are single-channel)
    image = Image.open(BytesIO(file_bytes)).convert("L")

    # Resize to 47×47 to match model input
    image = image.resize((47, 47), Image.LANCZOS)
    arr = np.array(image, dtype=np.uint8)  # shape: (47, 47)

    # Stack 5 identical copies to simulate 5 consecutive CT slices
    arr5 = np.stack([arr] * 5, axis=-1)   # shape: (47, 47, 5)

    # Normalize to [0, 1] — matches training pipeline's / 255.0
    arr5 = arr5.astype(np.float32) / 255.0

    # Add batch dimension → (1, 47, 47, 5)
    return np.expand_dims(arr5, axis=0)
