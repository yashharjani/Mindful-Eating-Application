from pydantic import BaseModel


class CreateUserGoalRequest(BaseModel):
    goal_text: str
