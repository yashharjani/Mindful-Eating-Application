from pydantic import BaseModel
from typing import List, Union, Dict


class AnswerItem(BaseModel):
    question_id: int
    answer: Union[str, int, List[str], Dict[str, Union[str, List[str]]]]


class SubmitAnswersRequest(BaseModel):
    answer_list: List[AnswerItem]
