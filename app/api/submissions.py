from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any
from app.database.db import get_db
from app.api.users import get_current_user
from app.models.user import User
from app.models.exam import QuestionSubmission, MCQSubmission, CodingSubmission
from app.services.execution_service import ExecutionService

router = APIRouter(prefix="/submissions", tags=["submissions"])

class MCQSubmitRequest(BaseModel):
    enrollment_id: int
    question_id: int
    option_id: int

class CodingSubmitRequest(BaseModel):
    enrollment_id: int
    question_id: int
    code: str

class ExecuteCodeRequest(BaseModel):
    language: str
    code: str
    test_cases: List[Dict[str, Any]]

@router.post("/mcq/submit_answer/")
def submit_mcq(req: MCQSubmitRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Find or create general question submission
    sub = db.query(QuestionSubmission).filter(
        QuestionSubmission.enrollment_id == req.enrollment_id,
        QuestionSubmission.question_id == req.question_id
    ).first()
    
    if not sub:
        sub = QuestionSubmission(
            enrollment_id=req.enrollment_id,
            question_id=req.question_id,
            status="submitted",
            marks_obtained=1.0  # basic auto score
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        
    mcq_sub = db.query(MCQSubmission).filter(MCQSubmission.submission_id == sub.id).first()
    if not mcq_sub:
        mcq_sub = MCQSubmission(
            submission_id=sub.id,
            selected_option_id=req.option_id
        )
        db.add(mcq_sub)
    else:
        mcq_sub.selected_option_id = req.option_id
        
    db.commit()
    return {"detail": "MCQ choice saved successfully"}

@router.post("/coding/submit_code/")
def submit_coding(req: CodingSubmitRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(QuestionSubmission).filter(
        QuestionSubmission.enrollment_id == req.enrollment_id,
        QuestionSubmission.question_id == req.question_id
    ).first()
    
    if not sub:
        sub = QuestionSubmission(
            enrollment_id=req.enrollment_id,
            question_id=req.question_id,
            status="submitted"
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
        
    code_sub = db.query(CodingSubmission).filter(CodingSubmission.submission_id == sub.id).first()
    if not code_sub:
        code_sub = CodingSubmission(
            submission_id=sub.id,
            submitted_code=req.code,
            execution_status="pending"
        )
        db.add(code_sub)
    else:
        code_sub.submitted_code = req.code
        
    db.commit()
    return {"detail": "Coding solution submitted successfully"}

@router.post("/coding/execute_code/")
def execute_code(req: ExecuteCodeRequest):
    # Process dynamic compile safety and execution through ExecutionService sandbox
    results = ExecutionService.run_safe_code(req.language, req.code, req.test_cases)
    return results
