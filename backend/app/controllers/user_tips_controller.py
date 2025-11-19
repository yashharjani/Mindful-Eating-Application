import os
import logging
from datetime import datetime, date
from fastapi import HTTPException, BackgroundTasks
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.tips import UserTips
from app.models.goal import UserGoal
from app.services.tips_generator import generate_user_tips
from app.utils.get_current_time import get_current_time

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def create_or_update_user_tips(payload, db: Session, user):
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        today = date.today()
        existing_tip = (
            db.query(UserTips)
            .filter(
                UserTips.user_id == user.id,
                UserTips.created_at >= datetime.combine(today, datetime.min.time()),
                UserTips.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if existing_tip:
            existing_tip.tips_text = payload.tips_text
            db.commit()
            message = "User tips updated successfully"
        else:
            new_tip = UserTips(
                user_id=user.id,
                tips_text=payload.tips_text,
                created_at=get_current_time(),
            )
            db.add(new_tip)
            db.commit()
            message = "User tips created successfully"

        return {"message": message}

    except Exception as e:
        logger.error(f"User tips submission failed: {e}")
        raise HTTPException(status_code=500, detail="Technical issue")


def get_user_tips_today(background_tasks: BackgroundTasks, db: Session, user):
    """
    Option A Logic:
      - If tip exists → return it  
      - If goal NOT set → return message: set goal  
      - If goal set BUT tip missing → generate tip NOW and return it  
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        today = date.today()

        # Check tip
        user_tip = (
            db.query(UserTips)
            .filter(
                UserTips.user_id == user.id,
                UserTips.created_at >= datetime.combine(today, datetime.min.time()),
                UserTips.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if user_tip:
            return {
                "message": "User tips retrieved successfully",
                "data": {"tips_text": user_tip.tips_text},
            }

        # Check goal
        user_goal = (
            db.query(UserGoal)
            .filter(
                UserGoal.user_id == user.id,
                UserGoal.created_at >= datetime.combine(today, datetime.min.time()),
                UserGoal.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if not user_goal:
            return {
                "message": "No goal set for today. Please set your daily goal to receive a tip.",
                "data": None,
            }

        # Goal exists but tip missing → generate tip NOW
        logger.info(f"Goal set for user {user.id}, but no tip exists. Generating new tip now.")
        generate_user_tips(user.id, db)

        # Fetch again
        new_tip = (
            db.query(UserTips)
            .filter(
                UserTips.user_id == user.id,
                UserTips.created_at >= datetime.combine(today, datetime.min.time()),
                UserTips.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if new_tip:
            return {
                "message": "New tip generated successfully",
                "data": {"tips_text": new_tip.tips_text},
            }

        return {
            "message": "Goal is set but no tip could be generated.",
            "data": None,
        }

    except Exception as e:
        logger.error(f"User tips retrieval failed: {e}")
        raise HTTPException(status_code=500, detail="Technical issue")