import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.big_five_traits import BigFiveTraits

# Logger setup
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


def get_user_big_five_traits(db: Session, user):
    """
    Retrieve the Big Five personality traits data for the logged-in user.

    Args:
        db: Database session
        user: Authenticated user object

    Returns:
        Dictionary containing the user's Big Five traits data

    Raises:
        HTTPException: If user is not authenticated or data not found
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Query the BigFiveTraits table for the current user
        traits_data = (
            db.query(BigFiveTraits).filter(BigFiveTraits.user_id == user.id).first()
        )

        if not traits_data:
            raise HTTPException(
                status_code=404, detail="Big Five traits data not found for this user"
            )

        return {
            "message": "Big Five traits data retrieved successfully",
            "data": {
                "big_five_data": traits_data.big_five_data,
                "max_value": traits_data.max_value,
            },
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Failed to retrieve Big Five traits data: {e}")
        raise HTTPException(
            status_code=500,
            detail="Technical error while retrieving Big Five traits data",
        )
