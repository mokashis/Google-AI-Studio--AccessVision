import { GoogleGenAI } from "@google/genai";
import { AppMode, Verbosity } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an intelligent accessibility assistant for visually impaired users. 
Your goal is to be their eyes. 
Speak naturally, clearly, and concisely. 
Use spatial language (clock positions, distance in feet/steps). 
Always prioritize safety warnings (stairs, cars, obstacles) before other details.
Do not use markdown formatting like asterisks or bullet points in the output, just plain text suitable for text-to-speech.
`;

const getPromptForMode = (mode: AppMode, verbosity: Verbosity): string => {
  let basePrompt = "";

  switch (mode) {
    case AppMode.NAVIGATION:
      basePrompt = "Navigation Mode. Focus ONLY on the path ahead. Identify obstacles, clear paths, doorways, changes in elevation (stairs, curbs), and hazards. Give specific directions and distances.";
      break;
    case AppMode.TEXT:
      basePrompt = "Text Reader Mode. Read all visible text clearly. If it's a menu, read items and prices. If it's a sign, explain its purpose. If it's a document, identify fields. Ignore background clutter.";
      break;
    case AppMode.SOCIAL:
      basePrompt = "Social Mode. Describe people, their approximate ages, facial expressions, body language, and where they are looking. Describe the social atmosphere (relaxed, busy, private conversation).";
      break;
    case AppMode.SHOPPING:
      basePrompt = "Shopping Mode. Identify products, read brand names and prices if visible. Compare items if multiple are present. Mention colors and packaging details.";
      break;
    case AppMode.GENERAL:
    default:
      basePrompt = "General Mode. Describe the scene comprehensively but concisely. Mention the most important objects, people, and layout of the room or area. Identify immediate surroundings.";
      break;
  }

  let lengthInstruction = "";
  if (verbosity === Verbosity.MINIMAL) {
    lengthInstruction = "Keep response under 15 words. Only critical info and hazards.";
  } else if (verbosity === Verbosity.STANDARD) {
    lengthInstruction = "Keep response under 40 words. Balance detail with speed.";
  } else {
    lengthInstruction = "Provide a detailed description (up to 70 words).";
  }

  return `${basePrompt} ${lengthInstruction} If you see an immediate danger (car, drop-off, fire), start with 'WARNING:'.`;
};

export const analyzeImage = async (
  base64Image: string, 
  mode: AppMode, 
  verbosity: Verbosity
): Promise<{ text: string; isUrgent: boolean }> => {
  try {
    const prompt = getPromptForMode(mode, verbosity);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4, // Lower temperature for more accurate/factual descriptions
      }
    });

    const text = response.text || "I couldn't analyze the scene.";
    const isUrgent = text.toUpperCase().includes("WARNING") || text.toUpperCase().includes("CAUTION");

    return { text, isUrgent };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { text: "Connection error. Please try again.", isUrgent: false };
  }
};