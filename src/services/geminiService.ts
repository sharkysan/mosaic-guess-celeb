import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "";
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
    
    // Use the model alias prescribed in the skill
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, intriguing, one-sentence hint about the celebrity "${name}". 
      Do not mention their name in the hint. 
      Keep it mysterious but helpful.`,
      config: {
        systemInstruction: "You are a helpful assistant for a celebrity guessing game called Mosaic Quiz. Your task is to provide cryptic but helpful one-sentence hints.",
        temperature: 0.7,
      },
    });

    const hint = response.text?.trim() || "A mysterious star awaits your guess.";
    console.log(`Generated hint: ${hint}`);
    return hint;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Error generating hint with Gemini:", errorMessage);
    
    if (errorMessage.includes("RESOURCE_EXHAUSTED") || errorMessage.includes("429")) {
      return "The AI hint generator is currently at capacity. Time to use your intuition!";
    }
    
    return "A mysterious star awaits your guess.";
  }
}
