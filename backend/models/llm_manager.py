# import requests
# import os
# import torch
# import joblib
# import numpy as np
# import torch.nn as nn
# import torch.nn.functional as F
# from typing import Dict
# from sentence_transformers import SentenceTransformer
# import logging
# import time

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # ---------------- Remote GPU LLM URL ----------------
# TIP_LLM_URL = os.getenv("TIP_LLM_URL", "http://localhost:9000/generate")

# # ---------------- Local Personality Models ----------------
# TRAIT_SCALER_PATH = "models/trait_scaler.pkl"
# TRAIT_CLASSIFIER_PATH = "models/dominant_classifier_sentence_mlp.pt"

# device = "cuda" if torch.cuda.is_available() else "cpu"

# MODEL_PRELOADED = False

# _embedder = None
# _scaler = None
# _trait_model = None


# # ---------------- WAIT FOR PRELOAD ----------------
# def wait_until_models_ready():
#     """Block until preload_all_models() has completed."""
#     global MODEL_PRELOADED
#     while not MODEL_PRELOADED:
#         logger.info("========= Waiting for local models to finish loading...")
#         time.sleep(0.5)


# # ---------------- PERSONALITY PREDICTOR ----------------
# class MLPClassifier(nn.Module):
#     def __init__(self, in_dim=389, hidden=256, num_classes=5):
#         super().__init__()
#         self.net = nn.Sequential(
#             nn.Linear(in_dim, hidden),
#             nn.ReLU(),
#             nn.Dropout(0.3),
#             nn.Linear(hidden, 128),
#             nn.ReLU(),
#             nn.Dropout(0.2),
#             nn.Linear(128, num_classes),
#         )

#     def forward(self, x):
#         return self.net(x)


# def _load_embedder():
#     global _embedder
#     if _embedder is None:
#         logger.info("========= Loading sentence embedder...")
#         _embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L12-v2")


# def _load_trait_model():
#     global _trait_model, _scaler

#     if _trait_model is None:
#         logger.info("========= Loading trait scaler + classifier...")
#         _scaler = joblib.load(TRAIT_SCALER_PATH)
#         _trait_model = MLPClassifier(389).to(device)
#         state = torch.load(TRAIT_CLASSIFIER_PATH, map_location=device)
#         _trait_model.load_state_dict(state)
#         _trait_model.eval()


# # ---------------- PRELOAD ALL ----------------
# def preload_all_models():
#     """
#     Called ONCE at server startup.
#     Loads ONLY lightweight local models.
#     """
#     global MODEL_PRELOADED

#     if MODEL_PRELOADED:
#         return

#     _load_embedder()
#     _load_trait_model()

#     logger.info("========= Using REMOTE GPU LLM server for tip generation. No local LLM will be loaded.")

#     MODEL_PRELOADED = True
#     logger.info("======= ALL LOCAL MODELS ARE READY ======= ")


# # ---------------- TIP GENERATION (REMOTE GPU) ----------------
# def generate_tip(trait: str, behavior_text: str) -> str:
#     wait_until_models_ready()

#     prompt = f"""
#     You are a mindful eating assistant.

#     Generate ONE short personalized mindful eating tip.
#     KEEP IT TO 1 SENTENCE.
#     DO NOT include "Input:", "Response:", or anything other than the tip.

#     User's dominant trait: {trait}
#     User's eating behavior: {behavior_text}

#     Tip:
#     """.strip()

#     try:
#         response = requests.post(
#             TIP_LLM_URL,
#             json={"prompt": prompt, "max_new_tokens": 120},
#             timeout=50
#         )
#         response.raise_for_status()
#         result = response.json().get("response", "").strip()

#         # # Clean final format
#         # if "Tip:" in result:
#         #     result = result.split("Tip:", 1)[-1].strip()

#         # return "Tip: " + result

#         # Extract only the FIRST Tip: ... sentence
#         if "Tip:" in result:
#             cleaned = result.split("Tip:", 1)[1].strip()
#         else:
#             cleaned = result.strip()

#         # Remove any leftover "Input:", "Response:", "Task", etc.
#         stop_words = ["Input:", "Response:", "Task", "Dominant Trait:", "Eating Behavior:"]
#         for sw in stop_words:
#             if sw in cleaned:
#                 cleaned = cleaned.split(sw)[0].strip()

#         # Limit to first 1–2 sentences
#         if "." in cleaned:
#             cleaned = cleaned.split(".")[0].strip() + "."

#         return "Tip: " + cleaned

#     except Exception as e:
#         logger.error(f"====== Error calling remote GPU LLM: {e}")
#         return "Tip: Try eating slowly and paying attention to each bite today."


# # ---------------- PERSONALITY PREDICTION ----------------
# LABELS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
# DOMINANT_MAP = {
#     0: "Openness",
#     1: "Conscientiousness",
#     2: "Extraversion",
#     3: "Agreeableness",
#     4: "Neuroticism",
# }

# def predict_dominant_trait(text: str, raw_traits=None):
#     wait_until_models_ready()

#     if raw_traits is None:
#         raw_traits = np.array([0.5] * 5)

#     emb = _embedder.encode([text], convert_to_numpy=True)
#     scaled = _scaler.transform([raw_traits])
#     X = np.hstack((emb, scaled))

#     with torch.no_grad():
#         logits = _trait_model(torch.tensor(X, dtype=torch.float32).to(device))
#         probs = F.softmax(logits, dim=1).cpu().numpy().flatten()

#     idx = int(np.argmax(probs))

#     return {
#         "dominant_trait": DOMINANT_MAP[idx],
#         "trait_scores": {LABELS[i]: float(probs[i]) for i in range(5)}
#     }

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


# def generate_tip(trait: str, behavior_text: str) -> str:
#     """
#     Call remote GPU LLM server to generate a mindful eating tip.
#     """
#     wait_until_models_ready()

#     prompt = f"""
#     You are a mindful eating assistant.

#     Generate ONE short personalized mindful eating tip.
#     KEEP IT TO 1 SENTENCE.
#     DO NOT include "Input:", "Response:", or anything other than the tip.

#     User's dominant trait: {trait}
#     User's eating behavior: {behavior_text}

#     Tip:
#     """.strip()

#     try:
#         response = requests.post(
#             TIP_LLM_URL,
#             json={"prompt": prompt, "max_new_tokens": 120},
#             timeout=50,
#         )
#         response.raise_for_status()
#         result = response.json().get("response", "").strip()

#         if "Tip:" in result:
#             cleaned = result.split("Tip:", 1)[1].strip()
#         else:
#             cleaned = result.strip()

#         stop_words = [
#             "Input:",
#             "Response:",
#             "Task",
#             "Dominant Trait:",
#             "Eating Behavior:",
#         ]
#         for sw in stop_words:
#             if sw in cleaned:
#                 cleaned = cleaned.split(sw)[0].strip()

#         if "." in cleaned:
#             cleaned = cleaned.split(".")[0].strip() + "."

#         return "Tip: " + cleaned

#     except Exception as e:
#         logger.error(f"Error calling remote GPU LLM: {e}")
#         return "Tip: Try eating slowly and paying attention to each bite today."

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