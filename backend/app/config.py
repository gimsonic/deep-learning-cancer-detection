from pathlib import Path

# Centralized configuration for the multi-cancer detection system
BASE_DIR = Path(__file__).resolve().parent.parent

# Models directory path
MODELS_DIR = BASE_DIR / "models"


# Plug-and-play configuration dict for each cancer type:

# Each entry defines model paths, thresholds, class names, and preprocessing
# settings for one cancer type. 

# If a model file is missing at startup the system logs a warning and runs
# that stage in "mock" mode so the rest of the pipeline keeps working.

CANCER_CONFIGS: dict = {
    # Stage 1 — Normal vs Abnormal  
    # Stage 2 — Benign vs Malignant
    "breast": {
        "stage1": {
            "path": MODELS_DIR / "DS2_ResNet50_v4.3_best_new_dataset_normal_vs_abnormal_phase2.keras",
            "threshold": 0.57,
            "classes": ["abnormal", "normal"], 
        },
        
        "stage2": {
            # Use the _inference version (no augmentation layers) for cross-TF-version compatibility
            "path": MODELS_DIR / "DS2_ResNet50_v4.3_best_new_dataset_benign_vs_malignant.keras",
            "threshold": 0.54,
            "classes": ["benign", "malignant"],
        },

        "image_mode": "L",        # Grayscale — standard for mammograms
        "image_size": (224, 224),
    },
    "lung": {
        "stage1": {
            "path": MODELS_DIR / "", #vidmal_lung.h5
            "threshold": 0.5,
            "classes": ["malignant", "normal"],
        },
        "stage2": None,  # Single-stage: benign vs malignant only
        "image_mode": "RGB",       # Lung model was trained on RGB images
        "image_size": (224, 224),
    },
    "skin": {
        "stage1": {
            "path": MODELS_DIR / "skin_efficientnetb3_model_1.keras",
            "threshold": 0.5,
            "classes": ["abnormal", "normal"],
        },
        "stage2": {
            "path": MODELS_DIR / "skin_efficientnetb3_model_2.keras",
            "threshold": 0.5,
            "classes": ["benign", "malignant"],
        },
        "image_mode": "RGB",      # Dermoscopy images are colour
        "image_size": (224, 224),
    },
    "oral": {
        "stage1": {
            "path": MODELS_DIR / "oral_efficientnetb3_model_1.keras", 
            "threshold": 0.5,
            "classes": ["abnormal", "normal"],
        },
        "stage2": {
            "path": MODELS_DIR / "oral_efficientnetb3_model_2.keras", 
            "threshold": 0.5,
            "classes": ["benign", "malignant"],
        },  # Single-stage: normal vs malignant only
        "image_mode": "RGB",      # Oral cavity photos are colour
        "image_size": (224, 224),
    },
}

SUPPORTED_CANCER_TYPES = list(CANCER_CONFIGS.keys())