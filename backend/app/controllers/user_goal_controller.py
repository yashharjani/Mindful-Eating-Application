import logging
from datetime import datetime, date
from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.models import BigFiveTraits
from app.models.goal import UserGoal
from app.schemas.goal import CreateUserGoalRequest
from app.services.big_five_generator import generate_user_big_five_traits
from app.services.tips_generator import generate_user_tips
from app.utils.get_current_time import get_current_time

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def create_or_update_user_goal(
    background_tasks: BackgroundTasks,
    payload: CreateUserGoalRequest,
    db: Session,
    user,
):
    """
    Creates or updates today's user goal.
    Tip generation is triggered only from here (Option A).
    """
    if not user:
        raise HTTPException(
            status_code=401, detail={"lang": "en", "message": "Unauthorized"}
        )

    try:
        today = date.today()
        existing_goal = (
            db.query(UserGoal)
            .filter(
                UserGoal.user_id == user.id,
                UserGoal.created_at >= datetime.combine(today, datetime.min.time()),
                UserGoal.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if existing_goal:
            existing_goal.goal_text = payload.goal_text
            logger.info(f"Updated goal for user {user.id} for today.")
        else:
            new_goal = UserGoal(
                user_id=user.id,
                goal_text=payload.goal_text,
                created_at=get_current_time(),
            )
            db.add(new_goal)
            logger.info(f"Created new goal for user {user.id} for today.")

        db.commit()

        # Trigger tip generation for today based on the newly saved goal
        background_tasks.add_task(generate_user_tips, user.id, db)

        return {"message": "Goal saved successfully"}

    except Exception as e:
        logger.error(f"Goal creation/update failed: {e}")
        raise HTTPException(
            status_code=500, detail={"lang": "en", "message": "Technical issue"}
        )


def get_user_goal_today(background_tasks: BackgroundTasks, db: Session, user):
    """
    Retrieves today's goal for the authenticated user.
    """
    if not user:
        raise HTTPException(
            status_code=401, detail={"lang": "en", "message": "Unauthorized"}
        )

    try:
        big_five_data = (
            db.query(BigFiveTraits).filter(BigFiveTraits.user_id == user.id).first()
        )
        if not big_five_data:
            background_tasks.add_task(generate_user_big_five_traits, user, db)

        today = date.today()
        goal = (
            db.query(UserGoal)
            .filter(
                UserGoal.user_id == user.id,
                UserGoal.created_at >= datetime.combine(today, datetime.min.time()),
                UserGoal.created_at <= datetime.combine(today, datetime.max.time()),
            )
            .first()
        )

        if goal:
            return {
                "message": "User goal retrieved successfully",
                "data": {"goal_text": goal.goal_text, "created_at": goal.created_at},
            }
        else:
            return {"message": "No goal set for today", "data": None}

    except Exception as e:
        logger.error(f"Fetching goal failed: {e}")
        raise HTTPException(
            status_code=500, detail={"lang": "en", "message": "Technical issue"}
        )