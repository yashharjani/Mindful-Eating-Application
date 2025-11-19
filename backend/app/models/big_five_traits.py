from sqlalchemy import Column, Integer, ForeignKey, JSON, String
from sqlalchemy.orm import relationship
from app.database import Base


class BigFiveTraits(Base):
    __tablename__ = "big_five_traits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    big_five_data = Column(JSON, nullable=False, default={})
    max_value = Column(String, nullable=False)
