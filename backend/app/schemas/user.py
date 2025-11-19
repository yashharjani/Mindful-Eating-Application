from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=72)
    first_name: str
    last_name: str
    food_detail: Optional[str] = None  # Optional field
    address: Optional[str] = None  # Optional field


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    age: Optional[int] = None
    username: Optional[str] = None
    gender_of_birth: Optional[str] = None
    current_gender: Optional[str] = None
    occupation: Optional[str] = None
    lifestyle_type: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    cultural_religious_dietary_influence: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UploadProfilePicture(BaseModel):
    base64_file: str


class ForgetPasswordRequest(BaseModel):
    email: str


class PasswordResetRequest(BaseModel):
    email: str
    otp: str
    new_password: str
