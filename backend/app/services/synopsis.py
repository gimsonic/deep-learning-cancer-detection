"""
Synopsis Service — Generates AI-powered clinical synopses using Google Gemini API.

Takes prediction results (cancer type, labels, confidence scores) and produces
a structured medical synopsis with risk assessment and recommendations.

Falls back to template-based synopses if Gemini API is unavailable.
"""

import os
from typing import Optional

# Will be set to True if Gemini API is available
GEMINI_AVAILABLE = False
_client = None

def _init_gemini():
    """Attempt to initialize the Gemini client from GEMINI_API_KEY env var."""
    global GEMINI_AVAILABLE, _client
    
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("[WARN] GEMINI_API_KEY not set — synopsis will use fallback templates")
        return
    
    try:
        from google import genai
        _client = genai.Client(api_key=api_key)
        GEMINI_AVAILABLE = True
        print("[INFO] Gemini API ready for synopsis generation")
    except Exception as e:
        print(f"[WARN] Failed to initialize Gemini client: {e}")
        GEMINI_AVAILABLE = False


# Initialize on module import
_init_gemini()


def _build_prompt(
    cancer_type: str,
    stage1_label: str,
    stage1_confidence: float,
    stage2_label: Optional[str],
    stage2_confidence: Optional[float],
    histo_label: Optional[str],
    histo_confidence: Optional[float],
) -> str:
    """Build a structured prompt for Gemini based on prediction results."""
    
    cancer_names = {
        "breast": "Breast Cancer (Mammogram Analysis)",
        "lung": "Lung Cancer (Chest X-ray Analysis)",
        "skin": "Skin Cancer (Dermoscopy Analysis)",
        "oral": "Oral Cancer (Oral Cavity Image Analysis)",
    }
    
    cancer_display = cancer_names.get(cancer_type, cancer_type.title())
    
    results_section = f"""Cancer Type: {cancer_display}
Stage 1 — Screening (Normal vs Abnormal): {stage1_label.capitalize()} (confidence: {stage1_confidence:.2f})"""
    
    if stage2_label and stage2_confidence is not None:
        results_section += f"""
Stage 2 — Classification (Benign vs Malignant): {stage2_label.capitalize()} (confidence: {stage2_confidence:.2f})"""
    
    if histo_label and histo_confidence is not None:
        results_section += f"""
Stage 3 — Histopathology Confirmation: {histo_label.capitalize()} (confidence: {histo_confidence:.2f})"""
    
    prompt = f"""You are a medical AI assistant integrated into a cancer detection research tool called CurieSense AI. 
Your task is to generate a clinical synopsis based on deep learning prediction results.

PREDICTION RESULTS:
{results_section}

INSTRUCTIONS:
Generate a structured clinical synopsis with exactly these sections. Use markdown formatting.

1. **Summary** — A 2-3 sentence overview of the findings. Be clear and factual.

2. **Risk Assessment** — Classify as exactly one of: Low / Moderate / High / Critical
   - Low: Stage 1 Normal with high confidence (>0.8)
   - Moderate: Stage 1 Abnormal but Stage 2 Benign, OR Normal with low confidence (<0.6)
   - High: Stage 2 Malignant with moderate confidence (0.5-0.8)
   - Critical: Stage 2 Malignant with high confidence (>0.8), or histopathology confirms malignancy

3. **Recommended Next Steps** — 3-5 bullet points of clinical actions appropriate for the risk level.

4. **Lifestyle & Preventive Guidance** — 3-4 bullet points of relevant dietary/lifestyle suggestions specific to the cancer type.

5. **Important Notes** — 2-3 bullet points reminding that this is AI-assisted and not a replacement for professional diagnosis.

RULES:
- Be professional but accessible to non-medical users
- Do NOT diagnose — frame everything as "the model suggests" or "findings indicate"
- Keep the total response under 400 words
- Use bullet points (•) for lists
- At the very start, on its own line, output ONLY the risk level word: Low, Moderate, High, or Critical
"""
    
    return prompt


def _determine_risk_level(
    stage1_label: str,
    stage1_confidence: float,
    stage2_label: Optional[str],
    stage2_confidence: Optional[float],
    histo_label: Optional[str],
    histo_confidence: Optional[float],
) -> str:
    """Determine the risk level based on prediction results."""
    s1_normal = stage1_label.lower() == "normal"
    
    # If histopathology says malignant
    if histo_label and histo_label.lower() == "malignant":
        return "Critical"
    
    # Stage 2 malignant
    if stage2_label and stage2_label.lower() == "malignant":
        if stage2_confidence and stage2_confidence > 0.8:
            return "Critical"
        return "High"
    
    # Stage 2 benign (meaning Stage 1 was abnormal)
    if stage2_label and stage2_label.lower() == "benign":
        return "Moderate"
    
    # Stage 1 normal
    if s1_normal:
        if stage1_confidence > 0.8:
            return "Low"
        return "Moderate"
    
    # Stage 1 abnormal but no Stage 2
    return "High"


