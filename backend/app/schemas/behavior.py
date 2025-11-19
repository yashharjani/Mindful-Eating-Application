from pydantic import BaseModel
from typing import List


class BehaviorItem(BaseModel):
    behavior_id: int
    first_priority: bool
    high_priority: bool


class SubmitBehaviorsRequest(BaseModel):
    behavior_list: List[BehaviorItem]
