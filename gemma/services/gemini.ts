import { GoogleGenAI } from "@google/genai";
import { GenerationConfig } from "../types";

// Helper to interact with the special AI Studio key selection flow required for Veo/Pro Image models
export const hasSelectedApiKey = async (): Promise<boolean> => {
  // Cast to any to avoid conflict with existing global type definitions for aistudio
  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const openApiKeySelection = async (): Promise<void> => {
  // Cast to any to avoid conflict with existing global type definitions for aistudio
  const win = window as any;
  if (win.aistudio && win.aistudio.openSelectKey) {
    await win.aistudio.openSelectKey();
  }
};

const getSkinToneDescription = (value: number): string => {
  if (value < 10) return "Very pale/fair alabaster skin";
  if (value < 30) return "Fair/Light skin";
  if (value < 50) return "Medium/Tan skin";
  if (value < 70) return "Olive/Bronze skin";
  if (value < 90) return "Dark brown skin";
  return "Very dark/Deep ebony skin";
};

export const generatePortrait = async (config: GenerationConfig): Promise<string> => {
  // Always create a new instance to ensure we capture the selected key
  // The key is injected into process.env.API_KEY by the environment after selection
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const skinDescription = getSkinToneDescription(config.skinTone);

  const prompt = `
    Generate a high-resolution studio portrait of a synthetic female model who appears clearly 18–20 years old.
    The model should look like a real person but must be fully AI-generated and not based on any actual individual.
    
    Physical Appearance:
    Ethnicity: ${config.ethnicity}.
    Skin Tone: ${skinDescription}.
    Eyes: ${config.eyeColor} color, ${config.eyeShape} shape.
    Hair: ${config.hairColor}, ${config.hairStyle}.
    Nose: ${config.noseShape}.
    Mouth/Lips: ${config.mouthShape}.
    
    Appearance Guidelines:
    Female, aged 18–20.
    Smooth skin with visible texture and pores.
    Soft, natural makeup (light foundation, light gloss, lashes).
    Subtle facial expression, not exaggerated.
    
    Clothing:
    ${config.clothing.description}.
    
    Image Style:
    Pure white or very light gray background.
    ${config.lighting}.
    Front-facing, centered.
    Head-and-shoulders or upper body framing.
    DSLR quality realism.
    Sharp focus, natural skin texture.
    
    Composition Notes:
    Symmetrical framing.
    Natural look, not posed provocatively.
    No jewelry unless minimal.
    
    Identity Constraints:
    Must be an entirely synthetic model.
    No resemblance to real people or celebrities.
    
    Image Quality:
    Photorealistic.
    Ultra-detailed.
    No distortions, no noise, no AI artifacts.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", // Portrait aspect ratio
          imageSize: "2K",    // High resolution request
        },
      },
    });

    // Iterate through parts to find the image
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Generation failed:", error);
    throw error;
  }
};