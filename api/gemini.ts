import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from request body (client-provided) or environment variable (fallback)
  const { action, apiKey: clientApiKey, ...params } = req.body;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API_KEY is not configured. Please set it in Settings.' });
  }

  try {

    const ai = new GoogleGenAI({ apiKey });

    switch (action) {
      case 'validate': {
        // For validation, use the client-provided key from request body
        // The validate action may also receive apiKey in params for backward compatibility
        const { apiKey: paramKey } = params;
        const keyToUse = clientApiKey || paramKey || apiKey;
        if (!keyToUse) {
          return res.status(400).json({ error: 'API key is required for validation' });
        }
        const validationAI = new GoogleGenAI({ apiKey: keyToUse });
        
        try {
          await validationAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ text: 'Confirm API access' }] },
            config: {
              maxOutputTokens: 1,
            }
          });
          return res.status(200).json({ valid: true });
        } catch (error) {
          return res.status(200).json({ valid: false });
        }
      }

      case 'generate': {
        const { parts, aspectRatio } = params;
        
        // Attempt with Gemini 3 Pro first
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
              imageConfig: {
                imageSize: '2K',
                aspectRatio: aspectRatio,
              },
              safetySettings,
            },
          });

          // Process response
          if (response.candidates?.[0]?.finishReason === 'SAFETY') {
            return res.status(400).json({ error: 'Generation failed. The request or response was flagged by the safety filter.' });
          }
          
          if (response.promptFeedback?.blockReason) {
            return res.status(400).json({ error: `Generation blocked: ${response.promptFeedback.blockReason}` });
          }

          let imageData: string | null = null;
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                imageData = part.inlineData.data;
                break;
              }
            }
          }

          if (imageData) {
            return res.status(200).json({ imageData });
          }

          const responseText = response.text;
          if (responseText) {
            return res.status(400).json({ error: 'The model could not generate an image from your request.' });
          }

          const finishReason = response.candidates?.[0]?.finishReason;
          if (finishReason && finishReason !== 'STOP') {
            return res.status(400).json({ error: `Image generation was interrupted: ${finishReason}` });
          }

          return res.status(400).json({ error: 'The model was unable to generate an image.' });
        } catch (error: any) {
          // Fallback to Gemini 2.5 Flash on permission errors
          const errorMsg = error?.message || String(error);
          const isPermissionError = errorMsg.includes('403') || 
            errorMsg.includes('PERMISSION_DENIED') || 
            errorMsg.includes('The caller does not have permission') ||
            errorMsg.includes('Publisher Model');

          if (isPermissionError) {
            try {
              const fallbackResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                  imageConfig: {
                    aspectRatio: aspectRatio,
                  },
                  safetySettings,
                },
              });

              let imageData: string | null = null;
              if (fallbackResponse.candidates?.[0]?.content?.parts) {
                for (const part of fallbackResponse.candidates[0].content.parts) {
                  if (part.inlineData) {
                    imageData = part.inlineData.data;
                    break;
                  }
                }
              }

              if (imageData) {
                return res.status(200).json({ imageData });
              }

              return res.status(400).json({ error: 'The model was unable to generate an image.' });
            } catch (fallbackError: any) {
              return res.status(500).json({ error: fallbackError?.message || 'Generation failed' });
            }
          }

          // Handle other errors
          if (errorMsg.includes('quota')) {
            return res.status(429).json({ error: 'API quota exceeded. Please check your project billing status.' });
          }
          if (errorMsg.includes('API key not valid') || errorMsg.includes('leaked')) {
            return res.status(401).json({ error: 'The provided API key is not valid.' });
          }
          if (errorMsg.includes('expired')) {
            return res.status(401).json({ error: 'Your API key has expired.' });
          }

          return res.status(500).json({ error: errorMsg || 'An unexpected error occurred with the AI model.' });
        }
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
