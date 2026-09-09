from app.services.llm_service import GeminiLLMService
from app.services.five_agents import run_agent_pipeline


def test_llm_service_has_status_and_generation():
    service = GeminiLLMService()
    assert service.is_configured() in (True, False)
    payload = service.generate("Explain the value of personalized learning in one sentence.")
    assert isinstance(payload, str)
    assert len(payload) > 0


def test_agent_pipeline_has_five_agents():
    result = run_agent_pipeline(
        student_name="Alice",
        subject="Mathematics",
        symptom="I struggle with word problems and setting up equations.",
        context="She passed algebra with 82% but needs support with application questions."
    )
    assert isinstance(result, dict)
    assert "agents" in result
    assert len(result["agents"]) == 5
    assert set(result["agents"].keys()) == {
        "student_interaction",
        "mastery_assessment",
        "gap_diagnosis",
        "path_sequencing",
        "teacher_notification",
    }
