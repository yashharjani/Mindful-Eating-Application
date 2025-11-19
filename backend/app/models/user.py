# app/models/user.py
from sqlalchemy import Column, Integer, String, Date, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    dob = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    gender_of_birth = Column(String, nullable=True)
    current_gender = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    lifestyle_type = Column(String, nullable=True)
    country = Column(String, nullable=True)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)
    cultural_religious_dietary_influence = Column(String, nullable=True)
    profile_submission = Column(Boolean, default=False)

    question_answer = relationship(
        "QuestionAnswer", back_populates="user", uselist=False
    )
    food_updates = relationship(
        "FoodUpdate", back_populates="user", cascade="all, delete-orphan"
    )
