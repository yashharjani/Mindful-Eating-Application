from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.controllers.question_controller import (
    submit_answers,
    get_questions,
    check_submission,
    get_user_answers,
)
from app.database import get_db
from typing import List
from app.schemas.question import SubmitAnswersRequest
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/question-list", response_model=dict)
def get_question_list():
    try:
        return get_questions()
    except HTTPException as e:
        raise e


@router.post("/submit-answers", response_model=dict)
def submit_answers_endpoint(
    payload: SubmitAnswersRequest,
    db: Session = Depends(get_db),  # Pass db session properly
    user=Depends(get_current_user),
):
    try:
        return submit_answers(payload, db, user=user)
    except HTTPException as e:
        raise e


@router.get("/check-submission", response_model=dict)
def check_submission_endpoint(
    db: Session = Depends(get_db),  # Pass db session properly
    user=Depends(get_current_user),
):
    try:
        return check_submission(db, user=user)
    except HTTPException as e:
        raise e


@router.get("/get-answers", response_model=dict)
def get_user_answers_endpoint(
    db: Session = Depends(get_db),  # Pass db session properly
    user=Depends(get_current_user),
):
    try:
        return get_user_answers(db, user=user)
    except HTTPException as e:
        raise e
