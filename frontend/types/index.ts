export interface PredictionResponse {
  cancer_type: string;
  stage1_label: string;
  stage1_confidence: number;
  stage2_label: string | null;
  stage2_confidence: number | null;
  is_mock: boolean;
  message: string;
  total_patches?: number;
  positive_patches?: number;
  positive_pct?: number;
  top_k_confidence?: number;
  patch_breakdown?: {
    normal: number;
    abnormal: number;
    benign: number;
    malignant: number;
  };
  annotated_image?: string;
}

export type CancerType = "breast" | "lung" | "skin" | "oral";

export interface CancerTypeConfig {
  id: CancerType;
  label: string;
  description: string;
  imageHint: string;
  available: boolean;
}

export interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface StepItem {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface NavLink {
  label: string;
  href: string;
}