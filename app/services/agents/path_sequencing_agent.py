from __future__ import annotations

from app.services.llm_service import GeminiLLMService


def run_path_sequencing_agent(student_name: str, subject: str, symptom: str, context: str = "") -> dict:
    llm = GeminiLLMService()
    summary = (
        f"Create a step-by-step study plan for {student_name} in {subject} that targets foundational skills before advanced practice."
    )
    prompt = (
        f"You are the path sequencing agent. Student: {student_name}. Subject: {subject}. "
        f"Symptom: {symptom}. Context: {context}. Propose a clear learning sequence from fundamentals to application."
    )
    return {
        "agent_name": "path_sequencing",
        "summary": summary,
        "llm_guidance": llm.generate(prompt),
        "status": "active",
    }
