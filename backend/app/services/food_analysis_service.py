import os
import json
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from openai import OpenAI

from app.models import (
    BigFiveTraits,
    UserBehavior,
    UserGoal,
    FoodAnalysis,
    User,
    FoodUpdate,
)
from app.utils.get_current_time import get_current_time

logger = logging.getLogger(__name__)

# OpenAI client (uses OPENAI_API_KEY from env)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _get_user_context(user_id: int, db: Session) -> dict:
    """
    Collect Big Five dominant trait, prioritized behavior, and today's goal.
    Falls back to reasonable defaults if something is missing.
    """
    # Default values (fallbacks)
    trait = "Conscientiousness"
    behavior = "General Eating Habits"
    goal = "General Mindful Eating"

    # Big Five dominant trait
    big_five = db.query(BigFiveTraits).filter(BigFiveTraits.user_id == user_id).first()
    if big_five and big_five.max_value:
        trait = big_five.max_value

    # Eating behavior (prefer first_priority, then high_priority)
    behavior_record = (
        db.query(UserBehavior)
        .filter(
            UserBehavior.user_id == user_id,
            UserBehavior.first_priority.is_(True),
        )
        .first()
    )

    if not behavior_record:
        behavior_record = (
            db.query(UserBehavior)
            .filter(
                UserBehavior.user_id == user_id,
                UserBehavior.high_priority.is_(True),
            )
            .first()
        )

    if behavior_record and behavior_record.behavior_title:
        behavior = behavior_record.behavior_title

    # Today's goal (latest goal created today)
    now = get_current_time()
    start_of_day = datetime(now.year, now.month, now.day)
    end_of_day = start_of_day + timedelta(days=1)

    goal_record = (
        db.query(UserGoal)
        .filter(
            UserGoal.user_id == user_id,
            UserGoal.created_at >= start_of_day,
            UserGoal.created_at < end_of_day,
        )
        .order_by(UserGoal.created_at.desc())
        .first()
    )

    if goal_record and goal_record.goal_text:
        goal = goal_record.goal_text

    return {
        "trait": trait,
        "behavior": behavior,
        "goal": goal,
    }

def _call_openai_food_analysis(
    base64_image: str,
    trait: str,
    behavior: str,
    goal: str,
    description: str | None = None,
) -> dict:

    if not base64_image:
        raise ValueError("base64_image is required for food analysis")

    # CLEAN base64: remove prefix if exists
    clean_base64 = base64_image.split(",")[-1]

    user_description = description or "N/A"

    prompt = f"""
        You are a mindful eating assistant.

        Analyze the user's food image together with their context and respond ONLY with a JSON object.
        Do NOT include any extra text before or after the JSON.

        Context:
        - Dominant Big Five trait: {trait}
        - Selected eating behavior: {behavior}
        - Today's goal: {goal}
        - User's own description of the food (may be empty): {user_description}

        Your JSON must follow this schema:

        {{
        "food_identified": string,
        "correction": string,
        "is_healthy": boolean,
        "goal_alignment": string,
        "trait_advice": string,
        "general_advice": string
        }}
        """

    response = client.responses.create(
        model="gpt-4.1",
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/jpeg;base64,{clean_base64}",
                    },
                ],
            }
        ],
    )

    try:
        text = response.output[0].content[0].text
    except Exception as e:
        logger.error(f"Unexpected OpenAI response structure: {e}")
        raise

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        logger.error("Failed to decode JSON from OpenAI response, returning fallback.")
        data = {
            "food_identified": None,
            "correction": "",
            "is_healthy": None,
            "goal_alignment": "",
            "trait_advice": "",
            "general_advice": text,
        }

    return data


def analyze_and_store_food_update(
    current_user: User,
    food_update: FoodUpdate,
    first_image_base64: str | None,
    db: Session,
) -> dict | None:
    """
    High-level helper:
    - builds user context
    - calls OpenAI Vision
    - stores result in food_analysis table
    - returns a dict ready for API response

    Returns None if analysis could not be performed.
    """
    if not first_image_base64:
        logger.info(
            f"Skipping food analysis for food_update_id={food_update.id}: no image."
        )
        return None

    context = _get_user_context(current_user.id, db)

    try:
        ai_data = _call_openai_food_analysis(
            base64_image=first_image_base64,
            trait=context["trait"],
            behavior=context["behavior"],
            goal=context["goal"],
            description=food_update.description,
        )
    except Exception as e:
        logger.error(
            f"OpenAI Vision analysis failed for food_update_id={food_update.id}: {e}"
        )
        return None

    personalized_advice = (
        (ai_data.get("trait_advice") or "") + " " + (ai_data.get("general_advice") or "")
    ).strip()

    analysis = FoodAnalysis(
        user_id=current_user.id,
        food_update_id=food_update.id,
        food_identified=ai_data.get("food_identified"),
        is_healthy=ai_data.get("is_healthy"),
        goal_alignment=ai_data.get("goal_alignment"),
        trait_advice=ai_data.get("trait_advice"),
        general_advice=ai_data.get("general_advice"),
        correction=ai_data.get("correction"),
        personalized_advice=personalized_advice,
        raw_response=ai_data,
        created_at=get_current_time(),
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "food_identified": analysis.food_identified,
        "is_healthy": analysis.is_healthy,
        "goal_alignment": analysis.goal_alignment,
        "personalized_advice": analysis.personalized_advice,
        "correction": analysis.correction,
    }