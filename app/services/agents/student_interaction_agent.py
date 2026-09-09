from __future__ import annotations

from app.services.llm_service import GeminiLLMService


def run_student_interaction_agent(student_name: str, subject: str, symptom: str, context: str = "") -> dict:
    llm = GeminiLLMService()
    summary = (
        f"{student_name} reported difficulty in {subject}: '{symptom}'. "
        f"The interaction agent should clarify the exact issue and keep the learning goal focused."
    )
    prompt = (
        f"You are the student interaction agent. Student: {student_name}. "
        f"Subject: {subject}. Symptom: {symptom}. Context: {context}. "
        "Give a brief, supportive clarification plan for the student."
    )
    return {
        "agent_name": "student_interaction",
        "summary": summary,
        "llm_guidance": llm.generate(prompt),
        "status": "active",
    }
