# The functions (predict, _run_stage) handle a SINGLE image.
# (_aggregate_patch_results) handle MANY patches from one full image.

import io
import json
import os
import tempfile
import zipfile
from pathlib import Path # path: used for clean file path handling
import numpy as np  # numpy: used for image arrays and predictions
from app.config import CANCER_CONFIGS # gives access to all model paths, thresholds, classes, image settings

# Used as a flag for debugging/fallback logic
TF_AVAILABLE = False

# Store loaded models in memeory

# Nested dict: { 
#       cancer_type: { 
#           "stage1": model | None,
#           "stage2": model | None 
#       } 
# }
_registry: dict = {}

_COMPAT_STRIP_KEYS = (
    "quantization_config",
    "input_axes",
    "output_axes",
    "renorm",
    "renorm_clipping",
    "renorm_momentum",
    "synchronized",
)

# Cleans the model config before Keras loads it
# (Remove unsupported keys from obj/Dict)
def _remove_unknown_keys(obj: object) -> None:
    """Recursively strip layer-config keys added by newer Keras that older
    versions don't recognise (e.g. quantization_config on Dense layers)."""
    if isinstance(obj, dict):
        for key in _COMPAT_STRIP_KEYS:
            obj.pop(key, None)
        for v in obj.values():
            _remove_unknown_keys(v)
    elif isinstance(obj, list):
        for item in obj:
            _remove_unknown_keys(item)


def _load_model_compat(model_path: Path, tf):
    """Load a .keras model, patching config.json in-memory to strip keys
    that are unrecognised by the currently installed Keras version."""
    
    # Open the .keras file as a zip, read and fix the config, then load the model from the fixed config in-memory
    try:
        
        # in-memory buffer to hold the fixed .keras zip file
        buf = io.BytesIO() 
        # Open the original .keras file as a zip
        with zipfile.ZipFile(model_path, "r") as src:
            # Read the config -> config becomes a normal Python dictionary
            config = json.loads(src.read("config.json"))
            # Recursively remove unknown keys from the config dict
            _remove_unknown_keys(config)
            # Convert the fixed config back to bytes for writing into the new zip
            fixed_config = json.dumps(config).encode("utf-8")

            # Create a new zip file in-memory with the same contents as the original, but with the fixed config
            with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as dst:
                for name in src.namelist():
                    # If this is the config.json file, write the fixed config; otherwise copy the original file data
                    data = fixed_config if name == "config.json" else src.read(name)
                    dst.writestr(name, data) # write the file (fixed or original) into the new zip

       
        # create a temporary file to hold the fixed .keras zip (since tf.keras.models.load_model expects a file path)
        with tempfile.NamedTemporaryFile(suffix=".keras", delete=False) as tmp: 
            tmp.write(buf.getvalue())
            tmp_path = tmp.name

        # Now load the model from the in-memory zip file
        try:
            # Load the model from the temporary file containing the fixed config
            return tf.keras.models.load_model(tmp_path, compile=False, safe_mode=False)
        finally:
            # Clean up the temporary file after loading the model
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    # If any error occurs during this process, catch it and attempt to load the model without the compatibility fix as a fallback
    # (zip file issues, JSON parsing, TensorFlow loading)
    except (zipfile.BadZipFile, KeyError):
        return tf.keras.models.load_model(model_path, compile=False, safe_mode=False)

