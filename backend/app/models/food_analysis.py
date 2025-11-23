from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    Text,
    JSON,
)
from datetime import datetime
from app.database import Base
from app.utils.get_current_time import get_current_time


class FoodAnalysis(Base):
    __tablename__ = "food_analysis"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_update_id = Column(Integer, ForeignKey("food_updates.id"), nullable=False)

    food_identified = Column(String, nullable=True)
    is_healthy = Column(Boolean, nullable=True)

    # “This food supports/does not support your <goal> goal…”
    goal_alignment = Column(Text, nullable=True)

    # Advice tailored to Big Five trait
    trait_advice = Column(Text, nullable=True)

    # General suggestion, replacements, etc.
    general_advice = Column(Text, nullable=True)

    # Optional correction like “this looks like chocolate, not a biscuit”
    correction = Column(Text, nullable=True)

    # Convenience field for frontend (“Advice: …”)
    personalized_advice = Column(Text, nullable=True)

    # Store full JSON from OpenAI for debugging/future use
    raw_response = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=get_current_time())