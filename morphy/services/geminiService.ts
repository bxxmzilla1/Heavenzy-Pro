import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  async transformFace(base64Image: string, characterPrompt: string): Promise<string> {
    try {
      // Get API key from localStorage (set in app settings)
      const apiKey = localStorage.getItem('geminiApiKey');
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Gemini API key not found. Please set it in Settings.');
      }
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

      // Remove data URL prefix if present
      const base64Data = base64Image.split(',')[1] || base64Image;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: 'image/jpeg',
              },
            },
            {
              text: `TRANSFORM THIS PERSON'S FACE into the fictional character described below. 
              
              MANDATORY TECHNICAL SPECS FOR ULTRA-REALISM:
              1. BACKGROUND: The character MUST be standing directly in front of an ultra-realistic, plain white or slightly off-white wall. It must look clean and professional but show subtle real-world paint texture.
              2. LIGHTING: Use professional STUDIO LIGHTING. The lighting must be balanced, clean, and high-end, similar to a professional fashion or portrait studio setup. Avoid harsh single-sided natural shadows; instead, use soft, multi-point studio illumination that highlights facial details clearly.
              3. IMAGE QUALITY: The output MUST look like a RAW, UNEDITED high-resolution photograph taken on a modern flagship smartphone camera in a studio environment. 
              4. TEXTURE: Ensure ultra-high realistic skin detail: visible pores, micro-sweat, fine hairs, and natural skin folds. Clothes must have tactile, ultra-realistic fabric textures.
              5. SCENE: Every element of the scene (lighting, background, and character) must be indistinguishable from a real-life high-end studio snapshot.
              6. IDENTITY: Maintain the exact facial structure and recognizable features of the person in the source image.
              7. TATTOO INTEGRITY: If the character description mentions tattoos, they MUST be applied only to visible bare skin. Tattoos MUST NEVER appear on top of, through, or as part of the clothing or fabric. They should look realistically inked into the skin layers.
              
              Character Description: ${characterPrompt}`,
            },
          ],
        },
      });

      let imageUrl = '';
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      if (!imageUrl) {
        throw new Error("The AI failed to generate the image. Please try a different description.");
      }

      return imageUrl;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isRetryable = errorMsg.includes('403') || 
        errorMsg.includes('PERMISSION_DENIED') || 
        errorMsg.includes('not found') ||
        errorMsg.includes('NOT_FOUND') ||
        errorMsg.includes('The AI failed to generate');

      if (isRetryable) {
        const apiKey = localStorage.getItem('geminiApiKey');
        if (!apiKey) throw error;
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
        const base64Data = base64Image.split(',')[1] || base64Image;

        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/jpeg',
                },
              },
              {
                text: `TRANSFORM THIS PERSON'S FACE into the fictional character described below. Character Description: ${characterPrompt}`,
              },
            ],
          },
        });

        if (fallbackResponse.candidates?.[0]?.content?.parts) {
          for (const part of fallbackResponse.candidates[0].content.parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
      }

      console.error("Gemini Transformation Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();