# Load all models defined in the config at application startup and store them in the registry 
def load_models() -> None:
    global TF_AVAILABLE

    try:
        # Import TensorFlow here to avoid making it a hard dependency for the whole app
        # it's only needed for model loading and inference
        import tensorflow as tf
        TF_AVAILABLE = True
    # If TensorFlow is not available, log a warning and set the flag to False so the rest of the app can handle it gracefully
    except Exception as e:
        print(f"[WARN] TensorFlow not available: {e}")
        TF_AVAILABLE = False
        return

    try:
        # Iterate through each cancer type and stage defined in the config, attempt to load the model, and store it in the registry
        for cancer_type, cfg in CANCER_CONFIGS.items():
            # Initialize the registry entry for this cancer type as an empty dict
            _registry[cancer_type] = {}

            # For each stage (stage1 and stage2), check if the model file exists. If it does, attempt to load it with compatibility fixes. If it doesn't exist or fails to load, log a warning and set that stage's model to None in the registry.
            for stage in ("stage1", "stage2", "stage3"):
                # Skip stages that are not configured (e.g. single-stage cancer types)
                if cfg.get(stage) is None:
                    print(f"[INFO]  Skipped {cancer_type}/{stage}  — not configured (single-stage mode)")
                    _registry[cancer_type][stage] = None
                    continue

                # Construct the model file path from the config
                model_path = Path(cfg[stage]["path"])

                # If the model file does not exist
                if not model_path.exists():
                    # Log a warning that the model file is missing, but continue loading other models 
                    print(f"[INFO]  Skipped {cancer_type}/{stage}  — file not found")
                    # Set the registry entry for this stage to None to indicate that the model is not available, so the inference code can handle it in "mock" mode
                    _registry[cancer_type][stage] = None
                    continue

                try:
                    # Attempt to load the model with compatibility fixes for older TensorFlow versions
                    _registry[cancer_type][stage] = _load_model_compat(model_path, tf)
                    # If loading is successful, log an info message confirming the model was loaded
                    print(f"[INFO]  Loaded  {cancer_type}/{stage}  ({model_path.name})")
                
                # If any error occurs during loading, catch it, log a warning
                except (KeyboardInterrupt, SystemExit):
                    raise
                except BaseException as e:
                    # Log a warning that the model failed to load, but continue loading other models and stages
                    print(f"[WARN]  Failed to load {cancer_type}/{stage}: {type(e).__name__}: {e}")
                    # Set the registry entry for this stage to None to indicate that the model failed to load, so the inference code can handle it in "mock" mode
                    _registry[cancer_type][stage] = None
    
    # Catch any unexpected errors during the overall loading process 
    except (KeyboardInterrupt, SystemExit):
        raise
    except BaseException as e:
        print(f"[ERROR]  Unexpected failure during model loading: {type(e).__name__}: {e}")


# Run one stage of the pipeline (either stage1 or stage2) and return a dict with the label, confidence, raw probability, and whether this is a mock prediction due to missing model
def _run_stage(model, image_array: np.ndarray, threshold: float, classes: list) -> dict:
    """Run one sigmoid binary-classifier stage and return a result dict."""
    # Mock output if the model is not available 
    if model is None:
        return {
            "label": classes[0],
            "confidence": 0.0,
            "raw_probability": 0.0,
            "is_mock": True,
        }

    # Run the model prediction on the preprocessed image array (Sigmoid output: 0 to 1)
    raw_prob = float(model.predict(image_array, verbose=0).ravel()[0])
     
    # Determine predicted class index based on the threshold 
    # class 1 (abnormal or malignant) | class 0 (normal or benign)
    pred_idx = 1 if raw_prob >= threshold else 0
        
    label = classes[pred_idx] # Get the corresponding class label from the classes list using the predicted index
    
    # Confidence is the raw probability for the predicted class
    confidence = raw_prob if pred_idx == 1 else (1.0 - raw_prob)

    # Return the prediction result as a dict that can be easily converted to the PredictionResponse model for the API response
    return {
        "label": label,
        "confidence": round(confidence, 4),
        "raw_probability": round(raw_prob, 4),
        "is_mock": False,
    }

# Main prediction function (Full pipeline)
def predict(cancer_type: str, image_array: np.ndarray) -> dict:
    """
    Run the 2-stage pipeline for a given cancer type.
    """
    # Validate the cancer type and retrieve the corresponding model configurations
    cfg = CANCER_CONFIGS.get(cancer_type)

    # If the cancer type is not found in the config raise a ValueError
    if cfg is None:
        raise ValueError(f"Unsupported cancer type: '{cancer_type}'")

    # Retrieve the loaded models for this cancer type from the registry
    # This will be a dict with keys "stage1" and "stage2", where each value is either a loaded model or None 
    cancer_models = _registry.get(cancer_type, {})

    # --- Stage 1 ---
    s1_cfg = cfg["stage1"]
    s1 = _run_stage(
        cancer_models.get("stage1"),
        image_array,
        s1_cfg["threshold"],
        s1_cfg["classes"],
    )

    # --- Single-stage mode ---
    # If stage2 is not configured, return stage1 result directly
    # (e.g. oral cancer: normal vs malignant in one step)
    if cfg.get("stage2") is None:
        return {
            "cancer_type": cancer_type,
            "stage1_label": s1["label"],
            "stage1_confidence": s1["confidence"],
            "stage2_label": None,
            "stage2_confidence": None,
            "is_mock": s1["is_mock"],
            "message": (
                "No abnormality detected."
                if s1["label"] == "normal"
                else f"Detected: {s1['label']} ({s1['confidence'] * 100:.1f}% confidence)."
            ),
        }

    # --- Two-stage mode ---
    # The "normal" label — if stage 1 says normal, skip stage 2
    normal_class = "normal"
    # If stage 1 predicts "normal", skip stage 2 
    if s1["label"] == normal_class:
        return {
            "cancer_type": cancer_type,
            "stage1_label": s1["label"],
            "stage1_confidence": s1["confidence"],
            "stage2_label": None,
            "stage2_confidence": None,
            "is_mock": s1["is_mock"],
            "message": "No suspicious abnormality detected.",
        }

    # If stage1 says abnormal → run stage2
    # --- Stage 2 ---
    s2_cfg = cfg["stage2"]
    s2 = _run_stage(
        cancer_models.get("stage2"),
        image_array,
        s2_cfg["threshold"],
        s2_cfg["classes"],
    )

    # Return the combined results from both stages in a dict format that matches the PredictionResponse model for the API response
    return {
        "cancer_type": cancer_type,
        "stage1_label": s1["label"],
        "stage1_confidence": s1["confidence"],
        "stage2_label": s2["label"],
        "stage2_confidence": s2["confidence"],
        "is_mock": s1["is_mock"] or s2["is_mock"],
        "message": "Suspicious abnormality detected.",
    }


