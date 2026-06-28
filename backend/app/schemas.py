from pydantic import BaseModel
from typing import Optional


class PredictionResponse(BaseModel):
    cancer_type: str
    stage1_label: str
    stage1_confidence: float
    stage2_label: Optional[str] = None
    stage2_confidence: Optional[float] = None
    is_mock: bool = False
    message: str

    # Patch analysis stats (only present for full-image pipeline)
    total_patches: Optional[int] = None
    positive_patches: Optional[int] = None
    positive_pct: Optional[float] = None
    top_k_confidence: Optional[float] = None
    
    # Detailed breakdown for the frontend UI
    patch_breakdown: Optional[dict] = None
    
    # Visual heatmap overlay (base64 string)
    annotated_image: Optional[str] = None