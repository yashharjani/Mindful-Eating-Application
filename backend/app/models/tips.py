from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from datetime import datetime
from app.database import Base
from app.utils.get_current_time import get_current_time


class UserTips(Base):
    __tablename__ = "user_tips"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tips_text = Column(String)
    created_at = Column(DateTime, default=get_current_time())
