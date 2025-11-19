from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


from .user import User
from .question import QuestionAnswer
from .otp import OTP
from .food_update import FoodUpdate, FoodImage
from .behavior import UserBehavior
from .goal import UserGoal
from .tips import UserTips
from .big_five_traits import BigFiveTraits
