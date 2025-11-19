from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from app.database import settings
from app.models.user import User
from app.database import get_db
from app.utils.get_current_time import get_current_time

# Set up the password hashing context using bcrypt algorithm
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for handling token-based authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def hash_password(password: str) -> str:
    """
    Hashes the plain text password using bcrypt algorithm.

    Args:
        password (str): The plain text password to hash.

    Returns:
        str: The hashed password.
    """
    print(">>> password received for hashing:", repr(password))
    print(">>> password length (bytes):", len(password.encode("utf-8")))
    if len(password.encode("utf-8")) > 72:
        password = password[:72]  # truncate safely
    return pwd_context.hash(password)
    # return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies if the provided plain password matches the stored hashed password.

    Args:
        plain_password (str): The plain text password to verify.
        hashed_password (str): The stored hashed password to compare with.

    Returns:
        bool: True if passwords match, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Creates an access JWT token containing the provided data and optional expiration time.

    Args:
        data (dict): The payload data to include in the token (e.g., email, user details).
        expires_delta (timedelta, optional): The expiration time of the token. If not provided,
                                              defaults to the configured expiration time.

    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()

    # Set the expiration time for the token
    if expires_delta:
        expire = get_current_time() + expires_delta
    else:
        expire = get_current_time() + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode.update({"exp": expire})  # Add the expiration time to the token payload

    # Encode the JWT token using the secret key and the specified algorithm
    encoded_jwt = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """
    Retrieves the currently authenticated user based on the provided JWT token.

    Args:
        token (str): The JWT token used for authentication (provided via the OAuth2PasswordBearer).
        db (Session): The database session to query for the user.

    Returns:
        User: The authenticated user object retrieved from the database.

    Raises:
        HTTPException: If the token is invalid, expired, or the user is not found.
    """
    try:
        # Decode the JWT token to retrieve the payload
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        email: str = payload.get(
            "sub"
        )  # Extract the 'sub' field, which should contain the user's email

        # If email is not found in the payload, raise an authentication error
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )

        # Query the database to get the user associated with the email
        user = db.query(User).filter(User.email == email).first()

        # If the user is not found in the database, raise a 404 error
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Return the authenticated user object
        return user

    except JWTError:
        # If there was an error during token decoding or verification, raise an authentication error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
