from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.controllers.big_five_controller import get_user_big_five_traits
from app.database import get_db
from app.utils.auth import get_current_user

router = APIRouter()


@router.get("/get-details", response_model=dict)
def get_big_five_traits_endpoint(
    db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """
    Endpoint to retrieve the authenticated user's Big Five personality traits data.

    Returns:
        Dictionary with message and data containing:
        - big_five_data: JSON object with all five traits and their values
        - max_value: The trait with the highest value
    """
    try:
        return get_user_big_five_traits(db, user=user)
    except HTTPException as e:
        raise e
