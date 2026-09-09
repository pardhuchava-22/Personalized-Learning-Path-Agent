from __future__ import annotations

from app.services.llm_service import GeminiLLMService


def run_gap_diagnosis_agent(student_name: str, subject: str, symptom: str, context: str = "") -> dict:
    llm = GeminiLLMService()
    summary = (
        f"Diagnose the missing skill behind the struggle in {subject}, using the student context and symptom analysis."
    )
    prompt = (
        f"You are the gap diagnosis agent. Student: {student_name}. Subject: {subject}. "
        f"Symptom: {symptom}. Context: {context}. Identify the exact concept or skill gap and explain the root cause."
    )
    return {
        "agent_name": "gap_diagnosis",
        "summary": summary,
        "llm_guidance": llm.generate(prompt),
        "status": "active",
    }
