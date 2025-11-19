import uuid
from pathlib import Path
import base64
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException

from app.models import User, FoodUpdate, FoodImage
from app.schemas.food_update import FoodUpdatePayload
from app.utils.get_current_time import get_current_time

# Directories for image uploads
UPLOAD_DIR = Path("Images/Food Images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def post_food_update_controller(
    current_user: User, food_update: FoodUpdatePayload, db: Session
):
    """
    Handle posting a food update with an optional set of images.

    Args:
        current_user (User): The authenticated user.
        food_update (FoodUpdatePayload): The food update payload.
        db (Session): The database session.

    Returns:
        dict: Success message with description and images uploaded.
    """
    # Create a new FoodUpdate record
    food_update_record = FoodUpdate(
        user_id=current_user.id,
        description=food_update.description,
        created_at=get_current_time(),
    )
    db.add(food_update_record)
    db.commit()

    # Handle the images if any
    if food_update.images:
        for image in food_update.images:
            try:
                image_data = base64.b64decode(image.base64_file)
                unique_id = uuid.uuid4().hex
                file_name = f"{food_update_record.id}_{unique_id}.jpg"
                file_location = UPLOAD_DIR / file_name

                # Save the image to disk
                with open(file_location, "wb") as file:
                    file.write(image_data)

                # Add image entry to FoodImage table
                food_image = FoodImage(
                    food_update_id=food_update_record.id, image_path=str(file_location)
                )
                db.add(food_image)

            except Exception as e:
                raise HTTPException(
                    status_code=400, detail=f"Failed to process image: {str(e)}"
                )
        db.commit()

    return {
        "lang": "en",
        "message": "Food update posted successfully",
        "data": {
            "description": food_update.description,
            "images": [str(image.image_path) for image in food_update_record.images],
        },
    }


def get_user_food_updates_controller(current_user: User, db: Session):
    """
    Fetch all food updates associated with the authenticated user.

    Args:
        current_user (User): The authenticated user.
        db (Session): The database session.

    Returns:
        dict: Success message with a list of food updates and their associated images.
    """
    # Fetch food updates for the user
    food_updates = (
        db.query(FoodUpdate)
        .filter(FoodUpdate.user_id == current_user.id)
        .order_by(FoodUpdate.created_at.desc())
        .all()
    )

    if not food_updates:
        raise HTTPException(status_code=200, detail="No food updates found")

    # Format the response with description and associated images
    food_updates_response = []
    for food_update in food_updates:
        images = []
        for image in food_update.images:
            try:
                with open(image.image_path, "rb") as img_file:
                    base64_encoded = base64.b64encode(img_file.read()).decode("utf-8")
                    images.append(base64_encoded)
            except Exception as e:
                images.append(None)  # Handle potential missing files gracefully

        food_updates_response.append(
            {
                "description": food_update.description,
                "images": images,
                "created_at": food_update.created_at.isoformat(),
            }
        )

    return {
        "lang": "en",
        "message": "Food updates fetched successfully",
        "data": food_updates_response,
    }


def get_user_uploaded_images_controller(current_user: User, db: Session):
    """
    Fetch all uploaded food images for the logged-in user in a frontend-friendly format.

    Args:
        current_user (User): The authenticated user.
        db (Session): The database session.

    Returns:
        dict: Success message with a list of image objects (id, path, base64, uploaded_at, food_update_id).
    """
    food_images = (
        db.query(FoodImage)
        .join(FoodUpdate, FoodUpdate.id == FoodImage.food_update_id)
        .filter(FoodUpdate.user_id == current_user.id)
        .order_by(FoodImage.id.desc())
        .all()
    )

    if not food_images:
        raise HTTPException(status_code=200, detail="No uploaded images found")

    images_data = []
    for image in food_images:
        try:
            with open(image.image_path, "rb") as img_file:
                base64_encoded = base64.b64encode(img_file.read()).decode("utf-8")
                image_object = {
                    "id": image.id,
                    "image_path": image.image_path,
                    "base64_image": f"data:image/jpeg;base64,{base64_encoded}",
                    "uploaded_at": image.food_update.created_at.isoformat()
                    if image.food_update
                    else None,
                    "food_update_id": image.food_update_id,
                }
                images_data.append(image_object)
        except Exception:
            # Handle missing image file
            images_data.append(
                {
                    "id": image.id,
                    "image_path": image.image_path,
                    "base64_image": None,
                    "uploaded_at": image.food_update.created_at.isoformat()
                    if image.food_update
                    else None,
                    "food_update_id": image.food_update_id,
                }
            )

    return {
        "lang": "en",
        "message": "Uploaded images fetched successfully",
        "data": images_data,
    }


def get_food_update_images_by_id_controller(food_update_id: int, db: Session):
    """
    Fetch all uploaded food images for a specific food update post by its ID, including the food update description.

    Args:
        food_update_id (int): The ID of the food update post.
        db (Session): The database session.

    Returns:
        dict: Success message with the food update description and a list of image objects (id, path, base64, uploaded_at).
    """
    # Fetch the food update record
    food_update = db.query(FoodUpdate).filter(FoodUpdate.id == food_update_id).first()

    if not food_update:
        raise HTTPException(status_code=404, detail="Food update not found")

    # Fetch associated images
    images_data = []
    for image in food_update.images:
        try:
            with open(image.image_path, "rb") as img_file:
                base64_encoded = base64.b64encode(img_file.read()).decode("utf-8")
                image_object = {
                    "id": image.id,
                    "image_path": image.image_path,
                    "base64_image": f"data:image/jpeg;base64,{base64_encoded}",
                    "uploaded_at": food_update.created_at.isoformat(),
                }
                images_data.append(image_object)
        except Exception:
            # Handle missing image file
            images_data.append(
                {
                    "id": image.id,
                    "image_path": image.image_path,
                    "base64_image": None,
                    "uploaded_at": food_update.created_at.isoformat(),
                }
            )

    return {
        "lang": "en",
        "message": "Food update and images fetched successfully",
        "data": {
            "description": food_update.description,
            "created_at": food_update.created_at,
            "images": images_data,
        },
    }
