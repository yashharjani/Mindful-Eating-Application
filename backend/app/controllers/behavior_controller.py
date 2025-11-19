import logging
import os
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.models.behavior import UserBehavior
from app.schemas.behavior import SubmitBehaviorsRequest

# Configure logger to capture application logs
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def load_behaviors():
    """
    Loads all eating behaviors from environment variables into a list.
    Returns:
        list: A list of behavior data dictionaries.
    """
    behaviors = []
    i = 1
    while True:
        behavior_data = os.getenv(f"BEHAVIOR_{i}")
        if not behavior_data:
            break
        behaviors.append(json.loads(behavior_data))
        i += 1
    return behaviors


BEHAVIORS = load_behaviors()


def get_behaviors():
    """
    Returns all behavior types in a response format.
    """
    return {
        "lang": "en",
        "message": "Behaviors retrieved successfully",
        "data": BEHAVIORS,
    }


def submit_behaviors(payload: SubmitBehaviorsRequest, db: Session, user):
    if not user:
        raise HTTPException(
            status_code=401, detail={"lang": "en", "message": "Unauthorized"}
        )

    try:
        # Clear existing behaviors for fresh submission (optional, or use upsert)
        db.query(UserBehavior).filter(UserBehavior.user_id == user.id).delete()

        for item in payload.behavior_list:
            behavior_data = os.getenv(f"BEHAVIOR_{item.behavior_id}")
            if not behavior_data:
                raise HTTPException(
                    status_code=404,
                    detail={"lang": "en", "message": "Behavior not found"},
                )

            behavior_json = json.loads(behavior_data)
            new_behavior = UserBehavior(
                user_id=user.id,
                behavior_id=item.behavior_id,
                behavior_title=behavior_json["behavior_title"],
                first_priority=item.first_priority,
                high_priority=item.high_priority,
            )
            db.add(new_behavior)

        db.commit()
        return {"message": "Behaviors submitted successfully"}

    except Exception as e:
        logger.error(f"Behavior submission failed: {e}")
        raise HTTPException(
            status_code=500, detail={"lang": "en", "message": "Technical issue"}
        )


def get_user_behaviors(db: Session, user):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    behaviors = db.query(UserBehavior).filter(UserBehavior.user_id == user.id).all()
    data = [
        {
            "behavior_id": b.behavior_id,
            "behavior_title": b.behavior_title,
            "first_priority": b.first_priority,
            "high_priority": b.high_priority,
        }
        for b in behaviors
    ]
    return {"message": "User behaviors retrieved successfully", "data": data}
