from pydantic import BaseModel
from typing import List, Optional


class FoodImageUpload(BaseModel):
    base64_file: str  # base64 encoded image string


class FoodUpdatePayload(BaseModel):
    description: Optional[str] = None
    images: Optional[List[FoodImageUpload]] = None
