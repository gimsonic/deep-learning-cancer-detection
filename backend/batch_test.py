"""
BATCH TEST - Tests multiple images against known ground truth.
Determines the CORRECT class ordering and optimal thresholds.

Ground truth from Info.txt:
  IMG010: CIRC, B (Benign)    -> Should be: Abnormal, Benign
  IMG018: CIRC, N (Normal pathology) -> Has abnormality but not cancerous
  IMG019: Normal              -> Should be: Normal
  IMG021: SPIC, M (Malignant) -> Should be: Abnormal, Malignant
"""
import sys
import os
import numpy as np

BACKEND_DIR = r"c:\Users\Gimhana Menake\Desktop\CurieSense AI\multi-cancer-detection-system\backend"
sys.path.insert(0, BACKEND_DIR)

TIFF_DIR = r"C:\Users\Gimhana Menake\Desktop\exp\danger_zone\dataset 5 (tiff)\TIFF Images"

# Ground truth for test images
GROUND_TRUTH = {
    "IMG010.tif": {"stage1": "abnormal", "stage2": "benign"},
    "IMG018.tif": {"stage1": "abnormal", "stage2": "benign"},  # N = not cancerous
    "IMG019.tif": {"stage1": "normal",   "stage2": None},
    "IMG021.tif": {"stage1": "abnormal", "stage2": "malignant"},
}


