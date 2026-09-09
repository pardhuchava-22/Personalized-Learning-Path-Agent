from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.db import get_db
from app.api.users import get_current_user
from app.models.user import User
from app.models.exam import Question, MCQQuestion, MCQOption

router = APIRouter(prefix="/questions", tags=["questions"])

@router.get("/questions/")
def get_exam_questions(exam_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    questions = db.query(Question).filter(Question.exam_id == exam_id).all()
    # Format questions cleanly
    formatted = []
    for q in questions:
        q_data = {
            "id": q.id,
            "question_type": q.question_type,
            "difficulty": q.difficulty,
            "title": q.title,
            "description": q.description,
            "marks": q.marks,
            "order": q.order,
            "is_mandatory": q.is_mandatory
        }
        if q.question_type == 'mcq' and q.mcq:
            q_data["options"] = [{
                "id": opt.id,
                "option_text": opt.option_text,
                "order": opt.order
            } for opt in q.mcq.options]
        elif q.question_type == 'coding' and q.coding:
            q_data["coding_details"] = {
                "programming_language": q.coding.programming_language,
                "starter_code": q.coding.starter_code
            }
        formatted.append(q_data)
    return formatted

@router.get("/questions/{question_id}/detail_view/")
def get_mcq_detail(question_id: int, db: Session = Depends(get_db)):
    mcq = db.query(MCQQuestion).filter(MCQQuestion.question_id == question_id).first()
    if not mcq:
        raise HTTPException(status_code=404, detail="MCQ details not found")
    return {
        "question_id": mcq.question_id,
        "options": [{
            "id": opt.id,
            "option_text": opt.option_text,
            "order": opt.order
        } for opt in mcq.options]
    }
