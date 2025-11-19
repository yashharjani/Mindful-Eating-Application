from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.controllers.user_tips_controller import (
    create_or_update_user_tips,
    get_user_tips_today,
)
from app.database import get_db
from app.schemas.tips import CreateUserTipsRequest
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/submit-user-tips", response_model=dict)
def submit_user_tips_endpoint(
    payload: CreateUserTipsRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return create_or_update_user_tips(payload, db, user=user)
    except HTTPException as e:
        raise e


@router.get("/get-user-tips", response_model=dict)
def get_user_tips_endpoint(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return get_user_tips_today(background_tasks, db, user=user)
    except HTTPException as e:
        raise e
