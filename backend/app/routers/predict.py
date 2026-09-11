import base64
import math
import cv2
import numpy as np 
from app.utils.super_preprocessor import SuperPreprocessor

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from app.config import CANCER_CONFIGS, SUPPORTED_CANCER_TYPES
from app.schemas import PredictionResponse, HistopathologyResponse, SynopsisRequest, SynopsisResponse
from app.services import inference
from app.services.synopsis import generate_synopsis
from app.utils.image_preprocess import preprocess_image

# Create a FastAPI router for prediction endpoints with a common prefix and tags
router = APIRouter(prefix="/predict", tags=["Prediction"])

# Endpoint to return the list of supported cancer types for prediction
@router.get("/cancer-types", tags=["Prediction"])
def get_supported_cancer_types():
    # Return the list of cancer types the API currently supports
    return {"supported_cancer_types": SUPPORTED_CANCER_TYPES}

# Prediction endpoint that accepts an image file and cancer type
# then returns the prediction results
'''
@router.post("", response_model=PredictionResponse)
async def predict_cancer(
    cancer_type: str = Form(..., description="breast, lung, skin, oral"),
    file: UploadFile = File(..., description="Mammogram / scan image"),
):
    
    # Validate cancer type and file format before processing
    if cancer_type not in CANCER_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported cancer type '{cancer_type}'. "
                f"Choose from: {SUPPORTED_CANCER_TYPES}"
            ),
        )

    # Basic validation to ensure the uploaded file is an image
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file (JPEG, PNG, etc.).",
        )

    # Process the image and run inference, handling any exceptions that may occur
    try:
        cfg = CANCER_CONFIGS[cancer_type]
        file_bytes = await file.read()
        # Preprocess the image according to the cancer type's configuration
        # raw file ->  numpy array(PIL) -> model input array
        image_array = preprocess_image(
            file_bytes,
            image_size = cfg["image_size"],
            image_mode = cfg["image_mode"],
        )
        
        # Run the prediction pipeline and return the results in the expected format
        result = inference.predict(cancer_type, image_array)
        
        # Convert the result dict to a PredictionResponse model instance for FastAPI response
        return PredictionResponse(**result) # '**result': Unpack the dict into the model fields

    # Catch any unexpected errors during processing
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
'''

@router.post("/preview")
async def preview_preprocessing(
    cancer_type: str = Form(..., description="Breast, Lung, Skin, Oral"),
    file: UploadFile = File(..., description="Full-size medical image"),
):
    if cancer_type not in CANCER_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported: {cancer_type}"
        )

    cfg = CANCER_CONFIGS[cancer_type]
    file_bytes = await file.read()
        
    if cancer_type == "breast":
        preprocessor = SuperPreprocessor()
        img = preprocessor.standardize_image(file_bytes)
        cropped = preprocessor.crop_and_clean(img)

        resized = preprocessor.resize_to_training_scale(cropped, target_long_side=1024)

    patches, coords, total_windows, removed = preprocessor.extract_patches(resized) 

    grid_base64 = None
    if patches: 
        cols = 10
        show_patches = patches[:100]
        rows = math.ceil(len(show_patches) / cols)

        h, w = show_patches[0].shape[:2]

        grid = np.full((rows*h, cols*w),30, dtype=np.uint8)

        for i, patch in enumerate(show_patches):
            r = i // cols
            c = i % cols
            grid[r*h : (r+1)*h, c*w : (c+1)*w] = patch

        # encode grid image to base64
        _, buffer = cv2.imencode(".png", grid)
        grid_base64 = base64.b64encode(buffer).decode("utf-8")
        
    return{
        "original_size": list(img.shape),
        "cropped_size": list(cropped.shape),
        "total_windows": total_windows,
        "removed_count": removed,
        "valid_patches": len(patches),
        "grid_image": grid_base64,  # Base64 PNG string
    }
                
