# ─────────────────────────────────────────────────────────────────
# Breast Cancer Preprocessing Pipeline
# 
# Full-size mammogram → Grayscale → Tissue crop → 224x224 patches
# 
# This is ONLY for breast cancer (grayscale mammograms).
# Other cancer types (skin, oral, lung) will have their own 
# preprocessors because they use different image types and models.
# ─────────────────────────────────────────────────────────────────

import cv2
import numpy as np
from io import BytesIO
from PIL import Image


class SuperPreprocessor:
    """
    Preprocesses full-size mammograms for patch-based inference.
    
    Pipeline:
      1. standardize  → Raw bytes to grayscale uint8 array
      2. crop_and_clean → Find tissue, remove black background
      3. extract_patches → Sliding window into 224x224 tiles
      4. prepare_batch → Apply CLAHE, stack into model-ready batch
    
    All mammograms are grayscale. CLAHE matches training pipeline.
    """

    # ── PHASE 1: STANDARDIZE ─────────────────────────────────────
    def standardize_image(self, image_bytes: bytes) -> np.ndarray:
        """Raw upload bytes → grayscale uint8 numpy array (H, W)."""
        
        image = Image.open(BytesIO(image_bytes))
        image = image.convert("L")  # Force grayscale — mammograms are always grayscale
        img = np.array(image, dtype=np.uint8)
        
        return img


    # ── PHASE 2: CROP & CLEAN ────────────────────────────────────
    def crop_and_clean(self, img: np.ndarray) -> np.ndarray:
        """Find tissue using Otsu threshold, mask background, crop to tissue."""
        
        blurred = cv2.GaussianBlur(img, (5, 5), 0)
        
        _, binary_mask = cv2.threshold(
            blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        
        contours, _ = cv2.findContours(
            binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            print("[WARN] No tissue found in mammogram")
            return img
        
        # Keep all contours bigger than 1% of image area
        img_area = img.shape[0] * img.shape[1]
        min_area = img_area * 0.01
        
        significant = [c for c in contours if cv2.contourArea(c) >= min_area]
        if not significant:
            significant = [max(contours, key=cv2.contourArea)]
        
        # Create mask and apply
        clean_mask = np.zeros(img.shape, dtype=np.uint8)
        cv2.drawContours(clean_mask, significant, -1, 255, thickness=cv2.FILLED)
        cleaned = cv2.bitwise_and(img, img, mask=clean_mask)
        
        # Crop to bounding box of all tissue
        all_points = np.vstack(significant)
        x, y, w, h = cv2.boundingRect(all_points)
        cropped = cleaned[y:y+h, x:x+w]
        
        return cropped

    # -- PHASE 2.5: RE-SCALE IMAGE --
    def resize_to_training_scale(self, img: np.ndarray, target_long_side: int=1024) -> np.ndarray:
        h, w = img.shape[:2]

        if max(h,w) <= target_long_side:
            print(f"[INFO] Image already small enough ({h}x{w}), skipping resize")
            return img
        
        # Calculate new size maintaining aspect ratio
        if h > w:
            new_h = target_long_side
            new_w = int(w * (target_long_side / h))
        else:
            new_w = target_long_side
            new_h = int(h * (target_long_side / w))
        
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        print(f"[INFO] Resized: ({h}x{w}) -> ({new_h}x{new_w})")
        
        return resized


    # ── PHASE 3: CLAHE (matches training exactly) ────────────────
    def apply_clahe(self, img: np.ndarray) -> np.ndarray:
        """
        Gentle CLAHE for mammograms.
        clipLimit=1.5, 8x8 grid.
        No 'rescue pass' — low contrast tissue (like fat) should remain low contrast.
        """
        clahe = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(img)
        
        return enhanced


    # ── PHASE 4: EXTRACT PATCHES ─────────────────────────────────
    def extract_patches(
        self,
        img: np.ndarray,
        patch_size: tuple = (224, 224),
        stride: tuple = (112, 112),
        black_threshold: float = 0.5,
    ) -> tuple:
        """
        Sliding window over the cropped mammogram.
        Skips patches that are >50% black (background noise).
        
        Returns: (patches, coordinates, total_windows, removed_count)
        """
        img_h, img_w = img.shape  # Grayscale → always (H, W)
        
        patches = []
        coordinates = []
        total_windows = 0
        removed_count = 0
        
        if img_h < patch_size[0] or img_w < patch_size[1]:
            print(f"[WARN] Mammogram ({img_h}x{img_w}) smaller than patch size {patch_size}")
            return patches, coordinates, 0, 0
        
        for y in range(0, img_h - patch_size[0] + 1, stride[0]):
            for x in range(0, img_w - patch_size[1] + 1, stride[1]):
                
                patch = img[y:y + patch_size[0], x:x + patch_size[1]]
                total_windows += 1
                
                # Check how much of this patch is black (background)
                black_ratio = np.mean(patch == 0)
                
                if black_ratio < black_threshold:
                    patches.append(patch)
                    coordinates.append((y, x))
                else:
                    removed_count += 1
        
        print(f"[INFO] Patches: {len(patches)} valid / {total_windows} total ({removed_count} removed)")
        
        return patches, coordinates, total_windows, removed_count


    # ── PHASE 5: PREPARE BATCH ───────────────────────────────────
    def prepare_batch(self, patches: list) -> np.ndarray:
        """
        Apply CLAHE to each patch and stack into model-ready batch.
        
        Output shape: (N, 224, 224, 1)  — N patches, grayscale
        Pixel values: [0, 255] — model's ResNet50 handles normalization
        """
        processed = []
        
        for patch in patches:
            enhanced = self.apply_clahe(patch)
            processed.append(enhanced)
        
        # Stack: list of (224,224) → array (N, 224, 224)
        batch = np.array(processed, dtype=np.float32)
        
        # Add channel dim: (N, 224, 224) → (N, 224, 224, 1)
        batch = np.expand_dims(batch, axis=-1)
        
        return batch
