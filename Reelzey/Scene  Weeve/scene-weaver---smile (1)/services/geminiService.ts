
import { GoogleGenAI } from "@google/genai";
import { Mood, Duration, CameraView } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function enhancePrompt(prompt: string): Promise<string> {
  try {
    const model = 'gemini-3-flash-preview';
    const enhancerPrompt = `You are a creative prompt engineer. Enhance the following user prompt for an AI image-to-scene generator. Make it more descriptive, evocative, and detailed, focusing on potential actions, emotions, and subtle movements. Keep it concise, under 50 words.
    
    User prompt: "${prompt}"
    
    Enhanced prompt:`;

    const response = await ai.models.generateContent({
      model: model,
      contents: enhancerPrompt,
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    throw new Error("Failed to communicate with the Gemini API for prompt enhancement.");
  }
}

export async function generateScene(
  image: { mimeType: string; data: string },
  mood: Mood,
  cameraView: CameraView,
  duration: Duration,
  prompt?: string
): Promise<string> {
  try {
    const model = 'gemini-3-flash-preview';
    
    let systemPrompt = `You are an expert scene director for short-form video. Your task is to generate a detailed script for a ${duration}-second video clip based on an image, a mood, a camera view, and an optional user prompt.
    - The output must be a description of continuous action.
    - Describe the physical body movements, subtle facial expressions, and changes in posture in great detail.
    - The scene must strongly evoke a "${mood}" mood.
    - The scene should be framed from a "${cameraView}" perspective.
    - The main subject is the person in the provided image.
    - IMPORTANT RULE for smiles: When describing a smile, use subtle terms like "soft smile" or "gentle smile". Avoid exaggerated descriptions like "big smile" or "wide smile". Crucially, whenever you describe any form of smiling, you MUST follow it with the exact phrase "without stretching the face a lot".`;

    if (prompt) {
      systemPrompt += `\n- Incorporate the following user idea into the scene: "${prompt}"`;
    } else {
      systemPrompt += `\n- Analyze the person in the image and create a scene that fits their appearance and the selected mood.`;
    }

    const imagePart = {
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    };

    const textPart = {
      text: systemPrompt,
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [imagePart, textPart] }
    });
    
    return response.text;

  } catch (error) {
    console.error("Error generating scene:", error);
    throw new Error("Failed to communicate with the Gemini API for scene generation.");
  }
}
