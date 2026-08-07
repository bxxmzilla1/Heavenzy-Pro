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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pull a human-readable message out of Google GenAI error payloads. */
const extractErrorMessage = (error: unknown): string => {
  const raw = (error as any)?.message || String(error ?? 'Unknown error');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {
    // message may embed JSON after a prefix
  }
  const match = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      // ignore
    }
  }
  return raw;
};

const isCapacityError = (msg: string): boolean => {
  const m = msg.toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    m.includes('high demand') ||
    m.includes('overloaded') ||
    m.includes('temporarily unavailable') ||
    msg.includes('429') ||
    m.includes('resource_exhausted') ||
    m.includes('resource exhausted') ||
    m.includes('try again later')
  );
};

const extractImageData = (response: any): string | null => {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (!parts) return null;
  for (const part of parts) {
    if (part.inlineData?.data) return part.inlineData.data;
  }
  return null;
};

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
            model: 'gemini-3.5-flash',
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

        // Cascade through image models when the preferred one is overloaded / unavailable.
        const modelAttempts: Array<{
          model: string;
          imageConfig: Record<string, string>;
        }> = [
          {
            model: 'gemini-3-pro-image',
            imageConfig: { imageSize: '2K', aspectRatio },
          },
          {
            model: 'gemini-3.1-flash-image',
            imageConfig: { aspectRatio },
          },
          {
            model: 'gemini-3.1-flash-lite-image',
            imageConfig: { aspectRatio },
          },
          {
            model: 'gemini-2.5-flash-image',
            imageConfig: { aspectRatio },
          },
        ];

        let lastErrorMsg = '';

        for (let i = 0; i < modelAttempts.length; i++) {
          const { model, imageConfig } = modelAttempts[i];
          const maxRetries = 2;

          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              const response = await ai.models.generateContent({
                model,
                contents: { parts },
                config: {
                  imageConfig,
                  safetySettings,
                },
              });

              if (response.candidates?.[0]?.finishReason === 'SAFETY') {
                return res.status(400).json({
                  error: 'Generation failed. The request or response was flagged by the safety filter.',
                });
              }

              if (response.promptFeedback?.blockReason) {
                return res.status(400).json({
                  error: `Generation blocked: ${response.promptFeedback.blockReason}`,
                });
              }

              const imageData = extractImageData(response);
              if (imageData) {
                return res.status(200).json({ imageData, model });
              }

              // No image — try next model rather than failing hard on the first.
              lastErrorMsg = 'The model was unable to generate an image.';
              break;
            } catch (error: unknown) {
              const errorMsg = extractErrorMessage(error);
              lastErrorMsg = errorMsg;

              if (errorMsg.toLowerCase().includes('quota') && !isCapacityError(errorMsg)) {
                return res.status(429).json({
                  error: 'API quota exceeded. Please check your project billing status.',
                });
              }
              if (errorMsg.includes('API key not valid') || errorMsg.includes('leaked')) {
                return res.status(401).json({ error: 'The provided API key is not valid.' });
              }
              if (errorMsg.toLowerCase().includes('expired')) {
                return res.status(401).json({ error: 'Your API key has expired.' });
              }

              // Retry once on capacity spikes before falling through to the next model.
              if (isCapacityError(errorMsg) && attempt < maxRetries - 1) {
                await sleep(800 * (attempt + 1));
                continue;
              }

              // Fall through to next model for capacity / permission / not-found errors.
              break;
            }
          }
        }

        if (isCapacityError(lastErrorMsg)) {
          return res.status(503).json({
            error:
              'Image models are temporarily overloaded. Please try again in a moment.',
          });
        }

        return res.status(500).json({
          error: lastErrorMsg || 'An unexpected error occurred with the AI model.',
        });
      }

      case 'processContent': {
        const { model, contents, config } = params;

        if (!model) {
          return res.status(400).json({ error: 'model is required for processContent' });
        }

        const generateOptions: any = { model, contents };
        if (config) {
          generateOptions.config = config;
        }

        const response = await ai.models.generateContent(generateOptions);

        if (response.candidates?.[0]?.finishReason === 'SAFETY') {
          return res.status(400).json({ error: 'Request was flagged by the safety filter.' });
        }

        if (response.promptFeedback?.blockReason) {
          return res.status(400).json({ error: `Request blocked: ${response.promptFeedback.blockReason}` });
        }

        const responseText = response.text || null;

        let imageData: string | null = null;
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              imageData = part.inlineData.data;
              break;
            }
          }
        }

        return res.status(200).json({ text: responseText, imageData });
      }

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}
