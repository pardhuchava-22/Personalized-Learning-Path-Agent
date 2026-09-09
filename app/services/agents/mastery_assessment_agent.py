from __future__ import annotations

from app.services.llm_service import GeminiLLMService


def run_mastery_assessment_agent(student_name: str, subject: str, symptom: str, context: str = "") -> dict:
    llm = GeminiLLMService()
    summary = (
        f"Assess whether {student_name} has concept mastery in {subject}, and separate strengths from recurring mistakes in problem-solving."
    )
    prompt = (
        f"You are the mastery assessment agent. Student: {student_name}. Subject: {subject}. "
        f"Symptom: {symptom}. Context: {context}. Identify the learner's current mastery level and the likely skill gaps."
    )
    return {
        "agent_name": "mastery_assessment",
        "summary": summary,
        "llm_guidance": llm.generate(prompt),
        "status": "active",
    }
