import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    let apiKey = "";
    try {
      apiKey = (typeof process !== "undefined" && process.env) ? process.env.GEMINI_API_KEY || "" : "";
    } catch (e) {
      console.warn("Could not access process.env.GEMINI_API_KEY", e);
    }
    
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function generateCelebrityHint(name: string): Promise<string> {
  try {
    const ai = getAI();
    console.log(`Generating hint for: ${name}`);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, intriguing, one-sentence hint about the celebrity "${name}".
      The hint should NOT mention their name. 
      It should be something that helps players guess who they are, perhaps mentioning a famous role, achievement, or distinctive trait.`,
      config: {
        systemInstruction: "You are a helpful assistant for a celebrity guessing game called Mosaic Minds. Your task is to provide cryptic but helpful one-sentence hints.",
        temperature: 0.7,
      },
    });

    if (!response || !response.text) {
      console.warn("Gemini returned empty response for hint.");
      return "A mysterious star awaits your guess.";
    }

    const hint = response.text.trim();
    console.log(`Generated hint: ${hint}`);
    return hint;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Error generating hint with Gemini:", errorMessage);
    
    if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      return "The AI hint generator is currently at capacity. Time to use your intuition!";
    }
    
    return "A mysterious star awaits your guess.";
  }
}
