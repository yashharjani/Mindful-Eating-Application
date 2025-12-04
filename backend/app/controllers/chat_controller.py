from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut
from app.services.chat_service import handle_chat_message, update_message_reaction
from app.models.chat import ChatMessage


def process_chat_message(payload: ChatRequest, db: Session, user: User) -> ChatResponse:
    session, assistant_msg = handle_chat_message(
        db=db,
        user=user,
        prompt=payload.prompt,
        session_id=payload.session_id,
    )

    msg_out = ChatMessageOut.from_orm(assistant_msg)

    return ChatResponse(
        session_id=session.id,
        message=msg_out,
    )

def process_reaction(message_id: int, reaction: str, db: Session, user: User):
    # Ensure message belongs to this user’s session
    msg = (
        db.query(ChatMessage)
        .filter(ChatMessage.id == message_id)
        .first()
    )

    if not msg:
        return None

    updated = update_message_reaction(db, message_id, reaction)
    return updated
