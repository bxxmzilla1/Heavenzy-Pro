import React, { useState, useCallback } from 'react';

interface ImageData {
  file?: File;
  preview: string;
  base64?: string;
  url?: string;
}

export const FuckifyPage: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleReset = () => {
    setImages([]);
    setPrompt('');
    setLoading(false);
    setLoadingMessage('');
    setError(null);
    setSuccessMessage(null);
    setGeneratedImageUrl(null);
    setRequestId(null);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (images.length >= 3) {
      setError('Maximum 3 images allowed');
      return;
    }
    setError(null);
    const base64 = await convertToBase64(file);
    const preview = URL.createObjectURL(file);
    setImages(prev => [...prev, { file, preview, base64 }]);
  }, [images.length]);

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const newImages = [...prev];
      if (newImages[index].file) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please provide at least one image');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedImageUrl(null);
    setLoadingMessage('Submitting your request...');

    const WAVESPEED_API_KEY = localStorage.getItem('wavespeedApiKey');

    if (!WAVESPEED_API_KEY) {
      setError('Wavespeed API key is not configured. Please add it in the Settings menu.');
      setLoading(false);
      return;
    }

    try {
      // Prepare images array - use base64 data URIs for files, URLs for URL inputs
      const imageArray = images.map(img => {
        if (img.base64) {
          return img.base64; // Base64 data URI
        } else if (img.url) {
          return img.url; // Public URL
        }
        return img.preview; // Fallback
      });

      const requestBody: any = {
        enable_prompt_expansion: false,
        images: imageArray,
        seed: -1,
      };

      // Only add prompt if provided
      if (prompt.trim()) {
        requestBody.prompt = prompt.trim();
      }

      const postResponse = await fetch('https://api.wavespeed.ai/api/v3/alibaba/wan-2.6/image-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({ message: postResponse.statusText }));
        throw new Error(errorData.message || errorData.msg || `API request failed with status ${postResponse.status}`);
      }

      const prediction = await postResponse.json();
      const newRequestId = prediction.id;

      if (!newRequestId) {
        setLoading(false);
        setLoadingMessage('');
        setSuccessMessage('Your image edit is now processing. Please check back later.');
        return;
      }

      setRequestId(newRequestId);

      // Poll for results
      let attempts = 0;
      const maxAttempts = 60;
      const pollInterval = 5000;

      while (attempts < maxAttempts) {
        attempts++;
        setLoadingMessage(`Processing image edit... Please wait. (Attempt ${attempts} of ${maxAttempts})`);

        await new Promise(resolve => setTimeout(resolve, pollInterval));

        // Check status first
        const statusResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${newRequestId}`, {
          headers: {
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        });

        if (statusResponse.status === 202) {
          continue;
        }

        if (!statusResponse.ok) {
          const errorData = await statusResponse.json().catch(() => ({ message: statusResponse.statusText }));
          throw new Error(`Failed to fetch status: ${errorData.message || statusResponse.statusText}`);
        }

        const statusData = await statusResponse.json();

        if (statusData.status === 'completed') {
          // Get the result
          const resultResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${newRequestId}/result`, {
            headers: {
              'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
            },
          });

          if (!resultResponse.ok) {
            const errorData = await resultResponse.json().catch(() => ({ message: resultResponse.statusText }));
            throw new Error(`Failed to fetch result: ${errorData.message || resultResponse.statusText}`);
          }

          const resultData = await resultResponse.json();

          if (resultData.outputs && resultData.outputs.length > 0) {
            setGeneratedImageUrl(resultData.outputs[0]);
            setLoading(false);
            setLoadingMessage('');
            return;
          }
        } else if (statusData.status === 'failed') {
          throw new Error(`Image edit failed: ${statusData.error || 'Unknown error from API.'}`);
        }
      }

      throw new Error('Image edit timed out. Please try again later.');

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unknown error occurred during image editing.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const isGenerateDisabled = images.length === 0 || loading;

  return (
    <div className="min-h-screen bg-[#020408] text-gray-100">
      <div className="container mx-auto p-4 md:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Fuckify
          </h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-8 bg-[#0f1115] border border-white/5 rounded-3xl min-h-[50vh]">
            <svg className="animate-spin h-10 w-10 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-xl font-semibold">Processing your image edit...</p>
            <p className="text-gray-400 text-center">{loadingMessage}<br/>This process can take several minutes. Please don't close this window.</p>
          </div>
        ) : (
          <>
            {!generatedImageUrl && (
              <>
                <div className="bg-[#0f1115] border border-white/5 rounded-xl p-6 md:p-8 space-y-6">
                  {/* Image Upload Section */}
                  <div>
                    <label className="block mb-3 text-sm font-medium text-gray-300 uppercase tracking-wider">
                      1. Upload Images (Max 3)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {images.map((img, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-black/40 rounded-lg overflow-hidden border-2 border-gray-700">
                            <img src={img.preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        </div>
                      ))}
                      {images.length < 3 && (
                        <div className="aspect-square">
                          <label className="flex flex-col items-center justify-center h-full bg-black/40 rounded-lg border-2 border-dashed border-gray-600 hover:border-pink-400 transition-colors cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileSelect(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />
                            <i className="fas fa-plus text-2xl text-gray-400 mb-2"></i>
                            <span className="text-sm text-gray-400">Add Image</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Prompt Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-300 uppercase tracking-wider">
                        2. Prompt (Optional)
                      </label>
                      <button
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            setPrompt(text);
                          } catch (error) {
                            console.error('Failed to paste:', error);
                          }
                        }}
                        className="bg-gray-800/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-pink-600 transition-colors border border-gray-700 flex items-center gap-2"
                      >
                        <i className="fas fa-paste"></i> Paste
                      </button>
                    </div>
                    <textarea
                      className="w-full h-32 bg-black/40 rounded-lg p-4 border border-gray-700 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors text-gray-300 placeholder-gray-500"
                      placeholder="e.g., A massive, dazzling Christmas tree in Times Square, overflowing with colorful ornaments..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4 border-t border-gray-700/50">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerateDisabled}
                      className="w-full md:w-auto px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 shadow-lg shadow-pink-500/20 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <i className="fas fa-magic text-white"></i>
                      <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Generate Edit</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full md:w-auto px-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600"
                    >
                      <i className="fas fa-redo text-white"></i>
                      <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Reset</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {generatedImageUrl && (
              <div className="bg-[#0f1115] border border-white/5 rounded-xl p-6 md:p-8 animate-in fade-in">
                <h2 className="text-2xl font-semibold tracking-wide mb-6 text-center bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Your Edited Image is Ready!
                </h2>
                <div className="flex justify-center bg-black/40 rounded-xl p-4 border border-gray-800 mb-6">
                  <img
                    src={generatedImageUrl}
                    alt="Edited result"
                    className="max-w-full max-h-[70vh] rounded-lg object-contain"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center justify-center border-t border-gray-700/50 pt-6">
                  <a
                    href={generatedImageUrl}
                    download={`fuckify_edited_${Date.now()}.png`}
                    className="text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-pink-500/30 hover:border-pink-500/50"
                  >
                    <i className="fas fa-download"></i> Download Image
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedImageUrl);
                      setSuccessMessage('Image URL copied to clipboard!');
                      setTimeout(() => setSuccessMessage(null), 2000);
                    }}
                    className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-purple-500/30 hover:border-purple-500/50"
                  >
                    <i className="fas fa-copy"></i> Copy URL
                  </button>
                </div>

                <div className="flex justify-center mt-6">
                  <button
                    onClick={handleReset}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <i className="fas fa-redo"></i> Create Another Edit
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="mt-4 w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex gap-3 items-start">
            <i className="fas fa-exclamation-triangle mt-1"></i>
            <p>{error}</p>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 w-full p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex gap-3 items-start">
            <i className="fas fa-check-circle mt-1"></i>
            <p>{successMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};
