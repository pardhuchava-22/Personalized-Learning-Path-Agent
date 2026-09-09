from __future__ import annotations

from typing import Any, Dict

from app.services.agents.gap_diagnosis_agent import run_gap_diagnosis_agent
from app.services.agents.mastery_assessment_agent import run_mastery_assessment_agent
from app.services.agents.path_sequencing_agent import run_path_sequencing_agent
from app.services.agents.student_interaction_agent import run_student_interaction_agent
from app.services.agents.teacher_notification_agent import run_teacher_notification_agent


AGENT_ORDER = [
    "student_interaction",
    "mastery_assessment",
    "gap_diagnosis",
    "path_sequencing",
    "teacher_notification",
]


def run_agent_pipeline(student_name: str, subject: str, symptom: str, context: str = "") -> Dict[str, Any]:
    """Run the five-agent pipeline using one file per agent."""
    agent_map = {
        "student_interaction": run_student_interaction_agent(student_name, subject, symptom, context),
        "mastery_assessment": run_mastery_assessment_agent(student_name, subject, symptom, context),
        "gap_diagnosis": run_gap_diagnosis_agent(student_name, subject, symptom, context),
        "path_sequencing": run_path_sequencing_agent(student_name, subject, symptom, context),
        "teacher_notification": run_teacher_notification_agent(student_name, subject, symptom, context),
    }

    return {
        "student_name": student_name,
        "subject": subject,
        "symptom": symptom,
        "context": context,
        "agents": {agent_name: agent_map[agent_name] for agent_name in AGENT_ORDER},
        "summary": (
            f"{student_name} needs guided support in {subject}. "
            f"The five-agent pipeline diagnoses the issue, maps the skill gaps, creates a learning sequence, "
            f"and prepares a teacher notification."
        ),
    }
