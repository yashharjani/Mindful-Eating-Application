from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class UserBehavior(Base):
    __tablename__ = "user_behaviors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    behavior_id = Column(String)
    behavior_title = Column(String)
    first_priority = Column(Boolean, default=False)
    high_priority = Column(Boolean, default=False)
