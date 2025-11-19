from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.controllers.user_goal_controller import (
    create_or_update_user_goal,
    get_user_goal_today,
)
from app.database import get_db
from app.schemas.goal import CreateUserGoalRequest
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/submit-user-goal", response_model=dict)
def submit_user_goal_endpoint(
    background_tasks: BackgroundTasks,
    payload: CreateUserGoalRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return create_or_update_user_goal(background_tasks, payload, db, user=user)
    except HTTPException as e:
        raise e


@router.get("/get-user-goal", response_model=dict)
def get_user_goal_endpoint(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return get_user_goal_today(background_tasks, db, user=user)
    except HTTPException as e:
        raise e
