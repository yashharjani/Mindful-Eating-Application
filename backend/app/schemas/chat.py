# from pydantic import BaseModel


# class ChatRequest(BaseModel):
#     prompt: str


# class ChatResponse(BaseModel):
#     response: str


# from pydantic import BaseModel
# from typing import Optional, List
# from datetime import datetime
# from pydantic import BaseModel
# from pydantic import ConfigDict


# class ChatRequest(BaseModel):
#     prompt: str
#     session_id: Optional[int] = None


# class ChatMessageOut(BaseModel):
#     id: int
#     session_id: int
#     role: str
#     content: str
#     source: Optional[str]
#     created_at: datetime

#     class Config:
#         model_config = ConfigDict(from_attributes=True)


# class ChatSessionOut(BaseModel):
#     id: int
#     title: Optional[str]
#     is_active: bool
#     created_at: datetime

#     class Config:
#         model_config = ConfigDict(from_attributes=True)


# class ChatResponse(BaseModel):
#     session_id: int
#     message: ChatMessageOut

from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional
from datetime import datetime


class ChatRequest(BaseModel):
    prompt: str
    session_id: Optional[int] = None


class ChatMessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    source: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionOut(BaseModel):
    id: int
    title: Optional[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatResponse(BaseModel):
    session_id: int
    message: ChatMessageOut

    model_config = ConfigDict(from_attributes=True)