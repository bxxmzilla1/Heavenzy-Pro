
import { AspectRatio, UploadedImage } from "../types";

// Helper function to get API base URL (works in both dev and production)
const getApiBaseUrl = (): string => {
  // In development, Vite dev server runs on port 5173 by default
  // But we need to proxy to Vercel dev server or use relative URLs
  // For now, use relative URL which works in both cases
  return '';
};

// Helper function to get API key from localStorage
const getApiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('geminiApiKey');
  }
  return null;
};

// Helper function to call the serverless API
const callGeminiAPI = async (action: string, params: any): Promise<any> => {
  const baseUrl = getApiBaseUrl();
  const apiKey = getApiKey();
  
  // If apiKey is provided in params, use it; otherwise use localStorage key
  const apiKeyToUse = params.apiKey || apiKey;
  
  // Remove apiKey from params to avoid duplication
  const { apiKey: _, ...restParams } = params;
  
  const response = await fetch(`${baseUrl}/api/gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, apiKey: apiKeyToUse, ...restParams }),
  });

  // Handle 413 Content Too Large error specifically
  if (response.status === 413) {
    throw new Error('The images you uploaded are too large. Please try using smaller images or compress them before uploading.');
  }

  // Try to parse JSON, but handle non-JSON error responses gracefully
  let data;
  try {
    data = await response.json();
  } catch (error) {
    // If response is not JSON, try to get text
    const text = await response.text();
    if (response.status === 413) {
      throw new Error('The images you uploaded are too large. Please try using smaller images or compress them before uploading.');
    }
    throw new Error(`Server error: ${text || response.statusText}`);
  }

  if (!response.ok) {
    const err = data?.error;
    let message = 'API request failed';
    if (typeof err === 'string') {
      message = err;
      try {
        const nested = JSON.parse(err);
        if (nested?.error?.message) message = nested.error.message;
      } catch {
        // plain string error
      }
    } else if (err && typeof err === 'object' && typeof err.message === 'string') {
      message = err.message;
    }
    throw new Error(message);
  }

  return data;
};

export const validateApiKey = async (apiKey?: string): Promise<boolean> => {
  // Use provided apiKey or get from localStorage
  const keyToValidate = apiKey || getApiKey();
  if (!keyToValidate) return false;
  
  try {
    const result = await callGeminiAPI('validate', { apiKey: keyToValidate });
    return result.valid === true;
  } catch (error) {
    console.warn("API Key validation check failed:", error);
    return false;
  }
};

export const editImageWithPrompt = async (
  personImage: UploadedImage,
  referenceImage: UploadedImage,
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> => {
  const personImagePart = {
    inlineData: {
      data: personImage.base64,
      mimeType: personImage.mimeType,
    },
  };
  
  const referenceImagePart = {
    inlineData: {
      data: referenceImage.base64,
      mimeType: referenceImage.mimeType,
    },
  };

  let engineeredPrompt = `**Primary Objective:** Create a photorealistic image that is an **exact replica** of the person from the first image, but placed into the context of the second reference image.

**CRITICAL INSTRUCTIONS:**
1.  **Identity Preservation (Highest Priority):**
    *   The person in the output image **MUST** have the identical facial features, facial structure, skin tone, hair style, and eye color as the person in the **first image**.
    *   Treat the first image as a "face lock". Do **NOT** alter the person's likeness in any way. Do **NOT** blend features from the reference image's person.
2.  **Contextual Adaptation (Secondary Priority):**
    *   Use the **second image** as a reference for the **pose, clothing, background, and lighting style**.
    *   Apply these elements to the person from the first image.
    *   **NEVER** copy the face or identity from the second image.

**Final Output:** A seamless, high-quality photograph where the person from image 1 is perfectly recognizable and integrated into the scene from image 2.`;

  if (prompt) {
    engineeredPrompt += `\n\n**Additional User Modifications:** ${prompt}`;
  }

  const textPart = { text: engineeredPrompt };
  const parts = [personImagePart, referenceImagePart, textPart];

  const result = await callGeminiAPI('generate', { parts, aspectRatio });
  return result.imageData;
};


export const editImageWithPromptOnly = async (
  personImage: UploadedImage,
  prompt: string,
  aspectRatio: AspectRatio,
  backgroundImage: UploadedImage | null
): Promise<string> => {
  const personImagePart = {
    inlineData: {
      data: personImage.base64,
      mimeType: personImage.mimeType,
    },
  };
  // FIX: Explicitly type `parts` as `any[]` to allow both image and text parts to be pushed later.
  const parts: any[] = [personImagePart];

  let engineeredPrompt: string;

  if (backgroundImage) {
      const backgroundImagePart = {
          inlineData: {
              data: backgroundImage.base64,
              mimeType: backgroundImage.mimeType,
          },
      };
      parts.push(backgroundImagePart);

      engineeredPrompt = `**Primary Objective:** Generate a photorealistic image featuring an **exact replica** of the person from the first uploaded image, placing them seamlessly into the provided background image.

**CRITICAL INSTRUCTIONS:**
1.  **Identity Preservation (Highest Priority):**
    *   The person in the output image **MUST** have the identical facial features, facial structure, skin tone, hair style, and eye color as the person in the **first uploaded image**.
    *   Treat the first image as a "face lock". Do **NOT** alter the person's likeness.
2.  **Background & Lighting Integration (Highest Priority):**
    *   Use the **second uploaded image** as the definitive background for the scene. Do **NOT** generate a new background.
    *   **Lighting Replication (Crucial):** The lighting on the person (including highlights, shadows, ambient light, and color temperature) **MUST** perfectly match the lighting conditions present in the background image. The person should look as if they were photographed in that exact environment.
    *   Place the person realistically within this background, ensuring consistent shadows and perspective.
3.  **User-Directed Modifications (Secondary Priority):**
    *   Apply the following changes based on the user's description: "${prompt}"
    *   These changes should primarily apply to the person's clothing, pose, or expression. Modifications to the background should be minimal and only if explicitly requested.

**Final Output:** A high-quality, realistic photograph that strictly preserves the person's identity and places them believably in the provided background with perfectly matched lighting, while incorporating the requested modifications.`;

  } else {
      engineeredPrompt = `**Primary Objective:** Generate a photorealistic image featuring an **exact replica** of the person from the uploaded image, modified ONLY by the user's description.

**CRITICAL INSTRUCTIONS:**
1.  **Identity Preservation (Highest Priority):**
    *   The person in the output image **MUST** have the identical facial features, facial structure, skin tone, hair style, and eye color as the person in the uploaded image.
    *   Treat the uploaded image as a "face lock". Do **NOT** alter the person's likeness unless specifically instructed to in the prompt below.
2.  **User-Directed Modifications (Secondary Priority):**
    *   Apply the following changes based on the user's description: "${prompt}"
    *   These changes should apply to clothing, background, pose, or expression, but **NOT** the core identity.

**Final Output:** A high-quality, realistic photograph that strictly preserves the person's identity while incorporating the requested modifications.`;
  }

  parts.push({ text: engineeredPrompt });

  const result = await callGeminiAPI('generate', { parts, aspectRatio });
  return result.imageData;
};

