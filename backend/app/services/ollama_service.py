import logging
from models.llm_manager import (
    generate_tip,
    predict_dominant_trait,
    # predict_dominant_trait_from_text,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def generate_result(prompt: str, model: str) -> str:
    """
    Backward-compatible shim for older code that expected Ollama HTTP responses.
    It now routes requests to local models (SmolLM + MLP).
    """

    # Default fallbacks
    trait = "Conscientiousness"
    behavior = "balanced eating"

    try:
        # Try to extract info from prompt text
        for ln in prompt.splitlines():
            low = ln.lower()
            if "dominant" in low and ":" in ln:
                trait = ln.split(":", 1)[1].strip() or trait
            elif "eating" in low and ":" in ln:
                behavior = ln.split(":", 1)[1].strip() or behavior
    except Exception as e:
        logger.warning(f"Prompt parsing fallback used: {e}")

    try:
        # Generate personalized tip using SmolLM
        tip = generate_tip(trait, behavior)
        return tip
    except Exception as e:
        logger.error(f"Failed to generate tip: {e}")
        return f"Tip generation failed due to: {str(e)}"


# Explicit helper for new code
def generate_mindful_tip(trait: str, behavior_text: str) -> str:
    """Directly generate a mindful eating tip."""
    return generate_tip(trait, behavior_text)


def predict_personality_from_text(input_text: str) -> dict:
    """Return predicted trait and probabilities."""
    try:
        return predict_dominant_trait(input_text)
    except Exception as e:
        logger.error(f"Personality prediction failed: {e}")
        return {"dominant_trait": "Conscientiousness", "trait_scores": {}}