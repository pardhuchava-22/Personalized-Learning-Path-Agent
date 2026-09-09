import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// This will be used in future steps when AI features are implemented
// Ensure API_KEY is present in process.env
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const geminiService = {
  // Placeholder for future AI features
  generateWelcomeMessage: async (userName: string): Promise<string> => {
    if (!ai) return `Welcome, ${userName}!`;
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate a short, motivating welcome message for a student named ${userName} starting their learning journey. Max 1 sentence.`,
      });
      return response.text || `Welcome, ${userName}!`;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return `Welcome, ${userName}!`;
    }
  }
};