# new pipeline for batch predictions
@router.post("", response_model=PredictionResponse)
async def predict_cancer(
    cancer_type: str = Form(..., description="breast, lung, skin, oral"),
    file: UploadFile = File(..., description="Mammogram / scan image"),
):
    # Validate cancer type
    if cancer_type not in CANCER_CONFIGS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported cancer type '{cancer_type}'. Choose from: {SUPPORTED_CANCER_TYPES}",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file (JPEG, PNG, etc.).",
        )

    try:
        cfg = CANCER_CONFIGS[cancer_type]
        file_bytes = await file.read()

        # ── BREAST CANCER: use new patch-based pipeline ──
        if cancer_type == "breast":
            preprocessor = SuperPreprocessor()
            
            # Phase 1: Raw bytes → grayscale array
            img = preprocessor.standardize_image(file_bytes)
            # Phase 2: Find tissue, crop out black background
            cropped = preprocessor.crop_and_clean(img)
            # Phase 2.5: Resize to 1024px (MUST match training data scale!)
            resized = preprocessor.resize_to_training_scale(cropped)
            # Phase 3: Slide 224x224 window across the resized image
            patches, coords, total, removed = preprocessor.extract_patches(resized)
            
            if len(patches) == 0:
                raise ValueError("No valid tissue patches found in the image")
            
            # Phase 4: Apply CLAHE + stack into batch array
            batch = preprocessor.prepare_batch(patches)
            # Phase 5: Run model on all patches + aggregate
            result = inference.predict_breast_patches(batch)
            
            # Phase 6: Generate heatmap overlay
            patch_probs = result.get("patch_probs", [])
            if patch_probs and len(patch_probs) == len(coords):
                heatmap = np.zeros_like(resized, dtype=np.float32)
                counts = np.zeros_like(resized, dtype=np.float32)
                
                # 0.0 is abnormal (high heat), 1.0 is normal (low heat)
                for prob, (y, x) in zip(patch_probs, coords):
                    heat = 1.0 - float(prob)
                    heatmap[y:y+224, x:x+224] += heat
                    counts[y:y+224, x:x+224] += 1
                
                mask = counts > 0
                heatmap[mask] /= counts[mask]
                
                # Apply massive Gaussian blur to smooth the blocky patches into a natural "cloud"
                heatmap = cv2.GaussianBlur(heatmap, (251, 251), 0)
                
                # Create the colored heatmap (JET colormap)
                heatmap_normalized = (heatmap * 255).astype(np.uint8)
                color_heatmap = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)
                
                original_bgr = cv2.cvtColor(resized, cv2.COLOR_GRAY2BGR)
                
                # Create dynamic transparency mask:
                # We want healthy tissue (blue/green, heat < 0.45) to be COMPLETELY invisible.
                # Only suspicious areas (yellow/red, heat > 0.45) should show up!
                alpha_mask = np.clip((heatmap - 0.4) / 0.4, 0, 1.0) * 0.85
                alpha_mask = np.expand_dims(alpha_mask, axis=-1)
                
                # Fix ugly edges: Create a tissue mask to stop the heatmap from bleeding into the black background
                _, tissue_mask = cv2.threshold(resized, 10, 255, cv2.THRESH_BINARY)
                tissue_mask = (tissue_mask / 255.0).astype(np.float32)
                tissue_mask = np.expand_dims(tissue_mask, axis=-1)
                
                # Clip the alpha mask to the tissue contour
                alpha_mask = alpha_mask * tissue_mask
                
                # Blend the heatmap over the original image smoothly
                overlay = (original_bgr * (1.0 - alpha_mask) + color_heatmap * alpha_mask).astype(np.uint8)
                
                _, buffer = cv2.imencode(".jpg", overlay)
                result["annotated_image"] = base64.b64encode(buffer).decode("utf-8")
            
            return PredictionResponse(**result)

        # ── OTHER CANCER TYPES: use old single-image pipeline ──
        else:
            image_array = preprocess_image(
                file_bytes,
                image_size=cfg["image_size"],
                image_mode=cfg["image_mode"],
            )
            result = inference.predict(cancer_type, image_array)
            return PredictionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ── Stage 3: Oral Cancer Histopathology ──
@router.post("/histopathology", response_model=HistopathologyResponse)
async def predict_histopathology(
    file: UploadFile = File(..., description="Histopathology image (JPEG, PNG, TIFF)"),
):
    """
    Stage 3 analysis for oral cancer.
    Accepts a histopathology slide image and classifies it as benign or malignant
    using the dedicated histopathology deep learning model.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file (JPEG, PNG, TIFF).",
        )

    try:
        oral_cfg = CANCER_CONFIGS["oral"]
        file_bytes = await file.read()

        # Preprocess using the same image settings as oral Stage 1/2
        image_array = preprocess_image(
            file_bytes,
            image_size=oral_cfg["image_size"],
            image_mode=oral_cfg["image_mode"],
        )

        result = inference.predict_histopathology(image_array)
        return HistopathologyResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Histopathology analysis failed: {str(e)}")


# ── AI Clinical Synopsis ──
@router.post("/synopsis", response_model=SynopsisResponse)
async def get_synopsis(request: SynopsisRequest):
    """
    Generate an AI-powered clinical synopsis based on prediction results.
    Uses Google Gemini API with fallback to template-based generation.
    """
    try:
        result = await generate_synopsis(
            cancer_type=request.cancer_type,
            stage1_label=request.stage1_label,
            stage1_confidence=request.stage1_confidence,
            stage2_label=request.stage2_label,
            stage2_confidence=request.stage2_confidence,
            histo_label=request.histo_label,
            histo_confidence=request.histo_confidence,
        )
        return SynopsisResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synopsis generation failed: {str(e)}")
