import { GoogleGenAI } from "@google/genai";
import {
  PersonalizedLearningPathState,
  StudentQuestionData,
  StudentInteractionMessage,
} from "../types";

const STORAGE_KEY = "quantumguard_learning_path_state_v1";

const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const createInitialLearningPathState = (): PersonalizedLearningPathState => ({
  sessionId: `LP-${Date.now().toString(36).toUpperCase()}`,
  currentExecutionStep: 1,
  studentQuestion: null,
  interactionHistory: [],
  activeAgent: "student_interaction",
  agentStatuses: {
    student_interaction: "active",
    mastery_assessment: "idle",
    gap_diagnosis: "idle",
    path_sequencing: "idle",
    teacher_notification: "idle",
  },
  stepStatuses: {
    1: "active",
    2: "locked",
    3: "locked",
    4: "locked",
    5: "locked",
    6: "locked",
  },
});

export const learningPathAgentService = {
  // Load saved state or return fresh initial state
  loadState: (): PersonalizedLearningPathState => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Could not parse saved learning path state:", e);
    }
    return createInitialLearningPathState();
  },

  // Save current state
  saveState: (state: PersonalizedLearningPathState): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not persist learning path state:", e);
    }
  },

  // Clear session
  resetState: (): PersonalizedLearningPathState => {
    const fresh = createInitialLearningPathState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not clear learning path state:", e);
    }
    return fresh;
  },

  // Process initial Student Question (Execution Requirement 1 / Student Interaction Agent)
  processStudentQuestion: async (
    question: string,
    selfReportedSubject: string = "Algebra",
    confidence: "low" | "medium" | "high" = "medium",
    currentState?: PersonalizedLearningPathState
  ): Promise<PersonalizedLearningPathState> => {
    const state: PersonalizedLearningPathState = currentState || learningPathAgentService.loadState();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Build Student Question Record
    const questionRecord: StudentQuestionData = {
      id: `Q-${Date.now()}`,
      rawQuestion: question.trim(),
      selfReportedSubject,
      confidenceLevel: confidence,
      submittedAt: new Date().toISOString(),
      status: "clarifying",
    };

    // 2. Student message
    const studentMsg: StudentInteractionMessage = {
      id: `msg-${Date.now()}-student`,
      sender: "student",
      text: question.trim(),
      timestamp,
    };

    // 3. Agent response generation (using Gemini if available, fallback simulator otherwise)
    let agentText = "";
    let agentThought = "";
    let suggestedClarifications: string[] = [];

    const isAlgebraWordProblem =
      question.toLowerCase().includes("word problem") ||
      question.toLowerCase().includes("algebra") ||
      question.toLowerCase().includes("pass") ||
      question.toLowerCase().includes("formula");

    if (ai) {
      try {
        const prompt = `You are the Student Interaction Agent in QuantumGuard's Personalized Learning Path System.
A student asked the following learning question or described their struggle:
"${question}"
Subject reported: "${selfReportedSubject}", Confidence: "${confidence}".

Your role right now as the Student Interaction Agent (Step 1: Student Question):
1. Acknowledge the student's question with warmth, active listening, and validation.
2. Ask 1-2 sharp clarifying questions to pinpoint their exact learning hurdle.
3. Keep your response conversational, concise (under 80 words), and encouraging.
Also provide 3 short clickable clarification quick-replies.

Format your response as valid JSON with keys:
{
  "thought": "internal agent rationale about the student's question and emotional/cognitive state",
  "reply": "agent conversational reply to the student",
  "quickReplies": ["option 1", "option 2", "option 3"]
}`;

        const resp = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        const raw = resp.text || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          agentText = parsed.reply || "";
          agentThought = parsed.thought || "";
          suggestedClarifications = parsed.quickReplies || [];
        }
      } catch (err) {
        console.warn("Gemini query error, falling back to local heuristic response:", err);
      }
    }

    // Heuristic fallback if Gemini is not configured or failed
    if (!agentText) {
      if (isAlgebraWordProblem) {
        agentThought =
          "Student exhibits discrepancy between procedural computation (passing tests) and semantic mathematical translation (word problems). Activating diagnostic clarification loop.";
        agentText =
          "I hear you! It's actually very common to understand formulas well, yet feel stuck when they're wrapped in paragraphs of text. Let's pinpoint where the friction occurs. Which of these feels most challenging?";
        suggestedClarifications = [
          "Translating word sentences into mathematical equations",
          "Identifying what the unknown variables (e.g. x, y) represent",
          "Multi-step problems where one step depends on another",
        ];
      } else {
        agentThought = `Analyzing student inquiry regarding ${selfReportedSubject}. Detecting underlying conceptual questions.`;
        agentText = `Thanks for sharing this question with me! To tailor your learning path precisely, could you clarify what part of this topic you'd like us to focus on?`;
        suggestedClarifications = [
          "Understanding the foundational concepts first",
          "Step-by-step worked examples",
          "Strategies for solving exam-style questions",
        ];
      }
    }

    const agentMsg: StudentInteractionMessage = {
      id: `msg-${Date.now()}-agent`,
      sender: "agent",
      text: agentText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agentThought,
      suggestedClarifications,
      isClarification: true,
    };

    const updatedState: PersonalizedLearningPathState = {
      ...state,
      currentExecutionStep: 1,
      studentQuestion: questionRecord,
      interactionHistory: [...state.interactionHistory, studentMsg, agentMsg],
      activeAgent: "student_interaction",
      agentStatuses: {
        ...state.agentStatuses,
        student_interaction: "active",
      },
      stepStatuses: {
        ...state.stepStatuses,
        1: "active",
      },
    };

    learningPathAgentService.saveState(updatedState);
    return updatedState;
  },

  // Process Student Clarification Response (Completes Requirement 1 & Intake)
  processClarificationResponse: async (
    clarification: string,
    currentState?: PersonalizedLearningPathState
  ): Promise<PersonalizedLearningPathState> => {
    const state: PersonalizedLearningPathState = currentState || learningPathAgentService.loadState();
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const studentMsg: StudentInteractionMessage = {
      id: `msg-${Date.now()}-student-clarify`,
      sender: "student",
      text: clarification,
      timestamp,
    };

    const agentThought =
      "Student confirmed specific hurdle context. Execution Requirement 1 (Student Question intake) successfully completed by Student Interaction Agent. Context packet packaged for Stage 2.";

    const agentText =
      `Got it! I have recorded your question and identified that ${clarification.toLowerCase()} is your primary hurdle. Your question intake is now officially registered in the learning pipeline. Requirement 1 is fulfilled and ready for subject & symptom analysis!`;

    const agentMsg: StudentInteractionMessage = {
      id: `msg-${Date.now()}-agent-confirm`,
      sender: "agent",
      text: agentText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agentThought,
      isClarification: false,
    };

    const updatedQuestion: StudentQuestionData | null = state.studentQuestion
      ? {
          ...state.studentQuestion,
          contextNotes: clarification,
          status: "confirmed",
        }
      : null;

    const updatedState: PersonalizedLearningPathState = {
      ...state,
      currentExecutionStep: 1,
      studentQuestion: updatedQuestion,
      interactionHistory: [...state.interactionHistory, studentMsg, agentMsg],
      activeAgent: "student_interaction",
      agentStatuses: {
        ...state.agentStatuses,
        student_interaction: "completed",
      },
      stepStatuses: {
        ...state.stepStatuses,
        1: "completed",
      },
    };

    learningPathAgentService.saveState(updatedState);
    return updatedState;
  },
};
