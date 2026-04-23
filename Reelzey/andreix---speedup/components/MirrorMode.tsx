
import React, { useState, useCallback, useEffect } from 'react';
import { FileData } from '../types';
import FileUpload from './FileUpload';

interface MirrorModeProps {
  onOpenSettings?: () => void;
  onPulseHistoryButton?: () => void;
  selectedHistoryVideoUrl?: string | null;
  clearSelectedHistoryVideoUrl?: () => void;
}

const MirrorMode: React.FC<MirrorModeProps> = ({ onOpenSettings, onPulseHistoryButton, selectedHistoryVideoUrl, clearSelectedHistoryVideoUrl }) => {
  const [imageData, setImageData] = useState<FileData | null>(null);
  const [videoData, setVideoData] = useState<FileData | null>(null);
  // Character orientation is always 'video' - no longer user-configurable
  const characterOrientation: 'video' | 'image' = 'video';
  const [keepOriginalSound, setKeepOriginalSound] = useState(true);
  const [requestId, setRequestId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isFromHistory, setIsFromHistory] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  // Check for API key on mount and when it might change
  useEffect(() => {
    const checkApiKey = () => {
      const apiKey = localStorage.getItem('wavespeedApiKey');
      setHasApiKey(!!apiKey && apiKey.trim() !== '');
    };
    
    checkApiKey();
    
    // Listen for storage changes (in case settings are updated in another tab/window)
    window.addEventListener('storage', checkApiKey);
    
    // Also check periodically in case settings modal updates localStorage in same window
    const interval = setInterval(checkApiKey, 1000);
    
    return () => {
      window.removeEventListener('storage', checkApiKey);
      clearInterval(interval);
    };
  }, []);

  // Handle video selection from history
  useEffect(() => {
    if (selectedHistoryVideoUrl) {
      handleReset();
      setGeneratedVideoUrl(selectedHistoryVideoUrl);
      setIsFromHistory(true);
      if (clearSelectedHistoryVideoUrl) {
        clearSelectedHistoryVideoUrl();
      }
    }
  }, [selectedHistoryVideoUrl, clearSelectedHistoryVideoUrl]);

  const uploadFile = async (file: File): Promise<string> => {
    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Wavespeed API key not found. Please set it in Settings.');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('https://api.wavespeed.ai/api/v3/media/upload/binary', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 200 && data.data?.download_url) {
      return data.data.download_url;
    }
    throw new Error('Failed to get upload URL from response');
  };

  const handleImageSelect = useCallback(async (file: File) => {
    setError(null);
    setGeneratedVideoUrl(null);
    setImageData({ file, preview: URL.createObjectURL(file), base64: '' });
  }, []);

  const handleVideoSelect = useCallback(async (file: File) => {
    setError(null);
    setGeneratedVideoUrl(null);
    setVideoData({ file, preview: URL.createObjectURL(file), base64: '' });
  }, []);

  const handleSubmitTask = async () => {
    if (!imageData && !videoData) {
      setError("Please provide an image or video.");
      return;
    }

    const WAVESPEED_API_KEY = localStorage.getItem('wavespeedApiKey');
    if (!WAVESPEED_API_KEY || WAVESPEED_API_KEY.trim() === '') {
      setError("Wavespeed API key is not configured. Please add it in the Settings menu.");
      setHasApiKey(false);
      return;
    }

    setHasApiKey(true);
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setGeneratedVideoUrl(null);
    setLoadingMessage("Uploading files...");

    try {
      // Upload image and video to get hosted URLs (same pattern as Nova)
      let imageUrl = '';
      let videoUrl = '';

      if (imageData?.file) {
        setLoadingMessage("Uploading image...");
        imageUrl = await uploadFile(imageData.file);
      }
      if (videoData?.file) {
        setLoadingMessage("Uploading video...");
        videoUrl = await uploadFile(videoData.file);
      }

      setLoadingMessage("Submitting task...");

      const requestBody: any = {
        character_orientation: characterOrientation,
        image: imageUrl,
        keep_original_sound: keepOriginalSound,
        video: videoUrl
      };

      const postResponse = await fetch('https://api.wavespeed.ai/api/v3/kwaivgi/kling-v2.6-std/motion-control', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${WAVESPEED_API_KEY.trim()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.json().catch(() => ({ message: postResponse.statusText }));
        throw new Error(errorData.message || `API request failed with status ${postResponse.status}`);
      }

      const prediction = await postResponse.json();
      const newRequestId = prediction.data?.id || prediction.id || prediction.requestId;

      if (!newRequestId) {
        setLoading(false);
        setLoadingMessage('');
        setSuccessMessage("Your video is now processing and placed in the Generation History Section");
        if (onPulseHistoryButton) onPulseHistoryButton();
        return;
      }

      setRequestId(newRequestId);

      const pollResult = async () => {
        const resultResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${newRequestId}/result`, {
          headers: { "Authorization": `Bearer ${WAVESPEED_API_KEY.trim()}` }
        });

        if (!resultResponse.ok) {
          throw new Error(`Failed to check status: ${resultResponse.statusText}`);
        }

        const resultData = await resultResponse.json();
        const predData = resultData.data || resultData;
        const status = predData.status;

        if (status === 'completed') {
          const outputs = predData.outputs;
          if (outputs && outputs.length > 0) {
            setGeneratedVideoUrl(outputs[0]);
            setIsFromHistory(false);
            setLoading(false);
            setLoadingMessage('');
            if (onPulseHistoryButton) onPulseHistoryButton();
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          }
        } else if (status === 'failed') {
          const errMsg = predData.error || 'Unknown error from API.';
          throw new Error(`Video generation failed: ${errMsg}`);
        }
      };

      const pollRef = { current: null as ReturnType<typeof setInterval> | null };
      let attempts = 0;
      const maxAttempts = 60;

      const runPoll = async () => {
        attempts++;
        setLoadingMessage(`Generating video... (${attempts}/${maxAttempts})`);
        try {
          await pollResult();
        } catch (err: any) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          setLoading(false);
          setLoadingMessage('');
          setError(err.message || "Failed to submit task. Please try again.");
        }
        if (attempts >= maxAttempts && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setLoading(false);
          setLoadingMessage('');
          setError("Video generation timed out. Please try again later.");
        }
      };

      await runPoll();
      pollRef.current = setInterval(runPoll, 5000);

    } catch (err: any) {
      setError(err.message || "Failed to submit task. Please try again.");
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleReset = () => {
    setImageData(null);
    setVideoData(null);
    // characterOrientation is always 'video'
    setKeepOriginalSound(true);
    setRequestId('');
    setLoading(false);
    setLoadingMessage('');
    setError(null);
    setSuccessMessage(null);
    setGeneratedVideoUrl(null);
    setIsFromHistory(false);
  };

  return (
    <div className="px-4 md:px-8 pb-8 max-w-4xl mx-auto">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 p-8 glass rounded-3xl min-h-[50vh]">
          <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl font-semibold">Generating your video...</p>
          <p className="text-gray-400 text-center">{loadingMessage}<br/>This process can take several minutes. Please don't close this window.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* Generated Preview Card - Only shows when video is selected from history */}
          {generatedVideoUrl && isFromHistory && (
            <section className="glass p-6 rounded-3xl animate-in fade-in">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
                <i className="fas fa-play-circle text-purple-400"></i>
                Generated Preview
              </h2>
              <div className="flex justify-center bg-black/40 rounded-xl p-2 border border-gray-800">
                <video 
                  src={generatedVideoUrl} 
                  controls 
                  key={generatedVideoUrl} 
                  className="w-full max-w-full max-h-[70vh] rounded-lg object-contain" 
                />
              </div>
              
              <div className="mt-6 flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-center border-t border-gray-700/50 pt-6">
                <a href={generatedVideoUrl} download={`mirror_mode_preview.mp4`} className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-purple-500/30 hover:border-purple-500/50">
                  <i className="fas fa-download"></i> Download Video
                </a>
              </div>
              
              <div className="flex justify-center mt-6">
                <button onClick={handleReset} className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                  <i className="fas fa-times"></i> Close Preview
                </button>
              </div>
            </section>
          )}

          {!generatedVideoUrl && (
            <>

              {/* Submit Task Section */}
              <section className="glass p-6 rounded-3xl">
          <div className="flex flex-col gap-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-300">Image</label>
              <FileUpload
                label=""
                accept="image/*"
                icon="fas fa-image"
                onFileSelect={handleImageSelect}
                preview={imageData?.preview || null}
                type="image"
                showPasteButton={false}
              />
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-gray-300">Video</label>
              <FileUpload
                label=""
                accept="video/*"
                icon="fas fa-video"
                onFileSelect={handleVideoSelect}
                preview={videoData?.preview || null}
                type="video"
                showPasteButton={false}
              />
            </div>

            {/* Keep Original Sound */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="keepSound"
                checked={keepOriginalSound}
                onChange={(e) => setKeepOriginalSound(e.target.checked)}
                className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="keepSound" className="text-gray-300 font-semibold cursor-pointer">
                Keep Original Sound
              </label>
            </div>

            {/* Submit and Reset Buttons */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
              <button
                onClick={handleSubmitTask}
                disabled={loading || (!imageData && !videoData)}
                className="w-full md:w-auto px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/30 neon-glow neon-glow-hover active:scale-[0.98] disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:neon-glow-0"
              >
                {loading && loadingMessage ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loadingMessage}
                  </>
                ) : (
                  'Generate'
                )}
              </button>
              <button
                onClick={handleReset}
                className="w-full md:w-auto px-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white active:scale-[0.98]"
              >
                <i className="fas fa-redo"></i> Reset
              </button>
            </div>

          </div>
        </section>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex gap-3 items-start">
            <i className="fas fa-exclamation-triangle mt-1"></i>
            <p>{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex gap-3 items-start">
            <i className="fas fa-check-circle mt-1"></i>
            <p>{successMessage}</p>
          </div>
        )}
            </>
          )}

          {generatedVideoUrl && !isFromHistory && (
            <section className="animate-in fade-in">
              <h2 className="text-2xl font-semibold tracking-wide mb-4 text-center">Your Video is Ready!</h2>
              <div className="glass p-6 rounded-3xl">
                <div className="flex justify-center bg-black/40 rounded-xl p-2 border border-gray-800">
                  <video 
                    src={generatedVideoUrl} 
                    controls 
                    key={generatedVideoUrl} 
                    className="w-full max-w-full max-h-[70vh] rounded-lg object-contain" 
                  />
                </div>
                
                <div className="mt-6 flex flex-col md:flex-row gap-4 md:gap-6 items-center justify-center border-t border-gray-700/50 pt-6">
                  <a href={generatedVideoUrl} download={`mirror_mode_video.mp4`} className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-purple-500/30 hover:border-purple-500/50">
                    <i className="fas fa-download"></i> Download Video
                  </a>
                </div>
                
                <div className="flex justify-center mt-6">
                  <button onClick={handleReset} className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                    <i className="fas fa-redo"></i> Create Another Video
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default MirrorMode;

