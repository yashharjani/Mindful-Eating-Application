import uuid
from pathlib import Path
import base64
from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException

from app.models import User, FoodUpdate, FoodImage, FoodAnalysis
from app.schemas.food_update import FoodUpdatePayload
from app.utils.get_current_time import get_current_time

from app.services.food_analysis_service import analyze_and_store_food_update

# Directories for image uploads
UPLOAD_DIR = Path("Images/Food Images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def post_food_update_controller(
    current_user: User, food_update: FoodUpdatePayload, db: Session
):
    """
    Handle posting a food update with an optional set of images.
    Also triggers AI food analysis (OpenAI Vision) on the first uploaded image.
    """

    # Create a new FoodUpdate record
    food_update_record = FoodUpdate(
        user_id=current_user.id,
        description=food_update.description,
        created_at=get_current_time(),
    )
    db.add(food_update_record)
    db.commit()
    db.refresh(food_update_record)

    # Capture first image's base64 for analysis (clean base64)
    first_image_base64 = None
    if food_update.images and len(food_update.images) > 0:
        first_image_base64 = food_update.images[0].base64_file

        # CLEAN: Remove prefix if exists
        if first_image_base64.startswith("data:"):
            first_image_base64 = first_image_base64.split(",")[-1]

    # Handle the images if any
    if food_update.images:
        for image in food_update.images:
            try:
                # CLEAN: fix base64 input (handles both raw and prefixed)
                clean_base64 = image.base64_file.split(",")[-1]

                image_data = base64.b64decode(clean_base64)
                unique_id = uuid.uuid4().hex
                file_name = f"{food_update_record.id}_{unique_id}.jpg"
                file_location = UPLOAD_DIR / file_name

                # Save the image to disk
                with open(file_location, "wb") as file:
                    file.write(image_data)

                # Add image entry to FoodImage table
                food_image = FoodImage(
                    food_update_id=food_update_record.id,
                    image_path=str(file_location),
                )
                db.add(food_image)

            except Exception as e:
                raise HTTPException(
                    status_code=400, detail=f"Failed to process image: {str(e)}"
                )

        db.commit()
        db.refresh(food_update_record)

    # Run AI analysis (fails silently)
    analysis_result = None
    try:
        analysis_result = analyze_and_store_food_update(
            current_user=current_user,
            food_update=food_update_record,
            first_image_base64=first_image_base64,
            db=db,
        )
    except Exception as e:
        logging.getLogger(__name__).error(
            f"Error during food analysis for food_update_id={food_update_record.id}: {e}"
        )

    return {
        "lang": "en",
        "message": "Food update posted successfully",
        "data": {
            "description": food_update_record.description,
            "images": [str(image.image_path) for image in food_update_record.images],
            "analysis": analysis_result,
        },
    }


def get_user_food_updates_controller(current_user: User, db: Session):
    """
    Fetch all food updates associated with the authenticated user,
    including their associated images and AI analysis.
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

    food_updates_response = []

    for food_update in food_updates:
        # Load images as base64
        images = []
        for image in food_update.images:
            try:
                with open(image.image_path, "rb") as img_file:
                    base64_encoded = base64.b64encode(img_file.read()).decode("utf-8")
                    images.append(f"data:image/jpeg;base64,{base64_encoded}")
            except Exception:
                images.append(None)

        # Fetch latest analysis for this food update
        analysis = (
            db.query(FoodAnalysis)
            .filter(FoodAnalysis.food_update_id == food_update.id)
            .order_by(FoodAnalysis.created_at.desc())
            .first()
        )

        analysis_data = None
        if analysis:
            analysis_data = {
                "id": analysis.id,
                "food_identified": analysis.food_identified,
                "is_healthy": analysis.is_healthy,
                "goal_alignment": analysis.goal_alignment,
                "personalized_advice": analysis.personalized_advice,
                "correction": analysis.correction,
                "created_at": analysis.created_at.isoformat(),
            }

        food_updates_response.append(
            {
                "id": food_update.id,
                "description": food_update.description,
                "images": images,
                "created_at": food_update.created_at.isoformat(),
                "analysis": analysis_data,
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
    Fetch a single food update with description, images, and AI analysis.
    """

    # Fetch the food update record
    food_update = db.query(FoodUpdate).filter(FoodUpdate.id == food_update_id).first()

    if not food_update:
        raise HTTPException(status_code=404, detail="Food update not found")

    # Load associated images
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
            images_data.append(
                {
                    "id": image.id,
                    "image_path": image.image_path,
                    "base64_image": None,
                    "uploaded_at": food_update.created_at.isoformat(),
                }
            )

    # Fetch the AI analysis record
    analysis = (
        db.query(FoodAnalysis)
        .filter(FoodAnalysis.food_update_id == food_update.id)
        .order_by(FoodAnalysis.created_at.desc())
        .first()
    )

    analysis_data = None
    if analysis:
        analysis_data = {
            "id": analysis.id,
            "food_identified": analysis.food_identified,
            "is_healthy": analysis.is_healthy,
            "goal_alignment": analysis.goal_alignment,
            "personalized_advice": analysis.personalized_advice,
            "correction": analysis.correction,
            "created_at": analysis.created_at.isoformat(),
        }

    return {
        "lang": "en",
        "message": "Food update and images fetched successfully",
        "data": {
            "id": food_update.id,
            "description": food_update.description,
            "created_at": food_update.created_at.isoformat(),
            "images": images_data,
            "analysis": analysis_data,
        },
    }