export const editImageWithMultiplePeople = async (
    personImages: UploadedImage[],
    prompt: string,
    aspectRatio: AspectRatio,
    backgroundImage: UploadedImage | null
): Promise<string> => {
    const personImageParts = personImages.map(image => ({
        inlineData: {
            data: image.base64,
            mimeType: image.mimeType,
        },
    }));

    // FIX: Explicitly type `parts` as `any[]` to allow both image and text parts to be pushed later.
    const parts: any[] = [...personImageParts];
    let engineeredPrompt: string;
    
    const identityInstructions = personImages.map((_, index) => 
        `*   **For the person in input image #${index + 1}:** You **MUST** create an exact replica. The facial features, structure, skin tone, hair, and eye color must be identical. Do not alter their likeness in any way.`
    ).join('\n    ');

    if (backgroundImage) {
        const backgroundImagePart = {
            inlineData: {
                data: backgroundImage.base64,
                mimeType: backgroundImage.mimeType,
            },
        };
        parts.push(backgroundImagePart);

        engineeredPrompt = `**Primary Objective:** Create a single, cohesive, photorealistic image that includes **exact replicas** of every person from the initial input images, placing them seamlessly into the provided background image.

**CRITICAL INSTRUCTIONS:**
1.  **Identity Preservation (HIGHEST PRIORITY):**
    This is the most important rule. For each person, you must follow this instruction precisely:
    ${identityInstructions}
    *   **Unbreakable Rule:** Treat each input image as an unchangeable "face lock" for one individual. Do **NOT** blend, merge, or average features between different people. Each person must be distinctly and accurately represented.

2.  **Background & Lighting Integration (HIGHEST PRIORITY):**
    *   Use the **LAST** uploaded image as the definitive background for the scene. Do **NOT** generate a new background.
    *   **Lighting Replication (Crucial):** The lighting on all individuals (including highlights, shadows, ambient light, and color temperature) **MUST** perfectly match the lighting conditions present in the background image. Everyone should look as if they were photographed together in that exact environment.
    *   Place all the replicated people realistically within this background, ensuring consistent shadows and perspective.

3.  **Scene Composition (SECONDARY PRIORITY):**
    *   **User's Prompt:** "${prompt}"
    *   Arrange the people naturally within the provided background, considering the context of the user's prompt. Apply any requested changes to clothing, pose, or expression.

**Final Output:** A seamless, high-quality photograph containing all the individuals, where each person is a perfect and recognizable replica from their respective source image, integrated into the provided background with perfectly matched lighting.`;

    } else {
        engineeredPrompt = `**Primary Objective:** Create a single, cohesive, photorealistic image that includes **exact replicas** of every person from all the provided input images.

**CRITICAL INSTRUCTIONS - IDENTITY PRESERVATION (HIGHEST PRIORITY):**
This is the most important rule. For each person, you must follow this instruction precisely:
    ${identityInstructions}

*   **Unbreakable Rule:** Treat each input image as an unchangeable "face lock" for one individual. Do **NOT** blend, merge, or average features between different people. Each person must be distinctly and accurately represented as they appear in their source image. Failure to replicate each face exactly is a failure of the entire task.

**SCENE COMPOSITION (SECONDARY PRIORITY):**
*   **User's Prompt:** "${prompt}"
*   Place all the replicated individuals into the scene described in the user's prompt.
*   Arrange the people naturally within this scene, considering the context of the prompt.

**Final Output:** A seamless, high-quality photograph containing all the individuals, where each person is a perfect and recognizable replica from their respective source image, integrated into the described environment.`;
    }

    parts.push({ text: engineeredPrompt });

    const result = await callGeminiAPI('generate', { parts, aspectRatio });
    return result.imageData;
};