from __future__ import annotations

from app.services.llm_service import GeminiLLMService


def run_teacher_notification_agent(student_name: str, subject: str, symptom: str, context: str = "") -> dict:
    llm = GeminiLLMService()
    summary = (
        f"Generate a concise teacher update for {student_name} covering the topic, symptom, and recommended support steps in {subject}."
    )
    prompt = (
        f"You are the teacher notification agent. Student: {student_name}. Subject: {subject}. "
        f"Symptom: {symptom}. Context: {context}. Write a brief teacher note with support recommendations."
    )
    return {
        "agent_name": "teacher_notification",
        "summary": summary,
        "llm_guidance": llm.generate(prompt),
        "status": "active",
    }