def predict_histopathology(image_array: np.ndarray) -> dict:
    """
    Run the Stage 3 histopathology model for oral cancer.
    Accepts a preprocessed image array and returns a classification result.
    Falls back to mock mode if the model is not loaded.
    """
    cfg = CANCER_CONFIGS.get("oral")
    if cfg is None:
        raise ValueError("Oral cancer config not found")

    s3_cfg = cfg.get("stage3")
    if s3_cfg is None:
        raise ValueError("Stage 3 histopathology not configured for oral cancer")

    model = _registry.get("oral", {}).get("stage3")
    result = _run_stage(model, image_array, s3_cfg["threshold"], s3_cfg["classes"])

    label = result["label"]
    confidence = result["confidence"]
    is_mock = result["is_mock"]

    if is_mock:
        message = "Histopathology model not loaded — showing placeholder result."
    elif label.lower() in ["malignant", "cancerous"]:
        message = f"Histopathology indicates cancerous tissues ({confidence * 100:.1f}% confidence)."
    else:
        message = f"Histopathology indicates benign tissue ({confidence * 100:.1f}% confidence)."

    return {
        "label": label,
        "confidence": confidence,
        "is_mock": is_mock,
        "message": message,
    }


# Takes the probability from EVERY patch -> Makes ONE final decision.
def _aggregate_patch_results(
    patch_probs: np.ndarray,
    threshold: float,
    classes: list,
) -> dict:
    """
    Aggregate per-patch sigmoid probabilities into one diagnosis.
    
    Class-aware logic:
      - classes = ["abnormal", "normal"]: LOW prob = abnormal (dangerous)
        -> We look at the SINGLE LOWEST prob (most suspicious patch)
      - classes = ["benign", "malignant"]: HIGH prob = malignant (dangerous)
        -> We look at the K=3 HIGHEST probs
    
    Stage 1 uses K=1 because tumors only overlap 1-2 sliding window patches.
    Stage 2 uses K=3 because it only receives pre-filtered suspicious patches.
    """
    probs = patch_probs.ravel()



    # TEMPORARY DIAGNOSTIC — delete after tuning
    print(f"\n[DIAG] Classes: {classes}")
    print(f"[DIAG] Min={probs.min():.3f}, Max={probs.max():.3f}, Mean={probs.mean():.3f}")
    print(f"[DIAG] % below 0.5: {(probs < 0.5).mean()*100:.1f}%")
    print(f"[DIAG] % below 0.6: {(probs < 0.6).mean()*100:.1f}%")
    print(f"[DIAG] % below 0.69: {(probs < 0.69).mean()*100:.1f}%")
    print(f"[DIAG] % below 0.8: {(probs < 0.8).mean()*100:.1f}%")
    print(f"[DIAG] All probs sorted: {sorted(probs)}")


    total_patches = len(probs)

    # Detect which class index is the "dangerous" one
    dangerous_is_high = classes[1] in ("malignant",)  # HIGH prob = dangerous
    # For ["abnormal", "normal"]: dangerous_is_high = False (LOW prob = abnormal)
    # For ["benign", "malignant"]: dangerous_is_high = True  (HIGH prob = malignant)

    if dangerous_is_high:
        # -- Stage 2: Benign vs Malignant — use MEAN across ALL suspicious patches --
        #
        # Why MEAN and not K=3:
        # When Stage 1 incorrectly flags a normal image, it can send 15-20 patches
        # to Stage 2. K=3 grabs the 3 highest outliers which may exceed the threshold
        # by chance, causing a false malignant result.
        #
        # MEAN is robust because:
        #   - True malignant image:  Stage 2 patches mean = ~0.73  (far above 0.5)
        #   - False-alarm normal:    Stage 2 patches mean = ~0.29  (far below 0.5)
        # The gap is huge — MEAN separates them cleanly.
        mean_prob = float(np.mean(probs))
        
        # Count patches above threshold (for breakdown stats)
        positive_count = int(np.sum(probs >= threshold))
        positive_pct = positive_count / total_patches
        
        # Decision: mean above threshold -> malignant
        pred_idx = 1 if mean_prob >= threshold else 0
        label = classes[pred_idx]
        confidence = mean_prob if pred_idx == 1 else (1.0 - mean_prob)
        suspicious_score = mean_prob
    else:
        # -- LOW prob = dangerous (e.g., abnormal) --
        # Stage 1: use K=3 (top-3 most suspicious patches)
        k = min(5, total_patches)
        top_k_probs = np.sort(probs)[:k]
        top_k_avg = float(np.mean(top_k_probs))
        
        # Count patches below threshold (classified as abnormal)
        positive_count = int(np.sum(probs < threshold))
        positive_pct = positive_count / total_patches
        
        # Decision: if top-3 average is below threshold -> abnormal
        is_abnormal = top_k_avg < threshold
        pred_idx = 0 if is_abnormal else 1
        label = classes[pred_idx]
        confidence = (1.0 - top_k_avg) if pred_idx == 0 else top_k_avg
        suspicious_score = 1.0 - top_k_avg

    return {
        "label": label,
        "confidence": round(confidence, 4),
        "is_mock": False,
        "total_patches": total_patches,
        "positive_patches": positive_count,
        "positive_pct": round(positive_pct * 100, 1),
        "top_k_confidence": round(suspicious_score, 4),
        "patch_probs": probs.tolist(),  # Added for heatmap generation
    }

    '''
    # Changed code : failed

    bad_class_is_index_0 = (classes[0] in ["abnormal", "malignant"])

    if bad_class_is_index_0:
        # Bad class is 0, meaning LOW probability = bad.
        # We want the K *lowest* probabilities (most suspicious)
        top_k_probs = np.sort(probs)[:k] 
        top_k_avg = float(np.mean(top_k_probs))
        
        # Count patches below threshold (classified as index 0)
        positive_count = int(np.sum(probs < threshold))
        
        # Decision: if average is below threshold, it's abnormal (class 0)
        pred_idx = 0 if top_k_avg < threshold else 1
    else:
        # Bad class is 1, meaning HIGH probability = bad.
        # We want the K *highest* probabilities (most suspicious)
        top_k_probs = np.sort(probs)[-k:]
        top_k_avg = float(np.mean(top_k_probs))
        
        # Count patches above threshold (classified as index 1)
        positive_count = int(np.sum(probs >= threshold))
        
        # Decision: if average is above threshold, it's malignant (class 1)
        pred_idx = 1 if top_k_avg >= threshold else 0

    positive_pct = positive_count / total_patches
    label = classes[pred_idx]
    
    # Confidence in the predicted class
    confidence = top_k_avg if pred_idx == 1 else (1.0 - top_k_avg)
    # For the UI, we always want top_k_confidence to reflect the "suspiciousness"
    # If bad class is index 0, 1.0 - prob is the suspiciousness
    suspicious_score = (1.0 - top_k_avg) if bad_class_is_index_0 else top_k_avg
    return {
        "label": label,
        "confidence": round(confidence, 4),
        "is_mock": False,
        "total_patches": total_patches,
        "positive_patches": positive_count,
        "positive_pct": round(positive_pct * 100, 1),
        "top_k_confidence": round(suspicious_score, 4),
    }
    
    '''

