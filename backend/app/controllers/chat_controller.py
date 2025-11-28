from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut
from app.services.chat_service import handle_chat_message


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