def _generate_fallback(
    cancer_type: str,
    stage1_label: str,
    stage1_confidence: float,
    stage2_label: Optional[str],
    stage2_confidence: Optional[float],
    histo_label: Optional[str],
    histo_confidence: Optional[float],
) -> str:
    """Generate a template-based synopsis when Gemini API is unavailable."""
    
    risk = _determine_risk_level(
        stage1_label, stage1_confidence,
        stage2_label, stage2_confidence,
        histo_label, histo_confidence,
    )
    
    cancer_names = {
        "breast": "breast tissue",
        "lung": "lung tissue",
        "skin": "skin lesion",
        "oral": "oral cavity",
    }
    tissue = cancer_names.get(cancer_type, cancer_type)
    
    # Build summary
    if stage1_label.lower() == "normal":
        summary = f"The screening model classified the {tissue} image as **normal** with a confidence of {stage1_confidence:.0%}. No suspicious abnormalities were detected by the deep learning model."
    elif stage2_label:
        summary = f"The screening model detected an **abnormality** in the {tissue} image (confidence: {stage1_confidence:.0%}). Further classification identified the finding as **{stage2_label.lower()}** with {stage2_confidence:.0%} confidence."
        if histo_label:
            summary += f" Histopathology analysis classified the tissue as **{histo_label.lower()}** ({histo_confidence:.0%} confidence)."
    else:
        summary = f"The screening model detected an **abnormality** in the {tissue} image with a confidence of {stage1_confidence:.0%}."
    
    # Build recommendations based on risk
    if risk == "Low":
        recommendations = """• Continue with routine screening as recommended by your healthcare provider
• Maintain regular check-up schedule
• No immediate clinical action appears necessary based on this screening
• Keep records of this analysis for future reference"""
    elif risk == "Moderate":
        recommendations = """• Consult with a specialist for a thorough clinical evaluation
• Consider additional imaging or diagnostic tests as recommended
• Schedule a follow-up appointment within 2-4 weeks
• Monitor for any changes or new symptoms"""
    elif risk == "High":
        recommendations = """• Seek prompt medical consultation with an oncologist
• Request confirmatory diagnostic tests (biopsy, advanced imaging)
• Do not delay — schedule an appointment as soon as possible
• Bring this analysis report to your healthcare provider
• Consider seeking a second medical opinion"""
    else:  # Critical
        recommendations = """• **Urgent**: Seek immediate medical consultation
• Request priority referral to an oncology specialist
• Confirmatory biopsy and staging studies are strongly recommended
• Bring this analysis along with all imaging to your appointment
• Do not delay treatment discussions with your medical team"""
    
    # Lifestyle guidance by cancer type
    lifestyle_map = {
        "breast": """• Maintain a balanced diet rich in fruits, vegetables, and whole grains
• Engage in regular physical activity (at least 150 minutes/week)
• Limit alcohol consumption and avoid tobacco
• Perform regular self-examinations between clinical screenings""",
        "lung": """• If applicable, seek support for smoking cessation
• Avoid exposure to secondhand smoke and air pollutants
• Maintain a diet rich in antioxidants (fruits, vegetables)
• Practice deep breathing exercises and stay physically active""",
        "skin": """• Apply broad-spectrum SPF 30+ sunscreen daily
• Avoid prolonged sun exposure, especially between 10 AM - 4 PM
• Wear protective clothing and wide-brimmed hats outdoors
• Monitor existing moles for changes in size, shape, or color""",
        "oral": """• Maintain excellent oral hygiene with regular dental check-ups
• Avoid tobacco products and limit alcohol consumption
• Eat a diet rich in fruits, vegetables, and omega-3 fatty acids
• Be aware of persistent sores, lumps, or discoloration in the mouth""",
    }
    lifestyle = lifestyle_map.get(cancer_type, "• Follow general healthy lifestyle guidelines\n• Maintain regular medical check-ups")
    
    synopsis = f"""**Summary**

{summary}

**Risk Assessment: {risk}**

**Recommended Next Steps**

{recommendations}

**Lifestyle & Preventive Guidance**

{lifestyle}

**Important Notes**

• This analysis is generated by an AI model and is intended for **research and decision-support purposes only**
• These results should **not** be used as a standalone diagnosis — always consult a qualified medical professional
• Confidence scores reflect model certainty, not the absolute probability of disease"""
    
    return synopsis


async def generate_synopsis(
    cancer_type: str,
    stage1_label: str,
    stage1_confidence: float,
    stage2_label: Optional[str] = None,
    stage2_confidence: Optional[float] = None,
    histo_label: Optional[str] = None,
    histo_confidence: Optional[float] = None,
) -> dict:
    """
    Generate a clinical synopsis using Gemini API, with template fallback.
    Returns: { synopsis: str, risk_level: str, is_fallback: bool }
    """
    
    risk_level = _determine_risk_level(
        stage1_label, stage1_confidence,
        stage2_label, stage2_confidence,
        histo_label, histo_confidence,
    )
    
    # Try Gemini API first
    if GEMINI_AVAILABLE and _client is not None:
        try:
            prompt = _build_prompt(
                cancer_type, stage1_label, stage1_confidence,
                stage2_label, stage2_confidence,
                histo_label, histo_confidence,
            )
            
            response = _client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            
            text = response.text.strip()
            
            # Extract risk level from the first line if present
            first_line = text.split("\n")[0].strip()
            if first_line in ("Low", "Moderate", "High", "Critical"):
                risk_level = first_line
                text = "\n".join(text.split("\n")[1:]).strip()
            
            return {
                "synopsis": text,
                "risk_level": risk_level,
                "is_fallback": False,
            }
        
        except Exception as e:
            print(f"[WARN] Gemini API call failed, using fallback: {e}")
    
    # Fallback to template
    fallback_text = _generate_fallback(
        cancer_type, stage1_label, stage1_confidence,
        stage2_label, stage2_confidence,
        histo_label, histo_confidence,
    )
    
    return {
        "synopsis": fallback_text,
        "risk_level": risk_level,
        "is_fallback": True,
    }
