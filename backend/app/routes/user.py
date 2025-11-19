import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.controllers.user_controller import (
    register_user_controller,
    login_user_controller,
    update_profile_controller,
    profile_details_controller,
    upload_profile_picture_controller,
    get_profile_picture_controller,
    forget_password_controller,
    reset_password_controller,
)
from app.models import User
from app.schemas.chat import ChatResponse, ChatRequest
from app.schemas.user import (
    UserCreate,
    LoginRequest,
    UserUpdate,
    UploadProfilePicture,
    ForgetPasswordRequest,
    PasswordResetRequest,
)
from app.services.ollama_service import generate_result
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/register", response_model=dict)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        return register_user_controller(user, db)
    except HTTPException as e:
        raise e


@router.post("/login", response_model=dict)
def login_user(login_request: LoginRequest, db: Session = Depends(get_db)):
    try:
        return login_user_controller(login_request.email, login_request.password, db)
    except HTTPException as e:
        raise e


@router.put("/update-profile", response_model=dict)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return update_profile_controller(user_update, current_user, db)
    except HTTPException as e:
        raise e


@router.get("/profile-details", response_model=dict)
def get_profile_details(current_user: User = Depends(get_current_user)):
    try:
        return profile_details_controller(current_user)
    except HTTPException as e:
        raise e


@router.post("/upload-profile-picture", response_model=dict)
def upload_profile_picture(
    profile_picture: UploadProfilePicture,  # Expecting a base64-encoded string instead of a file
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Get the authenticated user
):
    try:
        return upload_profile_picture_controller(current_user, profile_picture, db)
    except HTTPException as e:
        raise e


@router.get("/profile-picture", response_model=dict)
def get_profile_picture(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Get user from token
):
    try:
        return get_profile_picture_controller(current_user, db)
    except HTTPException as e:
        raise e


@router.post("/forget-password", response_model=dict)
def forget_password(
    forget_password_request: ForgetPasswordRequest,
    db: Session = Depends(get_db),
):
    try:
        return forget_password_controller(forget_password_request.email, db)
    except HTTPException as e:
        raise e


@router.post("/password-reset", response_model=dict)
def password_reset(
    password_reset_request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    try:
        return reset_password_controller(
            password_reset_request.email,
            password_reset_request.otp,
            password_reset_request.new_password,
            db,
        )
    except HTTPException as e:
        raise e


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    chat_model = os.getenv("TIPS_GENERATOR_MODEL")
    result = generate_result(prompt=request.prompt, model=chat_model)
    return ChatResponse(response=result)
