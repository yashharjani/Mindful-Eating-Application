import base64
import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException
from pathlib import Path
from jose import JWTError, jwt
from app.database import settings
from app.models.user import User
from app.models.otp import OTP
from app.schemas.user import UserCreate, UserUpdate, UploadProfilePicture
from app.utils.auth import hash_password, verify_password
from app.utils.email import send_email
from app.utils.get_current_time import get_current_time

UPLOAD_DIR = Path("Images/Profile Image")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def register_user_controller(user: UserCreate, db: Session):
    """
    Register a new user by validating the provided details, checking if the email already exists,
    hashing the password, and storing the user in the database.

    Args:
        user (UserCreate): The user details to be registered.
        db (Session): The database session.

    Returns:
        dict: A dictionary containing a success message and the registered user data.

    Raises:
        HTTPException: If the email is already registered or if first/last name is missing.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail={"lang": "en", "message": "Email is already registered", "data": {}},
        )

    # Validate first name and last name
    if not user.first_name or not user.last_name:
        raise HTTPException(
            status_code=400,
            detail={
                "lang": "en",
                "message": "First name and last name are required",
                "data": {},
            },
        )

    # Hash the password and create the user
    hashed_password = hash_password(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
    )
    db.add(new_user)  # Add the new user to the session
    db.commit()  # Commit the changes to the database
    db.refresh(new_user)  # Refresh the object to reflect the committed changes
    return {
        "lang": "en",
        "message": "Congrats on creating your account! Welcome!",
        "data": {
            "id": new_user.id,
            "email": new_user.email,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
        },
    }


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()

    # Use UTC to prevent issues with container/system timezone
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def login_user_controller(email: str, password: str, db: Session) -> dict:
    """
    Authenticate the user by checking if the email and password are correct,
    and return a JWT token for authorized access.

    Args:
        email (str): The user's email address.
        password (str): The user's password.
        db (Session): The database session.

    Returns:
        dict: A dictionary containing a success message and the generated JWT access token.

    Raises:
        HTTPException: If the email or password is incorrect.
    """
    if not email or not password:
        raise HTTPException(
            status_code=400,
            detail={
                "lang": "en",
                "message": "Email and password are required",
                "data": {},
            },
        )

    # Find the user by email
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail={"lang": "en", "message": "Invalid email or password", "data": {}},
        )

    # Generate JWT token for the authenticated user
    access_token = create_access_token(
        data={
            "sub": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "username": user.username if user.username else "",
        }
    )

    # Return the success response with the JWT token
    return {
        "lang": "en",
        "message": "Welcome back! You're logged in!",
        "data": {"access_token": access_token},
    }


def update_profile_controller(user_update: UserUpdate, current_user: User, db: Session):
    """
    Update the current user's profile details based on the provided data.

    Args:
        user_update (UserUpdate): The user details to be updated.
        current_user (User): The currently logged-in user whose profile will be updated.
        db (Session): The database session.

    Returns:
        dict: A dictionary containing a success message and the updated user data.
    """
    # Update user details based on the provided data
    update_fields = [
        "first_name",
        "last_name",
        "dob",
        "age",
        "username",
        "gender_of_birth",
        "current_gender",
        "occupation",
        "lifestyle_type",
        "country",
        "state",
        "city",
        "cultural_religious_dietary_influence",
    ]

    for field in update_fields:
        if getattr(user_update, field) is not None:
            setattr(current_user, field, getattr(user_update, field))

    if user_update.country and not current_user.profile_submission:
        current_user.profile_submission = True

    # Commit the changes to the database
    db.commit()
    db.refresh(current_user)  # Refresh the object to reflect the committed changes

    # Return the success response with the updated profile details
    return {
        "lang": "en",
        "message": "Profile updated successfully",
        "data": {
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "username": current_user.username,
            "dob": current_user.dob,
            "age": current_user.age,
            "gender_of_birth": current_user.gender_of_birth,
            "current_gender": current_user.current_gender,
            "occupation": current_user.occupation,
            "lifestyle_type": current_user.lifestyle_type,
            "country": current_user.country,
            "state": current_user.state,
            "city": current_user.city,
            "cultural_religious_dietary_influence": current_user.cultural_religious_dietary_influence,
            "profile_submission": current_user.profile_submission,
        },
    }


def profile_details_controller(current_user: User):
    """
    Fetch the profile details of the currently logged-in user.

    Args:
        current_user (User): The currently logged-in user whose details are to be fetched.

    Returns:
        dict: A dictionary containing a success message and the current user's profile details.
    """
    return {
        "lang": "en",
        "message": "Profile details fetched successfully",
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "first_name": current_user.first_name,
            "last_name": current_user.last_name,
            "username": current_user.username,
            "dob": current_user.dob,
            "age": current_user.age,
            "gender_of_birth": current_user.gender_of_birth,
            "current_gender": current_user.current_gender,
            "occupation": current_user.occupation,
            "lifestyle_type": current_user.lifestyle_type,
            "country": current_user.country,
            "state": current_user.state,
            "city": current_user.city,
            "cultural_religious_dietary_influence": current_user.cultural_religious_dietary_influence,
            "profile_submission": current_user.profile_submission,
        },
    }


def upload_profile_picture_controller(
    current_user: User, profile_picture: UploadProfilePicture, db: Session
):
    """
    Upload and save a profile picture for the authenticated user using a base64-encoded image.

    Args:
        current_user (User): The authenticated user.
        base64_file (str): The base64 encoded file.
        db (Session): The database session.

    Returns:
        dict: Success message with Base64 encoded image.
    """
    # Validate that base64_file is a valid base64 string
    try:
        image_data = base64.b64decode(profile_picture.base64_file)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    # Define file extension based on the image type
    file_extension = "jpg"  # Default to 'jpg' or handle it dynamically if required
    file_name = f"{current_user.id}_profile.{file_extension}"
    file_location = UPLOAD_DIR / file_name

    # Save the decoded image to a file
    with open(file_location, "wb") as file:
        file.write(image_data)

    # Encode the image as Base64 for response
    encoded_string = base64.b64encode(image_data).decode("utf-8")

    # Update user record with the new profile picture path
    current_user.profile_picture = str(file_location)
    db.commit()

    return {
        "lang": "en",
        "message": "Profile picture uploaded successfully",
        "data": {"email": current_user.email, "profile_picture": f"{encoded_string}"},
    }


def get_profile_picture_controller(current_user: User, db: Session):
    """
    Fetch and return the profile picture as a Base64 string.

    Args:
        current_user (User): The authenticated user.
        db (Session): The database session.

    Returns:
        dict: A dictionary containing a success message and Base64-encoded profile picture.
    """
    if not current_user.profile_picture:
        raise HTTPException(status_code=404, detail="Profile picture not found")

    file_path = Path(current_user.profile_picture)

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Profile picture not found")

    try:
        # Read image and encode as Base64
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")

        return {
            "lang": "en",
            "message": "Profile picture fetched successfully",
            "data": {"profile_picture": f"{encoded_string}"},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error encoding image: {str(e)}")


def generate_otp():
    """Generate a 6-digit OTP."""
    return "".join(random.choices(string.digits, k=6))


def forget_password_controller(email: str, db: Session):
    """
    Generate an OTP and send it to the user's email for password reset.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"lang": "en", "message": "User not found", "data": {}},
        )

    otp_code = generate_otp()
    otp_expiry = get_current_time() + timedelta(minutes=10)

    # Store OTP in the database
    otp_entry = OTP(email=email, otp_code=otp_code, expires_at=otp_expiry)
    db.add(otp_entry)
    db.commit()

    # Send OTP via email
    send_email(email, "Password Reset OTP", f"{otp_code}")

    return {
        "lang": "en",
        "message": "OTP sent successfully. Please check your email.",
        "data": {"email": email},
    }


def reset_password_controller(
    email: str, otp_code: str, new_password: str, db: Session
):
    """
    Reset the user's password after verifying the OTP.
    """
    otp_entry = (
        db.query(OTP).filter(OTP.email == email, OTP.otp_code == otp_code).first()
    )

    if not otp_entry or otp_entry.expires_at < get_current_time():
        raise HTTPException(
            status_code=400,
            detail={"lang": "en", "message": "Invalid or expired OTP", "data": {}},
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"lang": "en", "message": "User not found", "data": {}},
        )

    user.hashed_password = hash_password(new_password)
    db.commit()

    # Delete OTP after successful reset
    db.delete(otp_entry)
    db.commit()

    return {
        "lang": "en",
        "message": "Password reset successful.",
        "data": {"email": email},
    }
