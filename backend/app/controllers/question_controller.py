import logging
import os
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from app.models.question import QuestionAnswer
from app.schemas.question import SubmitAnswersRequest

# Configure logger to capture application logs
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# Load environment variables from a .env file
load_dotenv()


def load_questions():
    """
    Loads all questions from environment variables into a list.

    The questions are expected to be stored in environment variables
    with the key format QUESTION_<i>, where <i> is an integer.

    Returns:
        list: A list of question data parsed from the environment variables.
    """
    questions = []
    i = 1
    while True:
        question_data = os.getenv(f"QUESTION_{i}")
        if not question_data:
            break
        questions.append(
            json.loads(question_data)
        )  # Parse each question from JSON format
        i += 1
    return questions


# Load all available questions from the environment
QUESTIONS = load_questions()


def get_questions():
    """
    Retrieves a dictionary of questions with a success message.

    Returns:
        dict: A dictionary containing language, message, and the list of questions.
    """
    return {
        "lang": "en",
        "message": "Questions retrieved successfully",
        "data": QUESTIONS,
    }


def submit_answers(payload: SubmitAnswersRequest, db: Session, user):
    """
    Submits answers for the given user and stores them in the database.

    Args:
        payload (SubmitAnswersRequest): The answers submitted by the user.
        db (Session): The database session to interact with the database.
        user (User): The user object representing the current authenticated user.

    Returns:
        dict: A response message indicating whether the answers were successfully submitted.

    Raises:
        HTTPException: If the user is unauthorized, a question is not found, or an error occurs during database interaction.
    """
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"lang": "en", "message": "Unauthorized", "data": {}},
        )

    try:
        user_question = (
            db.query(QuestionAnswer).filter(QuestionAnswer.user_id == user.id).first()
        )

        if not user_question:
            user_question = QuestionAnswer(user_id=user.id)
            db.add(user_question)
            db.commit()

        answer_data = {}
        for item in payload.answer_list:
            question_data = os.getenv(f"QUESTION_{item.question_id}")
            if not question_data:
                logger.error(
                    f"Question with ID {item.question_id} not found in environment variables"
                )
                raise HTTPException(
                    status_code=404,
                    detail={"lang": "en", "message": "Question not found", "data": {}},
                )

            question_json = json.loads(question_data)
            question_type = question_json.get("question_type")

            # Handle different question types
            if question_type == "TEXT":
                answer_value = item.answer  # Free text response
            elif question_type in ["RADIO", "DROPDOWN"]:
                if item.answer not in question_json["options"]:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Invalid selection",
                            "data": {},
                        },
                    )
                answer_value = item.answer
            elif question_type == "MULTI_SELECT_DROPDOWN":
                selected_options = set(item.answer)  # Expecting list input
                valid_options = set(question_json["options"])
                if not selected_options.issubset(valid_options):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Invalid selection",
                            "data": {},
                        },
                    )
                answer_value = item.answer
            elif question_type == "NUMBER":
                min_val, max_val = question_json["range"]
                if not (min_val <= int(item.answer) <= max_val):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Value out of range",
                            "data": {},
                        },
                    )
                answer_value = item.answer
            elif question_type == "SLIDER":
                min_val, max_val = question_json["range"]
                if not (min_val <= int(item.answer) <= max_val):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Value out of range",
                            "data": {},
                        },
                    )
                answer_value = item.answer
            elif question_type == "DROPDOWN_TEXT":
                selected_option, text_value = (
                    item.answer.values()
                )  # Expecting tuple (selected option, text)
                if selected_option not in question_json["options"]:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Invalid selection",
                            "data": {},
                        },
                    )
                answer_value = {"selected_option": selected_option, "text": text_value}
            elif question_type == "DROPDOWN_CHECKBOX":
                selected_option, checkboxes = (
                    item.answer.values()
                )  # Expecting tuple (selected option, list of checked values)
                if selected_option not in question_json["options"]:
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Invalid selection",
                            "data": {},
                        },
                    )
                if not set(checkboxes).issubset(set(question_json["checkbox_options"])):
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "lang": "en",
                            "message": "Invalid checkbox selection",
                            "data": {},
                        },
                    )
                answer_value = {
                    "selected_option": selected_option,
                    "checkboxes": checkboxes,
                }
            else:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "lang": "en",
                        "message": "Invalid question type",
                        "data": {},
                    },
                )

            answer_data[str(item.question_id)] = {
                "question": question_json["question_text"],
                "answer": answer_value,
            }

        user_question.question_data = answer_data
        db.commit()

        return {"message": "Answers submitted successfully", "data": answer_data}

    except Exception as e:
        logger.error(f"Error submitting answers for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "lang": "en",
                "message": "Technical issue, please try again later",
                "data": {},
            },
        )


def check_submission(db: Session, user):
    """
    Checks if a user has already submitted answers for their questions.

    Args:
        db (Session): The database session to interact with the database.
        user (User): The user object representing the current authenticated user.

    Returns:
        dict: A response message with the status of the submission.

    Raises:
        HTTPException: If the user is unauthorized or an error occurs during database interaction.
    """
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Retrieve the user's existing question data from the database
        user_question = (
            db.query(QuestionAnswer).filter(QuestionAnswer.user_id == user.id).first()
        )

        if not user_question:
            # Log the error and return a message indicating that the user has not submitted answers
            logger.error(f"Error fetching question for user {user.id}")
            return {
                "message": "Technical issue, please try again later",
                "data": {"submitted": False},
            }

        # Return a success message if the user has already submitted answers
        return {
            "message": "Submission fetched successfully",
            "data": {"submitted": True},
        }

    except Exception as e:
        # Log any unexpected errors and return a 500 error response
        logger.error(f"Error fetching answers for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "lang": "en",
                "message": "Technical issue, please try again later",
                "data": {},
            },
        )


def get_user_answers(db: Session, user):
    """
    Retrieves the submitted answers for the logged-in user and formats the response
    with question ID, question text, and answer.

    Args:
        db (Session): The database session to interact with the database.
        user (User): The user object representing the current authenticated user.

    Returns:
        dict: A response message with the user's submitted answers, each containing question ID, question, and answer.

    Raises:
        HTTPException: If the user is unauthorized, no answers are found, or an error occurs during database interaction.
    """
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"lang": "en", "message": "Unauthorized", "data": {}},
        )

    try:
        # Retrieve the user's existing question data from the database
        user_question = (
            db.query(QuestionAnswer).filter(QuestionAnswer.user_id == user.id).first()
        )

        if not user_question or not user_question.question_data:
            raise HTTPException(
                status_code=404,
                detail={
                    "lang": "en",
                    "message": "No answers found for this user",
                    "data": {},
                },
            )

        # Format the response with question ID, question text, and the corresponding answer
        formatted_answers = []
        for question_id, answer_info in user_question.question_data.items():
            formatted_answers.append(
                {
                    "question_id": question_id,
                    "question": answer_info["question"],
                    "answer": answer_info["answer"],
                }
            )

        return {"message": "Answers fetched successfully", "data": formatted_answers}

    except Exception as e:
        logger.error(f"Error fetching answers for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "lang": "en",
                "message": "Technical issue, please try again later",
                "data": {},
            },
        )
