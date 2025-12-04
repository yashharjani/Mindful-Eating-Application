from sqlalchemy.orm import Session
from typing import Optional, Tuple
from app.models.user import User
from app.models.goal import UserGoal
from app.models.tips import UserTips
from app.models.behavior import UserBehavior
from app.models.chat import ChatSession, ChatMessage
from app.services.openai_chat import generate_openai_reply
from app.utils.get_current_time import get_current_time

import logging
logger = logging.getLogger(__name__)


def get_or_create_session(db: Session, user: User, session_id: Optional[int] = None) -> ChatSession:
    if session_id:
        session = (
            db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
            .first()
        )
        if session:
            return session

    # Create new session
    session = ChatSession(user_id=user.id, title="Mindful Eating Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

def detect_known_intent(message: str) -> Optional[str]:
    text = message.lower().strip()

    logger.info(f"[INFO] detect_known_intent() received text: {text}")

    # Keywords indicating navigation questions
    navigation_keywords = [
        "where", "find", "locate", "see", "view", "open", "check", "looking for"
    ]

    is_navigation_question = any(kw in text for kw in navigation_keywords)
    logger.info(f"[INFO] is_navigation_question: {is_navigation_question}")

    # GOAL RELATED
    if "goal" in text or "goals" in text:
        logger.info(f"[INFO] goal-related text detected")
        if is_navigation_question:
            logger.info(f"[INFO] intent detected: goal_navigation")
            return "goal_navigation"
        logger.info(f"[INFO] intent detected: user_goal")
        return "user_goal"

    # TIPS RELATED
    if "tip" in text or "tips" in text:
        logger.info(f"[INFO] tips-related text detected")
        if is_navigation_question:
            logger.info(f"[INFO] intent detected: tips_navigation")
            return "tips_navigation"
        logger.info(f"[INFO] tips question without navigation (OpenAI fallback)")
        return None

    # BEHAVIOR RELATED
    if "behavior" in text or "behaviours" in text:
        logger.info(f"[INFO] behavior-related text detected")
        if is_navigation_question:
            logger.info(f"[INFO] intent detected: behavior_navigation")
            return "behavior_navigation"
        logger.info(f"[INFO] behavior question without navigation (OpenAI fallback)")
        return None

    # PROFILE RELATED
    if "profile" in text:
        logger.info(f"[INFO] profile-related text detected")
        if is_navigation_question:
            logger.info(f"[INFO] intent detected: profile_navigation")
            return "profile_navigation"
        logger.info(f"[INFO] intent detected: profile_info")
        return "profile_info"

    logger.info(f"[INFO] No known intent detected → OpenAI fallback")
    return None


def handle_chat_message(db: Session, user: User, prompt: str, session_id: Optional[int] = None) -> Tuple[ChatSession, ChatMessage]:
    # Ensure session exists
    session = get_or_create_session(db, user, session_id)

    # Store user message
    user_msg = ChatMessage(
        session_id=session.id,
        user_id=user.id,
        role="user",
        content=prompt,
        source="user",
        created_at=get_current_time(),
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    # Decide: use DB/navigation or OpenAI
    logger.info(f"[INFO] User prompt received: {prompt}")
    intent = detect_known_intent(prompt)
    logger.info(f"[INFO] Intent detected: {intent}")
    reply_text = None
    source = None

    if intent == "user_goal":
        goal = (
            db.query(UserGoal)
            .filter(UserGoal.user_id == user.id)
            .order_by(UserGoal.created_at.desc())
            .first()
        )
        if goal:
            reply_text = (
                f"Your current goal is:\n\n“{goal.goal_text}”.\n\n"
                "You can also view or update this in the app under:\n"
                "Dashboard → Goals."
            )
        else:
            reply_text = (
                "You don’t seem to have a goal set yet.\n\n"
                "You can create one from the app: Dashboard → Goals → Set Goal."
            )
        source = "db"

    elif intent == "tips_navigation":
        # Not re-generating tips here, just guiding user where to see them
        reply_text = (
            "You can view your personalized mindful eating tips on the Tips screen.\n\n"
            "Navigation: Dashboard → Tips.\n\n"
            "If you’d like, you can also ask me more specific questions about your challenges."
        )
        source = "navigation"

    elif intent == "behavior_info":
        reply_text = (
            "Your selected eating behaviors are available in the app.\n\n"
            "Navigation: Profile → Eating Behaviors.\n"
            "From there you can review or update your priorities."
        )
        source = "navigation"

    elif intent == "profile_info":
        reply_text = (
            "You can view and update your profile details under:\n"
            "Dashboard → Profile."
        )
        source = "navigation"
    elif intent == "goal_navigation":
        logger.info("[INFO] Handling goal_navigation")
        reply_text = (
            "You can find your goals in the app under:\n"
            "Dashboard → Goals."
        )
        source = "navigation"


    # ---- CASE 2: Fallback to OpenAI for doubts/advice ----
    if reply_text is None:
        # Example: “I’m not able to follow mindful eating tips, give me some solutions”
        # No direct DB answer → call OpenAI
        reply_text = generate_openai_reply(prompt)
        source = "openai"

    # 4) Store assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        user_id=None,
        role="assistant",
        content=reply_text,
        source=source,
        created_at=get_current_time(),
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    logger.info(f"[INFO] Final response source: {source}")

    return session, assistant_msg


def update_message_reaction(db, message_id: int, reaction: str):
    msg = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()
    if not msg:
        return None

    # Toggle logic
    if reaction == "like":
        if msg.like:  
            # User clicked like again → remove reaction
            msg.like = None
            msg.dislike = None
        else:
            msg.like = True
            msg.dislike = None

    elif reaction == "dislike":
        if msg.dislike:
            # User clicked dislike again → remove reaction
            msg.like = None
            msg.dislike = None
        else:
            msg.dislike = True
            msg.like = None

    db.commit()
    db.refresh(msg)
    return msg