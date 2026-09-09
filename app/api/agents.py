from fastapi import APIRouter
from pydantic import BaseModel

from app.services.five_agents import run_agent_pipeline
from app.services.llm_service import GeminiLLMService

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentRequest(BaseModel):
    student_name: str = "Student"
    subject: str = "Mathematics"
    symptom: str = "I am struggling with the subject."
    context: str = ""
    prompt: str = ""


@router.get("/llm/status")
def llm_status():
    service = GeminiLLMService()
    return {
        "provider": "google-gemini",
        "configured": service.is_configured(),
        "model": service.model,
    }


@router.post("/llm/run")
def run_llm(request: AgentRequest):
    service = GeminiLLMService()
    prompt = request.prompt or (
        f"Student: {request.student_name}. Subject: {request.subject}. Symptom: {request.symptom}. Context: {request.context}"
    )
    return {
        "provider": "google-gemini",
        "configured": service.is_configured(),
        "answer": service.generate(prompt),
    }


@router.post("/diagnostic")
def run_diagnostic(request: AgentRequest):
    return run_agent_pipeline(
        student_name=request.student_name,
        subject=request.subject,
        symptom=request.symptom,
        context=request.context,
    )
