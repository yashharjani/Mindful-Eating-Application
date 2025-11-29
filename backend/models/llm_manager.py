import os
import time
import logging
from typing import Dict, Optional, List

import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TIP_LLM_URL = os.getenv("TIP_LLM_URL", "http://localhost:9000/generate")
TRAIT_SERVER_URL = os.getenv(
    "TRAIT_SERVER_URL",
    "http://localhost:9100/predict-trait",
)

MODEL_PRELOADED = False


def preload_all_models():
    """
    Called once at server startup.
    We no longer load any heavy local models.
    All heavy work is delegated to remote GPU services.
    """
    global MODEL_PRELOADED
    if MODEL_PRELOADED:
        return

    logger.info(
        "No local ML models to preload. Using remote GPU services for "
        "tip generation and trait prediction."
    )
    MODEL_PRELOADED = True


def wait_until_models_ready():
    """
    Kept for backward compatibility.
    Now only waits until preload_all_models() sets the flag.
    """
    global MODEL_PRELOADED
    while not MODEL_PRELOADED:
        logger.info("Waiting for model preload to complete...")
        time.sleep(0.5)

def generate_tip(trait: str, behavior_text: str) -> str:
    wait_until_models_ready()

    prompt = f"""
    ### Instruction:
    Generate a short, personalized mindful eating tip based on the user's dominant trait and selected eating behavior.

    ### Input:
    Dominant Trait: {trait}
    Eating Behavior: {behavior_text}

    ### Response:
    Tip:
    """.strip()

    try:
        response = requests.post(
            TIP_LLM_URL,
            json={
                "prompt": prompt,
                "max_new_tokens": 80,
                "temperature": 0.7,
                "top_p": 0.9,
                "repetition_penalty": 1.1
            },
            timeout=60
        )
        response.raise_for_status()
        result = response.json().get("response", "").strip()

        # === Cleaning exactly like Colab ===
        if "Tip:" in result:
            cleaned = result.split("Tip:", 1)[1]
        else:
            cleaned = result

        cleaned = cleaned.split("###")[0].strip()

        return "Tip: " + cleaned

    except Exception as e:
        logger.error(f"Error calling remote GPU LLM: {e}")
        return "Tip: Try eating slowly and paying attention to each bite today."


def predict_dominant_trait(
    text: str, raw_traits: Optional[List[float]] = None
) -> Dict[str, object]:
    """
    Call remote trait prediction server on GPU.
    """
    wait_until_models_ready()

    payload = {"text": text}
    if raw_traits is not None:
        payload["raw_traits"] = raw_traits

    try:
        resp = requests.post(TRAIT_SERVER_URL, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        dominant = data.get("dominant_trait", "Conscientiousness")
        scores = data.get("trait_scores", {})

        return {
            "dominant_trait": dominant,
            "trait_scores": scores,
        }

    except Exception as e:
        logger.error(f"Error calling remote trait prediction service: {e}")
        return {
            "dominant_trait": "Conscientiousness",
            "trait_scores": {},
        }