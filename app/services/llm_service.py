import logging
import os
from typing import Optional

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover - optional dependency handling
    genai = None


class GeminiLLMService:
    """Small Gemini wrapper for the main FastAPI backend.

    This keeps the existing UI untouched while exposing a backend-ready LLM
    integration that can be used by agent workflows or future modules.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        self.configured = False

        if self.api_key and genai is not None:
            try:
                genai.configure(api_key=self.api_key)
                self.configured = True
            except Exception as exc:  # pragma: no cover - defensive fallback
                logging.warning("Gemini configuration failed: %s", exc)
                self.configured = False

    def is_configured(self) -> bool:
        return self.configured

    def generate(self, prompt: str, *, system_prompt: Optional[str] = None) -> str:
        if not prompt or not str(prompt).strip():
            return "No prompt was provided for the LLM."

        if not self.configured or genai is None:
            return self._fallback_response(prompt)

        try:
            model = genai.GenerativeModel(
                self.model,
                system_instruction=system_prompt or (
                    "You are a careful learning coach that provides concise, actionable guidance."
                ),
            )
            response = model.generate_content(prompt)
            text = getattr(response, "text", None)
            if text:
                return text.strip()
            return str(response).strip()
        except Exception as exc:  # pragma: no cover - fallback during API outages
            logging.warning("Gemini generation failed: %s", exc)
            return self._fallback_response(prompt)

    def _fallback_response(self, prompt: str) -> str:
        prompt_lower = prompt.lower()

        if "word problem" in prompt_lower or "equation" in prompt_lower or "algebra" in prompt_lower:
            return (
                "Use a structured approach: identify the unknown, translate the sentence into an equation, "
                "solve the equation step-by-step, and then check the answer in context."
            )

        if "math" in prompt_lower or "science" in prompt_lower:
            return (
                "Break the topic into the core concept, one worked example, guided practice, and a short review "
                "check to reinforce mastery."
            )

        return (
            "The learner should follow a simple cycle: explain the concept, practice one worked example, "
            "apply it to a new problem, and review the mistakes before moving forward."
        )