# Run one model stage on a BATCH of patches
def _run_stage_batch(
    model,
    batch_array: np.ndarray,
    threshold: float,
    classes: list,
) -> dict:

    if model is None:
        return{
            "label": classes[0],
            "confidence": 0.0,
            "is_mock": True,
            "total_patches": len(batch_array),
            "positive_patches": 0,
            "positive_pct": 0.0,
            "top_k_confidence": 0.0,
            "raw_probs": np.zeros(len(batch_array)),
        }

    # Run model on ALL patches at once
    raw_probs = model.predict(batch_array, batch_size=64, verbose=0)

    # Aggregate to get ONE final answer
    result = _aggregate_patch_results(raw_probs, threshold, classes)
    # Attach raw probs so caller can filter patches for Stage 2
    result["raw_probs"] = raw_probs.ravel()
    return result


# Full patch-based pipeline
def predict_breast_patches(batch_array: np.ndarray) -> dict:

    cfg = CANCER_CONFIGS.get("breast")
    if cfg is None:
        raise ValueError("Breast cancer config not found")
    
    cancer_models = _registry.get("breast", {})
    
    # ── Stage 1: Normal vs Abnormal (on ALL patches) ──
    s1_cfg = cfg["stage1"]
    s1 = _run_stage_batch(
        cancer_models.get("stage1"),
        batch_array,
        s1_cfg["threshold"],
        s1_cfg["classes"],
    )

    s1_abnormal = s1["positive_patches"]
    s1_normal = s1["total_patches"] - s1_abnormal
    
    breakdown = {
        "normal": s1_normal,
        "abnormal": s1_abnormal,
        "benign": 0,
        "malignant": 0
    }

    # If Stage 1 says normal -> done, no need for Stage 2
    if s1["label"] == "normal":
        return {
            "cancer_type": "breast",
            "stage1_label": s1["label"],
            "stage1_confidence": s1["confidence"],
            "stage2_label": None,
            "stage2_confidence": None,
            "is_mock": s1["is_mock"],
            "message": "No suspicious abnormality detected.",
            "total_patches": s1["total_patches"],
            "positive_patches": s1["positive_patches"],
            "positive_pct": s1["positive_pct"],
            "top_k_confidence": s1["top_k_confidence"],
            "patch_breakdown": breakdown,
            "patch_probs": s1.get("raw_probs", np.array([])).tolist(),
        }
    
    # ── Stage 2: Benign vs Malignant ──
    # CRITICAL: Only run Stage 2 on patches that Stage 1 flagged as suspicious!
    # This prevents normal tissue from biasing the benign/malignant decision.
    s2_cfg = cfg.get("stage2")
    if s2_cfg is None:
        return {
            "cancer_type": "breast",
            "stage1_label": s1["label"],
            "stage1_confidence": s1["confidence"],
            "stage2_label": None,
            "stage2_confidence": None,
            "is_mock": s1["is_mock"],
            "message": f"Detected: {s1['label']} ({s1['confidence'] * 100:.1f}% confidence).",
            "total_patches": s1["total_patches"],
            "positive_patches": s1["positive_patches"],
            "positive_pct": s1["positive_pct"],
            "top_k_confidence": s1["top_k_confidence"],
            "patch_breakdown": breakdown,
            "patch_probs": s1.get("raw_probs", np.array([])).tolist(),
        }
    
    # Filter: only keep patches where Stage 1 said "abnormal" (prob < threshold)
    s1_probs = s1.get("raw_probs", np.array([]))
    s1_threshold = s1_cfg["threshold"]
    suspicious_mask = s1_probs < s1_threshold  # LOW prob = abnormal for this model
    
    if np.any(suspicious_mask):
        # Run Stage 2 ONLY on the suspicious patches
        suspicious_patches = batch_array[suspicious_mask]
        print(f"[INFO] Stage 2: running on {len(suspicious_patches)}/{len(batch_array)} suspicious patches")
        s2 = _run_stage_batch(
            cancer_models.get("stage2"),
            suspicious_patches,
            s2_cfg["threshold"],
            s2_cfg["classes"],
        )
        
        # Stage 2 classes: ["benign", "malignant"]
        s2_malignant = s2["positive_patches"]
        s2_benign = s2["total_patches"] - s2_malignant
        breakdown["malignant"] = s2_malignant
        breakdown["benign"] = s2_benign
    else:
        # Fallback: if no patches were flagged (edge case), run on all
        print(f"[WARN] Stage 2: no suspicious patches found, using all {len(batch_array)}")
        s2 = _run_stage_batch(
            cancer_models.get("stage2"),
            batch_array,
            s2_cfg["threshold"],
            s2_cfg["classes"],
        )
        s2_malignant = s2["positive_patches"]
        s2_benign = s2["total_patches"] - s2_malignant
        breakdown["malignant"] = s2_malignant
        breakdown["benign"] = s2_benign
    
    return {
        "cancer_type": "breast",
        "stage1_label": s1["label"],
        "stage1_confidence": s1["confidence"],
        "stage2_label": s2["label"],
        "stage2_confidence": s2["confidence"],
        "is_mock": s1["is_mock"] or s2["is_mock"],
        "message": "Suspicious abnormality detected.",
        "total_patches": s1["total_patches"],
        "positive_patches": s1["positive_patches"],
        "positive_pct": s1["positive_pct"],
        "top_k_confidence": s1["top_k_confidence"],
        "patch_breakdown": breakdown,
        "patch_probs": s1.get("raw_probs", np.array([])).tolist(),
    }