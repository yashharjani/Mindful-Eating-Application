from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.controllers.food_update_controller import (
    post_food_update_controller,
    get_user_food_updates_controller,
    get_user_uploaded_images_controller,
    get_food_update_images_by_id_controller,
)
from app.schemas.food_update import FoodUpdatePayload
from app.utils.auth import get_current_user

router = APIRouter()


@router.post("/food-update", response_model=dict)
def post_food_update(
    food_update: FoodUpdatePayload,  # Expecting description and base64 images
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Get the authenticated user
):
    try:
        return post_food_update_controller(current_user, food_update, db)
    except HTTPException as e:
        raise e


@router.get("/user-food-updates", response_model=dict)
def get_user_food_updates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # Get the authenticated user
):
    try:
        return get_user_food_updates_controller(current_user, db)
    except HTTPException as e:
        raise e


@router.get("/user-uploaded-images", response_model=dict)
def get_user_uploaded_images(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        return get_user_uploaded_images_controller(current_user, db)
    except HTTPException as e:
        raise e


@router.get("/food-update/{food_update_id}", response_model=dict)
def get_food_update_images(
    food_update_id: int = Path(..., description="The ID of the food update post"),
    db: Session = Depends(get_db),
):
    try:
        return get_food_update_images_by_id_controller(food_update_id, db)
    except HTTPException as e:
        raise e
