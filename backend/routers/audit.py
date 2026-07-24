from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db, AuditLog
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])

@router.get("/")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    
    # Format nicely for the frontend
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "user": log.user_email,
            "action": log.action,
            "table": log.table_name,
            "record_id": log.record_id,
            "changes": log.changes,
            "timestamp": log.timestamp.isoformat()
        })
    return results
