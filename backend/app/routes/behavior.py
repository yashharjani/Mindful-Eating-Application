from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.controllers.behavior_controller import (
    submit_behaviors,
    get_behaviors,
    get_user_behaviors,
)
from app.database import get_db
from app.schemas.behavior import SubmitBehaviorsRequest
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/behavior-list", response_model=dict)
def get_behavior_question_list():
    try:
        return get_behaviors()
    except HTTPException as e:
        raise e


@router.post("/submit-behavior", response_model=dict)
def submit_behavior_response_endpoint(
    payload: SubmitBehaviorsRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    try:
        return submit_behaviors(payload, db, user=user)
    except HTTPException as e:
        raise e


@router.get("/check-behavior-submission", response_model=dict)
def check_behavior_submission_endpoint(
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    try:
        return get_user_behaviors(db, user=user)
    except HTTPException as e:
        raise e
