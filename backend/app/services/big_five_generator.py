import os
import ast
import logging
from app.models import UserBehavior, QuestionAnswer, BigFiveTraits
from app.services.ollama_service import generate_result
from sqlalchemy.exc import SQLAlchemyError

MOCK = os.getenv("MOCK", "false").lower() in ("true", "True")

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def generate_big5_personality_prompt(input_text=""):
    """
    Generate a prompt for Big Five personality analysis from the given input text.

    Args:
        input_text (str): The input text containing user info, Q&A, and behaviors.

    Returns:
        str: A formatted prompt instructing the model to return Big Five trait scores in JSON.
    """
    prompt_text = f"""
You are an expert Personality Psychologist with over 10 years of experience in personality analysis.
You specialize in predicting the Big Five personality traits (Extraversion, Agreeableness, Conscientiousness,
Neuroticism, and Openness).

Task:
1. Read the text provided after 'Input Text:'.
2. Return a JSON object containing the Big Five trait scores.
   Each score should be a floating-point number between 0 and 1, for example:
   {{
     "extraversion": 0.662,
     "agreeableness": 0.339,
     "conscientiousness": 0.330,
     "neuroticism": 0.670,
     "openness": 0.674
   }}
3. Do not provide any explanation or commentary; only return the JSON.

Input Text:
{input_text}
"""
    return prompt_text


def prepare_big5_input_text(user, formatted_answers, formatted_behavior):
    """
    Prepare the input text used in the prompt by formatting user details, answers, and behaviors.

    Args:
        user (dict): Dictionary containing user profile fields.
        formatted_answers (list): List of dicts with user questions and answers.
        formatted_behavior (list): List of dicts with user behavior titles and priorities.

    Returns:
        str: A compiled input text used in Big Five trait prompt.
    """
    full_name = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
    occupation = user.get("occupation", "N/A")
    age = user.get("age", "N/A")
    gender = user.get("current_gender", user.get("gender_of_birth", "N/A"))
    city = user.get("city", "")
    country = user.get("country", "")
    location = f"{city}, {country}".strip(", ")
    lifestyle = user.get("lifestyle_type", "N/A")
    diet = user.get("cultural_religious_dietary_influence", "N/A")

    description = (
        f"{full_name} is a {age}-year-old {occupation.lower()} from {location}. "
        f"They lead a {lifestyle.lower()} lifestyle and follow a {diet} diet."
    )

    demographics = f"""Demographics:
Age: {age}
Gender: {gender}
Location: {location}
Occupation: {occupation}
Lifestyle: {lifestyle}
Dietary Influence: {diet}"""

    qa_section = "\nSome Questions and Answers about the user:\n"
    for qa in formatted_answers:
        qa_section += f"Q: {qa['question']}\nA: {qa['answer']}\n"

    behavior_section = "Observed Behaviors of the user:\n"
    for b in formatted_behavior:
        priority = "High Priority" if b["high_priority"] else "Normal Priority"
        behavior_section += f"- {b['behavior_title']} ({priority})\n"

    input_text = f"""{full_name}, {occupation}
Description: {description}

{demographics}

{qa_section}

{behavior_section}
"""
    return input_text


def generate_user_big_five_traits(user, db):
    """
    Generate and store Big Five personality traits for a given user using their profile,
    answers, and behaviors. Handles all exceptions gracefully.

    Args:
        user (User): SQLAlchemy user model instance.
        db (Session): SQLAlchemy database session.
    """
    try:
        excluded_keys = {
            "_sa_instance_state",
            "hashed_password",
            "id",
            "profile_picture",
            "profile_submission",
            "state",
        }
        user_data = {k: v for k, v in user.__dict__.items() if k not in excluded_keys}

        # Get user's question-answer data
        formatted_answers = []
        try:
            user_question = (
                db.query(QuestionAnswer)
                .filter(QuestionAnswer.user_id == user.id)
                .first()
            )
            if user_question and user_question.question_data:
                for _, answer_info in user_question.question_data.items():
                    formatted_answers.append(
                        {
                            "question": answer_info.get("question", ""),
                            "answer": answer_info.get("answer", ""),
                        }
                    )
        except Exception as e:
            logger.warning(f"Failed to load question-answer data: {e}")

        # Get user's behaviors
        formatted_behavior = []
        try:
            behaviors = (
                db.query(UserBehavior).filter(UserBehavior.user_id == user.id).all()
            )
            formatted_behavior = [
                {"behavior_title": b.behavior_title, "high_priority": b.high_priority}
                for b in behaviors
            ]
        except Exception as e:
            logger.warning(f"Failed to load user behavior data: {e}")

        # Prepare input and generate result
        input_text = prepare_big5_input_text(
            user_data, formatted_answers, formatted_behavior
        )
        big_five_prompt = generate_big5_personality_prompt(input_text)

        try:
            if MOCK:
                ollama_result = {
                    "extraversion": 0.2739933746925895,
                    "agreeableness": 0.3336660866251377,
                    "conscientiousness": 0.6416602892067943,
                    "neuroticism": 0.6780137551729286,
                    "openness": 0.338040651768266,
                }
            else:
                # big_five_model = os.getenv("BIG_FIVE_MODEL")
                # ollama_result_text = generate_result(big_five_prompt, big_five_model)
                # ollama_result = ast.literal_eval(ollama_result_text)
                big_five_model = os.getenv("BIG_FIVE_MODEL", "local-big5")
                ollama_result_text = generate_result(big_five_prompt, big_five_model)  # now local
                ollama_result = ast.literal_eval(ollama_result_text)

        except Exception as e:
            # logger.error(f"Failed to generate result from Ollama: {e}")
            return  # Skip DB entry if no result

        if not isinstance(ollama_result, dict):
            logger.error("Ollama result is not in expected dict format.")
            return

        max_trait = max(ollama_result, key=ollama_result.get)

        # Save to DB
        try:
            big_five_entry = BigFiveTraits(
                user_id=user.id, big_five_data=ollama_result, max_value=max_trait
            )
            db.add(big_five_entry)
            db.commit()
            db.refresh(big_five_entry)
            logger.info("Big Five Traits saved successfully.")
        except SQLAlchemyError as db_err:
            db.rollback()
            logger.error(f"Failed to save Big Five traits: {db_err}")

    except Exception as e:
        logger.error(f"Unexpected error in generate_user_big_five_traits: {e}")
