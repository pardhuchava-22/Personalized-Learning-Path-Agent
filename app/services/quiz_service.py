from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional


@dataclass
class QuizQuestion:
    id: str
    question: str
    options: List[str]
    correct_answer: str
    explanation: str


@dataclass
class QuizResult:
    score: int
    total: int
    percentage: float
    correct_answers: List[str]
    wrong_answers: List[str]


class QuizService:
    """Standalone backend quiz helper for the project.

    This file is intentionally isolated so it does not affect the current
    student/faculty login pages or any UI styling.
    """

    @staticmethod
    def generate_quiz(subject: str, difficulty: str = "medium") -> List[QuizQuestion]:
        base_questions = {
            "math": [
                {
                    "id": "math_1",
                    "question": "What is 12 × 8?",
                    "options": ["84", "96", "108", "112"],
                    "correct_answer": "96",
                    "explanation": "12 × 8 = 96.",
                },
                {
                    "id": "math_2",
                    "question": "Solve: 5x = 30",
                    "options": ["x = 4", "x = 5", "x = 6", "x = 7"],
                    "correct_answer": "x = 6",
                    "explanation": "Divide both sides by 5: x = 30 / 5 = 6.",
                },
            ],
            "science": [
                {
                    "id": "science_1",
                    "question": "Which planet is known as the Red Planet?",
                    "options": ["Venus", "Mars", "Jupiter", "Mercury"],
                    "correct_answer": "Mars",
                    "explanation": "Mars appears red because of iron oxide on its surface.",
                }
            ],
            "general": [
                {
                    "id": "general_1",
                    "question": "Which language is widely used to build web interfaces?",
                    "options": ["Python", "HTML", "JavaScript", "SQL"],
                    "correct_answer": "JavaScript",
                    "explanation": "JavaScript is the standard language for interactive frontend web behavior.",
                }
            ],
        }

        subject_key = (subject or "general").lower()
        questions = base_questions.get(subject_key, base_questions["general"])

        if difficulty.lower() == "easy":
            return [QuizQuestion(**q) for q in questions[:1]]
        if difficulty.lower() == "hard":
            return [QuizQuestion(**q) for q in questions]
        return [QuizQuestion(**q) for q in questions]

    @staticmethod
    def evaluate_quiz(questions: List[QuizQuestion], answers: Dict[str, str]) -> QuizResult:
        score = 0
        correct_answers: List[str] = []
        wrong_answers: List[str] = []

        for question in questions:
            selected = answers.get(question.id)
            if selected == question.correct_answer:
                score += 1
                correct_answers.append(question.id)
            else:
                wrong_answers.append(question.id)

        total = len(questions)
        percentage = round((score / total) * 100, 2) if total else 0.0

        return QuizResult(
            score=score,
            total=total,
            percentage=percentage,
            correct_answers=correct_answers,
            wrong_answers=wrong_answers,
        )

    @staticmethod
    def get_question_by_id(questions: List[QuizQuestion], question_id: str) -> Optional[QuizQuestion]:
        for question in questions:
            if question.id == question_id:
                return question
        return None


# Example usage:
# service = QuizService()
# questions = service.generate_quiz("math", "medium")
# result = service.evaluate_quiz(questions, {"math_1": "96"})
# print(result)
