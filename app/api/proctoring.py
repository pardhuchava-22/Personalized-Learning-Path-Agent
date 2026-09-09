from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import datetime
import json
from app.database.db import get_db
from app.api.users import get_current_user
from app.models.user import User
from app.models.exam import ExamSession, ProctoringViolation, ActivityLog

router = APIRouter(prefix="/proctoring", tags=["proctoring"])

class StartSessionRequest(BaseModel):
    enrollment_id: int
    device_info: Optional[dict] = {}

class LogActivityRequest(BaseModel):
    session_id: int
    activity_type: str
    description: Optional[str] = ""

@router.post("/sessions/start_session/")
def start_session(req: StartSessionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(ExamSession).filter(ExamSession.enrollment_id == req.enrollment_id).first()
    if existing:
        existing.status = "active"
        existing.session_start = datetime.datetime.utcnow()
        db.commit()
        return {"session_id": existing.id}
        
    session = ExamSession(
        enrollment_id=req.enrollment_id,
        status="active",
        device_info=json.dumps(req.device_info),
        user_agent=""
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id}

@router.post("/sessions/{session_id}/end_session/")
def end_session(session_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(ExamSession).filter(ExamSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Proctoring session not found")
        
    session.status = "ended"
    session.session_end = datetime.datetime.utcnow()
    db.commit()
    return {"detail": "Proctoring session ended"}

@router.post("/activities/log_activity/")
def log_activity(req: LogActivityRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    activity = ActivityLog(
        session_id=req.session_id,
        activity_type=req.activity_type,
        description=req.description
    )
    db.add(activity)
    db.commit()
    return {"detail": "Activity logged"}

@router.post("/violations/report_violation/")
async def report_violation(
    enrollment_id: int = Form(...),
    violation_type: str = Form(...),
    description: Optional[str] = Form(""),
    severity: Optional[str] = Form("medium"),
    detections: Optional[str] = Form("{}"),
    evidence_screenshot: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Process screenshot file
    screenshot_name = None
    if evidence_screenshot:
        screenshot_name = f"violations/{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{evidence_screenshot.filename}"
        os_dir = os.path.join("media", "violations")
        os.makedirs(os_dir, exist_ok=True)
        with open(os.path.join("media", screenshot_name), "wb") as f:
            f.write(await evidence_screenshot.read())
            
    violation = ProctoringViolation(
        enrollment_id=enrollment_id,
        violation_type=violation_type,
        description=description,
        severity=severity,
        detections=detections,
        evidence_screenshot=screenshot_name
    )
    db.add(violation)
    
    # Update violation count on session
    session = db.query(ExamSession).filter(ExamSession.enrollment_id == enrollment_id).first()
    if session:
        session.total_violations += 1
        
    db.commit()
    return {"detail": "Violation reported successfully"}

import os
