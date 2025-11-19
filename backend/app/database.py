from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
from pathlib import Path


# Settings class using Pydantic for environment variable configuration
class Settings(BaseSettings):
    # Configuration fields to be fetched from environment variables
    database_url: str  # Database URL to connect to the database
    secret_key: str  # Secret key used for JWT token encoding and decoding
    algorithm: str  # Algorithm used for encoding JWT token
    access_token_expire_minutes: int  # Token expiration time in minutes

    # Pydantic configuration to read from a .env file and allow extra variables
    class Config:
        # env_file = "../.env"  # Specifies the .env file to load variables from
        env_file = str(Path(__file__).resolve().parents[1] / ".env")
        extra = "allow"  # Allows extra fields that are not defined in the class
        case_sensitive = False


# Initialize the settings using the Pydantic Settings class
settings = Settings()

# Retrieve the database URL from settings
DATABASE_URL = settings.database_url

# Create the SQLAlchemy engine for connecting to the database
engine = create_engine(DATABASE_URL)

# SessionLocal is a session factory that can be used to create new database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all models to inherit from, used for table creation
Base = declarative_base()


# Dependency function to get a database session, yields a session to be used in request lifecycle
def get_db():
    """
    Provides a new SQLAlchemy database session for dependency injection.

    Returns:
        Session: A new database session that should be used for the current request.
    """
    db = SessionLocal()  # Create a new session
    try:
        yield db  # Yield the session so that it can be used in the current context
    finally:
        db.close()  # Ensure that the session is closed after use to release resources