def main():
    print("Loading TensorFlow...")
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')

    from app.config import CANCER_CONFIGS
    from app.services.inference import _load_model_compat
    from app.utils.super_preprocessor import SuperPreprocessor

    cfg = CANCER_CONFIGS["breast"]
    s1_path = cfg["stage1"]["path"]
    s2_path = cfg["stage2"]["path"]

    print(f"Loading Stage 1: {s1_path.name}")
    model_s1 = _load_model_compat(s1_path, tf)
    print(f"Loading Stage 2: {s2_path.name}")
    model_s2 = _load_model_compat(s2_path, tf)

    preprocessor = SuperPreprocessor()

    print("\n" + "=" * 80)
    print("  BATCH TEST - RAW MODEL OUTPUTS vs GROUND TRUTH")
    print("=" * 80)

    all_s1_results = {}
    all_s2_results = {}

    for img_name, truth in GROUND_TRUTH.items():
        img_path = os.path.join(TIFF_DIR, img_name)
        if not os.path.exists(img_path):
            print(f"\n  SKIP: {img_name} not found")
            continue

        print(f"\n{'-' * 80}")
        print(f"  {img_name}  |  Ground Truth: S1={truth['stage1']}, S2={truth['stage2']}")
        print(f"{'-' * 80}")

        # Preprocess
        with open(img_path, "rb") as f:
            file_bytes = f.read()
        img = preprocessor.standardize_image(file_bytes)
        cropped = preprocessor.crop_and_clean(img)
        resized = preprocessor.resize_to_training_scale(cropped)
        patches, coords, total, removed = preprocessor.extract_patches(resized)
        batch = preprocessor.prepare_batch(patches)

        # Stage 1
        s1_probs = model_s1.predict(batch, batch_size=64, verbose=0).ravel()
        s1_mean = np.mean(s1_probs)
        s1_min = np.min(s1_probs)
        s1_max = np.max(s1_probs)
        s1_sorted = np.sort(s1_probs)
        s1_top3_low = np.mean(s1_sorted[:3])
        s1_below_05 = np.sum(s1_probs < 0.5) / len(s1_probs) * 100

        print(f"  Stage 1 raw probs: min={s1_min:.3f}  mean={s1_mean:.3f}  max={s1_max:.3f}")
        print(f"  Top-3 lowest avg: {s1_top3_low:.3f}  |  % below 0.5: {s1_below_05:.1f}%")

        all_s1_results[img_name] = {
            "truth": truth["stage1"],
            "probs": s1_probs,
            "top3_low": s1_top3_low,
            "mean": s1_mean,
        }

        # Stage 2 (on suspicious patches only - those with S1 prob < 0.5)
        suspicious_mask = s1_probs < 0.5
        if np.any(suspicious_mask):
            s2_batch = batch[suspicious_mask]
        else:
            # If no suspicious patches, use top-3 lowest from S1
            s2_indices = np.argsort(s1_probs)[:3]
            s2_batch = batch[s2_indices]

        s2_probs = model_s2.predict(s2_batch, batch_size=64, verbose=0).ravel()
        s2_mean = np.mean(s2_probs)
        s2_min = np.min(s2_probs)
        s2_max = np.max(s2_probs)

        print(f"  Stage 2 on {len(s2_batch)} suspicious patches: min={s2_min:.3f}  mean={s2_mean:.3f}  max={s2_max:.3f}")

        all_s2_results[img_name] = {
            "truth": truth["stage2"],
            "probs": s2_probs,
            "mean": s2_mean,
        }

    # ── ANALYSIS ──
    print("\n\n" + "=" * 80)
    print("  ANALYSIS: DETERMINING CORRECT CLASS ORDER")
    print("=" * 80)

    # Stage 1 Analysis
    print("\n  --- STAGE 1: Normal vs Abnormal ---")
    print(f"  {'Image':<14} {'Truth':<10} {'Top3-Low':<10} {'Mean':<10} {'Interpretation'}")
    print(f"  {'-'*60}")
    for img_name, r in all_s1_results.items():
        # If abnormal images have LOW probs -> classes = ["abnormal", "normal"]
        # If abnormal images have HIGH probs -> classes = ["normal", "abnormal"]
        interp = "LOW" if r["top3_low"] < 0.5 else "HIGH"
        print(f"  {img_name:<14} {r['truth']:<10} {r['top3_low']:<10.3f} {r['mean']:<10.3f} probs are {interp}")

    # Check: do abnormal images have LOW or HIGH top3?
    abnormal_top3s = [r["top3_low"] for r in all_s1_results.values() if r["truth"] == "abnormal"]
    normal_top3s = [r["top3_low"] for r in all_s1_results.values() if r["truth"] == "normal"]

    if abnormal_top3s and normal_top3s:
        avg_abn = np.mean(abnormal_top3s)
        avg_nor = np.mean(normal_top3s)
        print(f"\n  Avg top3-low for ABNORMAL images: {avg_abn:.3f}")
        print(f"  Avg top3-low for NORMAL images:   {avg_nor:.3f}")

        if avg_abn < avg_nor:
            print(f"  --> Abnormal images have LOWER probs")
            print(f'  --> CORRECT class order: ["abnormal", "normal"]')
            print(f"  --> Recommended threshold: {(avg_abn + avg_nor) / 2:.2f}")
        else:
            print(f"  --> Abnormal images have HIGHER probs")
            print(f'  --> CORRECT class order: ["normal", "abnormal"]')
            print(f"  --> Recommended threshold: {(avg_abn + avg_nor) / 2:.2f}")

    # Stage 2 Analysis
    print("\n  --- STAGE 2: Benign vs Malignant ---")
    print(f"  {'Image':<14} {'Truth':<10} {'Mean':<10} {'Interpretation'}")
    print(f"  {'-'*50}")
    for img_name, r in all_s2_results.items():
        if r["truth"] is None:
            continue
        interp = "LOW" if r["mean"] < 0.5 else "HIGH"
        print(f"  {img_name:<14} {r['truth']:<10} {r['mean']:<10.3f} probs are {interp}")

    benign_means = [r["mean"] for r in all_s2_results.values() if r["truth"] == "benign"]
    malignant_means = [r["mean"] for r in all_s2_results.values() if r["truth"] == "malignant"]

    if benign_means and malignant_means:
        avg_ben = np.mean(benign_means)
        avg_mal = np.mean(malignant_means)
        print(f"\n  Avg S2 prob for BENIGN images:    {avg_ben:.3f}")
        print(f"  Avg S2 prob for MALIGNANT images: {avg_mal:.3f}")

        if avg_ben < avg_mal:
            print(f'  --> CORRECT class order: ["benign", "malignant"]')
        else:
            print(f'  --> CORRECT class order: ["malignant", "benign"]')
        print(f"  --> Recommended threshold: {(avg_ben + avg_mal) / 2:.2f}")

    print("\n" + "=" * 80)
    print("  DONE - Use the above to set config.py correctly")
    print("=" * 80)


if __name__ == "__main__":
    main()
