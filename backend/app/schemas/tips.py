from pydantic import BaseModel


class CreateUserTipsRequest(BaseModel):
    tips_text: str
