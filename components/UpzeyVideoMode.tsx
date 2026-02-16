import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Wand2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UpscaleResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputs?: string[];
  error?: string | null;
}

export const UpzeyVideoMode: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetResolution, setTargetResolution] = useState<'2k' | '4k' | '8k'>('4k');
  const [outputFormat, setOutputFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UpscaleResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Upload file to get URL
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

  // Submit upscale request
  const submitUpscaleRequest = async (videoUrl: string): Promise<string> => {
    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Wavespeed API key not found. Please set it in Settings.');
    }

    const response = await fetch('https://api.wavespeed.ai/api/v3/wavespeed-ai/ultimate-image-upscaler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        enable_base64_output: false,
        enable_sync_mode: false,
        image: videoUrl,
        output_format: outputFormat,
        target_resolution: targetResolution,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.id;
  };

  // Poll for result
  const pollForResult = async (requestId: string): Promise<UpscaleResponse> => {
    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Wavespeed API key not found. Please set it in Settings.');
    }

    const response = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.statusText}`);
    }

    return await response.json();
  };

  // Get result URL
  const getResultUrl = async (requestId: string): Promise<string> => {
    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Wavespeed API key not found. Please set it in Settings.');
    }

    const response = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get result: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.outputs && data.outputs.length > 0) {
      return data.outputs[0];
    }
    throw new Error('No output URL found in result');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoUrl(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoUrl(null);
      setResult(null);
      setError(null);
    }
  };

  const handleUpscale = async () => {
    if (!videoFile) {
      setError('Please select a video first.');
      return;
    }

    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      setError('Wavespeed API key not found. Please set it in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingMessage('Uploading video...');

    try {
      // Upload file first
      const uploadedUrl = await uploadFile(videoFile);
      setVideoUrl(uploadedUrl);
      setLoadingMessage('Submitting upscale request...');

      // Submit upscale request
      const requestId = await submitUpscaleRequest(uploadedUrl);
      setLoadingMessage('Processing video...');

      // Poll for result
      const pollResult = async () => {
        try {
          const status = await pollForResult(requestId);
          
          if (status.status === 'completed') {
            const resultUrl = await getResultUrl(requestId);
            setResult({
              ...status,
              outputs: [resultUrl],
            });
            setLoading(false);
            setLoadingMessage('');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (status.status === 'failed') {
            setError(status.error || 'Upscaling failed');
            setLoading(false);
            setLoadingMessage('');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else {
            // Continue polling
            setLoadingMessage(`Processing... (${status.status})`);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to check status');
          setLoading(false);
          setLoadingMessage('');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      };

      // Start polling every 2 seconds
      pollResult(); // Initial check
      pollIntervalRef.current = setInterval(pollResult, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to upscale video');
      setLoading(false);
      setLoadingMessage('');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  };

  const handleDownload = () => {
    if (result?.outputs && result.outputs.length > 0) {
      const link = document.createElement('a');
      link.href = result.outputs[0];
      link.download = `upzey-upscaled-${targetResolution}-${Date.now()}.${outputFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4" /> Upload Video
        </h2>
        
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors bg-gray-900/30"
        >
          {videoPreview ? (
            <div className="relative">
              <video src={videoPreview} controls className="max-h-64 mx-auto rounded-lg" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoFile(null);
                  setVideoPreview(null);
                  setVideoUrl(null);
                  setResult(null);
                }}
                className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
              >
                Remove Video
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-gray-500" />
              <p className="text-gray-400">Click or drag to upload video</p>
              <p className="text-xs text-gray-500">MP4, MOV, or WEBM</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Target Resolution</label>
            <select
              value={targetResolution}
              onChange={(e) => setTargetResolution(e.target.value as '2k' | '4k' | '8k')}
              className="w-full text-sm border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 py-2 px-3 text-white"
            >
              <option value="2k">2K</option>
              <option value="4k">4K</option>
              <option value="8k">8K</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2">Output Format</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value as 'jpeg' | 'png' | 'webp')}
              className="w-full text-sm border-gray-600 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 py-2 px-3 text-white"
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
              <option value="webp">WEBP</option>
            </select>
          </div>
        </div>
      </div>

      {/* Upscale Button */}
      <button
        onClick={handleUpscale}
        disabled={loading || !videoFile}
        className="w-full py-4 px-6 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-900/30 hover:shadow-xl hover:shadow-cyan-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {loadingMessage || 'Processing...'}
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Upscale Video
          </>
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Error</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Result Display */}
      {result && result.status === 'completed' && result.outputs && result.outputs.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Upscaled Result</h2>
          </div>
          
          <div className="mb-4">
            <video
              src={result.outputs[0]}
              controls
              className="w-full rounded-lg border border-gray-700"
            />
          </div>

          <button
            onClick={handleDownload}
            className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Download Upscaled Video
          </button>
        </div>
      )}
    </div>
  );
};
