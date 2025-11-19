import os
import re
import logging
from datetime import datetime, date
from sqlalchemy.exc import SQLAlchemyError

from app.models import UserBehavior, UserGoal, UserTips
from app.utils.get_current_time import get_current_time
from models.llm_manager import (
    predict_dominant_trait,
    generate_tip,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

MOCK = os.getenv("MOCK", "false").lower() in ("true", "True")


def clean_text(text, preserve_paragraphs=False):
    if not text:
        return text

    text = re.sub(r"[\u200b\u200c\u200d\u202a-\u202e]", "", text)
    text = re.sub(
        r"[\xa0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f\u3000\ufeff]", " ", text
    )
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    if preserve_paragraphs:
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
    else:
        text = re.sub(r"\s+", " ", text)

    text = re.sub(r"[^a-zA-Z0-9,.!?;:\"'\-–—\s]", "", text)
    return text.strip()


def store_tips(user_id, tips_text, db):
    today = date.today()
    existing_tip = (
        db.query(UserTips)
        .filter(
            UserTips.user_id == user_id,
            UserTips.created_at >= datetime.combine(today, datetime.min.time()),
            UserTips.created_at <= datetime.combine(today, datetime.max.time()),
        )
        .first()
    )

    if existing_tip:
        existing_tip.tips_text = tips_text
        db.commit()
        logger.info(f"Tip updated for user {user_id} on {today}.")
    else:
        new_tip = UserTips(
            user_id=user_id, tips_text=tips_text, created_at=get_current_time()
        )
        db.add(new_tip)
        db.commit()
        logger.info(f"New tip stored for user {user_id} on {today}.")


def generate_user_tips(user_id, db):
    """Generate tip ONLY if goal exists for today."""
    try:
        today = date.today()

        # Fetch goal
        goal = (
            db.query(UserGoal)
            .filter(
                UserGoal.user_id == user_id,
                UserGoal.created_at >= datetime.combine(today, datetime.min.time()),
                UserGoal.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if not goal:
            logger.info(f"No goal found for user {user_id}. Skipping tip generation.")
            return

        user_goal = goal.goal_text or ""

        # Fetch behavior
        behavior = (
            db.query(UserBehavior)
            .filter(UserBehavior.user_id == user_id)
            .first()
        )
        behavior_title = behavior.behavior_title if behavior else "general mindful eating"

        # Predict personality
        try:
            trait_result = predict_dominant_trait(user_goal or behavior_title)
            dominant_trait = trait_result["dominant_trait"]
            logger.info(f"Predicted dominant trait for user {user_id}: {dominant_trait}")
        except Exception as e:
            dominant_trait = "Conscientiousness"
            logger.warning(f"Trait prediction failed for user {user_id}. Error: {e}")

        # Generate tip
        try:
            if MOCK:
                tip_text = "Remember to hydrate and appreciate each bite today."
            else:
                tip_text = generate_tip(dominant_trait, behavior_title)

            cleaned = clean_text(tip_text)
            store_tips(user_id, cleaned, db)

            logger.info(
                f"Generated Tip | UserID={user_id} | Trait={dominant_trait} | Behavior='{behavior_title}' | Goal='{user_goal[:60]}' | Tip={cleaned}"
            )

        except Exception as e:
            logger.error(f"Failed to generate or store tip for user {user_id}: {e}")

    except Exception as e:
        logger.error(f"Unexpected error in generate_user_tips for user {user_id}: {e}")