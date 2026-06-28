"""
╔══════════════════════════════════════════════════════════════════════╗
║        PATCH PREDICTION DIAGNOSTIC TOOL                              ║
║                                                                      ║
║  Runs a TIFF image through the full pipeline and shows:              ║
║    - Per-patch raw probabilities                                     ║
║    - Probability distribution histogram                              ║
║    - What different K values and thresholds would predict             ║
║    - Which patches are most suspicious                               ║
╚══════════════════════════════════════════════════════════════════════╝

Usage:
  python diagnose_predictions.py IMG010.tif
  python diagnose_predictions.py IMG018.tif
  python diagnose_predictions.py "C:\full\path\to\image.tif"
"""

import sys
import os
import numpy as np

# Add backend to path so we can import the app modules
BACKEND_DIR = r"c:\Users\Gimhana Menake\Desktop\CurieSense AI\multi-cancer-detection-system\backend"
sys.path.insert(0, BACKEND_DIR)

TIFF_DIR = r"C:\Users\Gimhana Menake\Desktop\exp\danger_zone\dataset 5 (tiff)\TIFF Images"


def main():
    if len(sys.argv) < 2:
        print("Usage: python diagnose_predictions.py <image_path_or_name>")
        print("Example: python diagnose_predictions.py IMG010.tif")
        sys.exit(1)

    img_input = sys.argv[1]

    # Resolve image path
    if os.path.exists(img_input):
        img_path = img_input
    elif os.path.exists(os.path.join(TIFF_DIR, img_input)):
        img_path = os.path.join(TIFF_DIR, img_input)
    else:
        print(f"ERROR: Cannot find image: {img_input}")
        sys.exit(1)

    print(f"\n{'='*70}")
    print(f"  DIAGNOSING: {os.path.basename(img_path)}")
    print(f"{'='*70}\n")

    # ── Load TensorFlow and models ──
    print("Loading TensorFlow...")
    import tensorflow as tf
    tf.get_logger().setLevel('ERROR')

    from app.config import CANCER_CONFIGS

    cfg = CANCER_CONFIGS["breast"]
    s1_path = cfg["stage1"]["path"]
    s2_path = cfg["stage2"]["path"]

    print(f"  Stage 1 model: {s1_path.name}")
    print(f"  Stage 2 model: {s2_path.name}")

    from app.services.inference import _load_model_compat
    model_s1 = _load_model_compat(s1_path, tf) if s1_path.exists() else None
    model_s2 = _load_model_compat(s2_path, tf) if s2_path.exists() else None

    if model_s1 is None:
        print("  ERROR: Stage 1 model not found!")
        sys.exit(1)

    # ── Run preprocessing pipeline ──
    print("\nRunning preprocessing pipeline...")
    from app.utils.super_preprocessor import SuperPreprocessor

    preprocessor = SuperPreprocessor()

    with open(img_path, "rb") as f:
        file_bytes = f.read()

    img = preprocessor.standardize_image(file_bytes)
    print(f"  Original size: {img.shape}")

    cropped = preprocessor.crop_and_clean(img)
    print(f"  After crop: {cropped.shape}")

    resized = preprocessor.resize_to_training_scale(cropped)
    print(f"  After resize: {resized.shape}")

    patches, coords, total, removed = preprocessor.extract_patches(resized)
    print(f"  Patches: {len(patches)} valid / {total} total ({removed} removed)")

    if len(patches) == 0:
        print("  ERROR: No valid patches extracted!")
        sys.exit(1)

    batch = preprocessor.prepare_batch(patches)
    print(f"  Batch shape: {batch.shape}")

    # ── Stage 1: Per-patch predictions ──
    print(f"\n{'='*70}")
    print("  STAGE 1: Normal vs Abnormal")
    print(f"  Classes: {cfg['stage1']['classes']}")
    print(f"  Threshold: {cfg['stage1']['threshold']}")
    print(f"{'='*70}\n")

    s1_probs = model_s1.predict(batch, batch_size=64, verbose=0).ravel()

    # Show per-patch probabilities
    print("  Per-patch raw probabilities (sigmoid output):")
    print("  " + "-" * 50)
    for i, prob in enumerate(s1_probs):
        label = "NORMAL" if prob >= 0.5 else "ABNORMAL"
        bar = "#" * int(prob * 40)
        marker = " <-- suspicious" if prob < 0.5 else ""
        print(f"  Patch {i:3d}: {prob:.4f}  [{bar:<40}] {label}{marker}")

    # Distribution stats
    print(f"\n  Distribution:")
    print(f"    Mean:   {np.mean(s1_probs):.4f}")
    print(f"    Median: {np.median(s1_probs):.4f}")
    print(f"    Std:    {np.std(s1_probs):.4f}")
    print(f"    Min:    {np.min(s1_probs):.4f}")
    print(f"    Max:    {np.max(s1_probs):.4f}")

    below_threshold = np.sum(s1_probs < 0.5)
    print(f"\n    Patches below 0.5 (abnormal): {below_threshold}/{len(s1_probs)} ({below_threshold/len(s1_probs)*100:.1f}%)")

    # What different K values would produce
    print(f"\n  Aggregation analysis (what different K values give):")
    print(f"  {'K':>3} | {'Top-K Lowest Avg':>18} | {'Decision':>10} | {'Confidence':>12}")
    print(f"  " + "-" * 55)

    sorted_probs = np.sort(s1_probs)
    for k in [1, 3, 5, 10, len(s1_probs)]:
        k_actual = min(k, len(s1_probs))
        top_k_low = sorted_probs[:k_actual]
        avg = np.mean(top_k_low)
        decision = "ABNORMAL" if avg < 0.5 else "NORMAL"
        conf = (1.0 - avg) if avg < 0.5 else avg
        marker = " <--" if k == 10 else ""
        print(f"  {k_actual:3d} | {avg:18.4f} | {decision:>10} | {conf*100:10.1f}%{marker}")

    # What different thresholds would produce (with K=10)
    k = min(10, len(s1_probs))
    top_k_avg = np.mean(sorted_probs[:k])
    print(f"\n  Threshold analysis (with K={k}, top-K avg = {top_k_avg:.4f}):")
    print(f"  {'Threshold':>10} | {'Decision':>10} | {'Confidence':>12}")
    print(f"  " + "-" * 40)
    for thresh in [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6]:
        decision = "ABNORMAL" if top_k_avg < thresh else "NORMAL"
        conf = (1.0 - top_k_avg) if top_k_avg < thresh else top_k_avg
        marker = " <-- current" if thresh == 0.5 else ""
        print(f"  {thresh:10.2f} | {decision:>10} | {conf*100:10.1f}%{marker}")

    # ── Stage 2: Per-patch predictions ──
    if model_s2 is not None:
        print(f"\n{'='*70}")
        print("  STAGE 2: Benign vs Malignant")
        print(f"  Classes: {cfg['stage2']['classes']}")
        print(f"  Threshold: {cfg['stage2']['threshold']}")
        print(f"{'='*70}\n")

        s2_probs = model_s2.predict(batch, batch_size=64, verbose=0).ravel()

        print("  Per-patch raw probabilities:")
        print("  " + "-" * 50)
        for i, prob in enumerate(s2_probs):
            label = "MALIGNANT" if prob >= 0.5 else "BENIGN"
            bar = "#" * int(prob * 40)
            print(f"  Patch {i:3d}: {prob:.4f}  [{bar:<40}] {label}")

        print(f"\n  Distribution:")
        print(f"    Mean:   {np.mean(s2_probs):.4f}")
        print(f"    Median: {np.median(s2_probs):.4f}")
        print(f"    Min:    {np.min(s2_probs):.4f}")
        print(f"    Max:    {np.max(s2_probs):.4f}")

        above_threshold = np.sum(s2_probs >= 0.5)
        print(f"\n    Patches above 0.5 (malignant): {above_threshold}/{len(s2_probs)} ({above_threshold/len(s2_probs)*100:.1f}%)")

    print(f"\n{'='*70}")
    print("  DIAGNOSIS COMPLETE")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
