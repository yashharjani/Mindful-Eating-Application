from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.auth import get_current_user
from app.schemas.chat import ChatRequest, ChatResponse, ChatMessageOut, ChatSessionOut
from app.controllers.chat_controller import process_chat_message
from app.models.chat import ChatSession, ChatMessage

router = APIRouter()


@router.post("/chat/message", response_model=ChatResponse)
def send_chat_message(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return process_chat_message(payload, db, user)


@router.get("/chat/sessions", response_model=list[ChatSessionOut])
def list_chat_sessions(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    return sessions


@router.get("/chat/session/{session_id}/messages", response_model=list[ChatMessageOut])
def get_session_messages(
    session_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Ensure session belongs to user
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        return []

    msgs = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return msgs