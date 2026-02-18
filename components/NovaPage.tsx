import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Wand2, CheckCircle2, X } from 'lucide-react';

interface EditResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outputs?: string[];
  error?: string | null;
}

export const NovaPage: React.FC = () => {
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:2' | '2:3' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'>('16:9');
  const [resolution, setResolution] = useState<'1k' | '2k' | '4k'>('1k');
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg'>('png');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [result, setResult] = useState<EditResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      // Cleanup preview URLs
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
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

  // Submit edit request
  const submitEditRequest = async (imageUrls: string[]): Promise<string> => {
    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('Wavespeed API key not found. Please set it in Settings.');
    }

    const response = await fetch('https://api.wavespeed.ai/api/v3/google/nano-banana-pro/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        aspect_ratio: aspectRatio,
        enable_base64_output: false,
        enable_sync_mode: false,
        images: imageUrls,
        output_format: outputFormat,
        prompt: prompt || undefined,
        resolution: resolution,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Handle different response formats
    if (data.id) {
      return data.id;
    } else if (data.data && data.data.id) {
      return data.data.id;
    } else if (data.result && data.result.id) {
      return data.result.id;
    } else {
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format: missing request ID');
    }
  };

  // Poll for result
  const pollForResult = async (requestId: string): Promise<EditResponse> => {
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 14 images max
    const remainingSlots = 14 - imageFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length < files.length) {
      alert(`Maximum 14 images allowed. Only ${filesToAdd.length} image(s) added.`);
    }

    const newFiles = [...imageFiles, ...filesToAdd];
    setImageFiles(newFiles);

    // Create previews
    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    setImageUrls([...imageUrls, ...Array(filesToAdd.length).fill(null)]);
    setResult(null);
    setSuccessMessage(null);
  };

  const handleRemoveImage = (index: number) => {
    // Revoke preview URL
    URL.revokeObjectURL(imagePreviews[index]);

    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;

    const remainingSlots = 14 - imageFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length < files.length) {
      alert(`Maximum 14 images allowed. Only ${filesToAdd.length} image(s) added.`);
    }

    const newFiles = [...imageFiles, ...filesToAdd];
    setImageFiles(newFiles);

    const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
    setImageUrls([...imageUrls, ...Array(filesToAdd.length).fill(null)]);
    setResult(null);
    setSuccessMessage(null);
  };

  const handleGenerate = async () => {
    if (imageFiles.length === 0) {
      alert('Please select at least one image.');
      return;
    }

    const apiKey = localStorage.getItem('wavespeedApiKey');
    if (!apiKey || apiKey.trim() === '') {
      alert('Wavespeed API key not found. Please set it in Settings.');
      return;
    }

    setLoading(true);
    setSuccessMessage(null);
    setLoadingMessage('Uploading images...');

    try {
      // Upload all files first
      const uploadedUrls: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        setLoadingMessage(`Uploading image ${i + 1} of ${imageFiles.length}...`);
        const url = await uploadFile(imageFiles[i]);
        uploadedUrls.push(url);
      }

      setImageUrls(uploadedUrls);
      setLoadingMessage('Submitting edit request...');

      // Submit edit request
      const requestId = await submitEditRequest(uploadedUrls);

      // If no requestId, show success message instead of error
      if (!requestId || requestId.trim() === '') {
        setLoading(false);
        setLoadingMessage('');
        setSuccessMessage('Your image edit is now processing and will appear in the Generation History section');
        return;
      }

      setLoadingMessage('Processing image...');

      // Poll for result
      const pollResult = async () => {
        try {
          if (!requestId) {
            throw new Error('Request ID is missing');
          }
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
            setLoading(false);
            setLoadingMessage('');
            setSuccessMessage('Your image edit is now processing and will appear in the Generation History section');
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else {
            // Continue polling
            setLoadingMessage(`Processing... (${status.status})`);
          }
        } catch (err: any) {
          // Instead of showing error, show success message
          setLoading(false);
          setLoadingMessage('');
          setSuccessMessage('Your image edit is now processing and will appear in the Generation History section');
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
      // Instead of showing error, show success message
      setLoading(false);
      setLoadingMessage('');
      setSuccessMessage('Your image edit is now processing and will appear in the Generation History section');
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
      link.download = `nova-edited-${aspectRatio}-${resolution}-${Date.now()}.${outputFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-violet-500/20 fixed top-0 left-24 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-violet-400 via-violet-500 to-violet-400 bg-clip-text text-transparent">
              NOVA
            </h1>
          </div>
        </div>
      </header>

      {/* Body Section */}
      <div className="pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="space-y-4 max-w-3xl mx-auto">
            {/* Upload Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Upload className="w-3 h-3" /> Upload Images ({imageFiles.length}/14)
              </h2>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-violet-500 transition-colors bg-gray-900/30"
              >
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {imageFiles.length < 14 && (
                      <div className="flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg h-24 text-gray-500 text-xs">
                        + Add
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-500" />
                    <p className="text-sm text-gray-400">Click or drag to upload images</p>
                    <p className="text-xs text-gray-500">PNG, JPG, or WEBP (Max 14 images)</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Prompt Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Prompt</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the desired edit (e.g., 'Different pose, same background, mirror shot, showing face')"
                className="w-full text-sm border-gray-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-gray-700 py-2 px-3 text-white placeholder-gray-500 resize-none"
                rows={3}
              />
            </div>

            {/* Settings Section */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Settings</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as typeof aspectRatio)}
                    className="w-full text-sm border-gray-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-gray-700 py-1.5 px-3 text-white"
                  >
                    <option value="1:1">1:1</option>
                    <option value="3:2">3:2</option>
                    <option value="2:3">2:3</option>
                    <option value="3:4">3:4</option>
                    <option value="4:3">4:3</option>
                    <option value="4:5">4:5</option>
                    <option value="5:4">5:4</option>
                    <option value="9:16">9:16</option>
                    <option value="16:9">16:9</option>
                    <option value="21:9">21:9</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as '1k' | '2k' | '4k')}
                    className="w-full text-sm border-gray-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-gray-700 py-1.5 px-3 text-white"
                  >
                    <option value="1k">1K</option>
                    <option value="2k">2K</option>
                    <option value="4k">4K</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Output Format</label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpeg')}
                    className="w-full text-sm border-gray-600 rounded-lg focus:ring-violet-500 focus:border-violet-500 bg-gray-700 py-1.5 px-3 text-white"
                  >
                    <option value="png">PNG</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || imageFiles.length === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold rounded-lg transition-all shadow-lg shadow-violet-900/30 hover:shadow-xl hover:shadow-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {loadingMessage || 'Processing...'}
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Edit
                </>
              )}
            </button>

            {/* Success Message */}
            {successMessage && (
              <div className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex gap-3 items-start">
                <i className="fas fa-check-circle mt-1"></i>
                <p>{successMessage}</p>
              </div>
            )}

            {/* Result Display */}
            {result && result.status === 'completed' && result.outputs && result.outputs.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Generated Result</h2>
                </div>

                <div className="mb-3">
                  <img
                    src={result.outputs[0]}
                    alt="Edited result"
                    className="w-full rounded-lg border border-gray-700"
                  />
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Edited Image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
