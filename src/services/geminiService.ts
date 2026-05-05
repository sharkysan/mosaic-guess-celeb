import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateCelebrityHint(name: string): Promise<string> {
  try {
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

    return response.text?.trim() || "No hint available for this celebrity.";
  } catch (error) {
    console.error("Error generating hint:", error);
    return "A mysterious star awaits your guess.";
  }
}
