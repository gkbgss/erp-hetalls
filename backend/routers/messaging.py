from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, User, Message
from auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/messages", tags=["messages"])

class MessageCreate(BaseModel):
    recipient_id: int
    subject: Optional[str] = ""
    content: str
    attachment: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    sender_id: int
    sender_name: str
    sender_role: str
    sender_dept: str
    recipient_id: int
    recipient_name: str = ""
    subject: str
    content: str
    attachment: Optional[str]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=MessageOut)
def send_message(payload: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipient = db.query(User).filter(User.id == payload.recipient_id, User.is_active == True).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    msg = Message(
        sender_id=current_user.id, sender_name=current_user.name,
        sender_role=current_user.role, sender_dept=current_user.department or "",
        recipient_id=payload.recipient_id, subject=payload.subject or "",
        content=payload.content, attachment=payload.attachment, is_read=False,
    )
    db.add(msg); db.commit(); db.refresh(msg)
    # Attach recipient name for response
    result = MessageOut.from_orm(msg)
    result.recipient_name = recipient.name
    return result

@router.get("/inbox", response_model=List[MessageOut])
def get_inbox(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msgs = db.query(Message).filter(Message.recipient_id == current_user.id).order_by(Message.created_at.desc()).all()
    # Attach recipient_name (= current user, since these are received messages)
    result = []
    for m in msgs:
        out = MessageOut.from_orm(m)
        out.recipient_name = current_user.name
        result.append(out)
    return result

@router.get("/sent", response_model=List[MessageOut])
def get_sent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msgs = db.query(Message).filter(Message.sender_id == current_user.id).order_by(Message.created_at.desc()).all()
    # Look up recipient names in one query
    recipient_ids = list({m.recipient_id for m in msgs})
    recipients = {u.id: u.name for u in db.query(User).filter(User.id.in_(recipient_ids)).all()}
    result = []
    for m in msgs:
        out = MessageOut.from_orm(m)
        out.recipient_name = recipients.get(m.recipient_id, "Unknown")
        result.append(out)
    return result

@router.patch("/{message_id}/read")
def mark_read(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id, Message.recipient_id == current_user.id).first()
    if not msg: raise HTTPException(status_code=404, detail="Message not found")
    msg.is_read = True; db.commit()
    return {"ok": True}

@router.delete("/{message_id}")
def delete_message(message_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    msg = db.query(Message).filter(Message.id == message_id, Message.recipient_id == current_user.id).first()
    if not msg: raise HTTPException(status_code=404, detail="Message not found")
    db.delete(msg); db.commit()
    return {"ok": True}

@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Message).filter(Message.recipient_id == current_user.id, Message.is_read == False).count()
    return {"count": count}
