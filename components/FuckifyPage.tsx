import React, { useState, useCallback, useEffect } from 'react';

interface ImageData {
  file?: File;
  preview: string;
  base64?: string;
  url?: string;
}

interface Prediction {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  outputs: string[];
  model?: string;
  error?: string | null;
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
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isHistoryButtonPulsing, setIsHistoryButtonPulsing] = useState(false);

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

  // Fetch balance
  const fetchBalance = useCallback(async (showLoading = true) => {
    const wavespeedApiKey = localStorage.getItem('wavespeedApiKey');
    if (!wavespeedApiKey) {
      setBalance(null);
      setBalanceError(null);
      return;
    }

    if (showLoading) {
      setIsBalanceLoading(true);
    }
    setBalanceError(null);
    try {
      const response = await fetch('https://api.wavespeed.ai/api/v3/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wavespeedApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || errorData.msg || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.code === 200 && data.data && typeof data.data.balance === 'number') {
        setBalance(data.data.balance);
      } else if (typeof data.balance === 'number') {
        setBalance(data.balance);
      } else if (data.code && data.code !== 200) {
        throw new Error(data.message || data.msg || `API error: code ${data.code}`);
      } else {
        console.error('Unexpected balance API response:', data);
        throw new Error(data.message || data.msg || "Invalid balance data received from API.");
      }
    } catch (err: any) {
      console.error('Error fetching balance:', err);
      setBalance(null);
      setBalanceError(err.message || "Failed to fetch balance.");
    } finally {
      if (showLoading) {
        setIsBalanceLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchBalance(true);
    const interval = setInterval(() => {
      fetchBalance(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  // History sidebar component
  const FuckifyHistorySidebar: React.FC<{ onSelectImage: (url: string) => void; onClose: () => void }> = ({ onSelectImage, onClose }) => {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const fetchHistory = useCallback(async () => {
      const WAVESPEED_API_KEY = localStorage.getItem('wavespeedApiKey');
      if (!WAVESPEED_API_KEY) {
        setError("Wavespeed API key not set in Settings.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://api.wavespeed.ai/api/v3/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ page: 1, page_size: 100 }),
        });
    
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(errorData.message || `Failed to fetch history with status ${response.status}`);
        }
        const result = await response.json();
        // Filter for alibaba/wan-2.6/image-edit model
        const imagePredictions = result.data.items.filter((p: Prediction) => 
          p.model && p.model.includes('alibaba/wan-2.6/image-edit')
        );
        setPredictions(imagePredictions);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred while fetching history.");
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchHistory();
    }, [fetchHistory]);

    const StatusIndicator = ({ status }: { status: string }) => {
      let colorClasses = '';
      switch (status) {
        case 'completed':
          colorClasses = 'bg-green-500/20 text-green-400 border-green-500/30';
          break;
        case 'processing':
          colorClasses = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
          break;
        case 'failed':
          colorClasses = 'bg-red-500/20 text-red-400 border-red-500/30';
          break;
        default:
          colorClasses = 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      }
      return <span className={`px-2 py-1 text-xs font-semibold rounded-md border ${colorClasses} capitalize`}>{status}</span>;
    };

    const groupPredictionsByDate = (predictions: Prediction[]) => {
      const grouped: { [key: string]: Prediction[] } = {};
      
      predictions.forEach(pred => {
        const date = new Date(pred.created_at);
        const dateKey = date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(pred);
      });

      return Object.keys(grouped)
        .sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateB.getTime() - dateA.getTime();
        })
        .map(dateKey => ({
          date: dateKey,
          predictions: grouped[dateKey].sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
        }));
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    };

    const toggleSelection = (predictionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(predictionId)) {
          newSet.delete(predictionId);
        } else {
          newSet.add(predictionId);
        }
        return newSet;
      });
    };

    const handleDownloadSelected = async () => {
      const selectedPredictions = predictions.filter(p => 
        selectedIds.has(p.id) && 
        p.status === 'completed' && 
        p.outputs && 
        p.outputs.length > 0
      );

      if (selectedPredictions.length === 0) {
        return;
      }

      for (let i = 0; i < selectedPredictions.length; i++) {
        const pred = selectedPredictions[i];
        const imageUrl = pred.outputs[0];
        const date = new Date(pred.created_at);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        const filename = `fuckify_image_${dateStr}_${timeStr}_${pred.id.slice(0, 8)}.png`;

        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          if (i < selectedPredictions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Failed to download image ${pred.id}:`, err);
        }
      }

      setSelectedIds(new Set());
    };

    const selectedCount = selectedIds.size;

    return (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
        onClick={handleBackdropClick}
      >
        <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-gray-900/50 backdrop-blur-lg animate-in slide-in-from-right-full duration-300 z-[60]" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col h-full bg-[#0f1115] border-l border-pink-500/20">
            <div className="flex flex-col border-b border-gray-800">
              <div className="flex items-center justify-between p-4">
                <h2 className="text-xl font-semibold">Generation History</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => fetchHistory()} 
                    disabled={isLoading}
                    className={`text-gray-500 hover:text-pink-400 transition-colors p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Refresh History"
                  >
                    <i className={`fas fa-sync-alt text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
                  </button>
                  <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
            </div>

            {selectedCount > 0 && (
              <div className="px-4 py-3 border-b border-gray-800 bg-pink-500/10">
                <button
                  onClick={handleDownloadSelected}
                  className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Download {selectedCount} {selectedCount === 1 ? 'Image' : 'Images'}
                </button>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-4">
              {isLoading && (
                <div className="flex items-center justify-center h-full">
                  <svg className="animate-spin h-8 w-8 text-pink-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
              )}
              {error && <p className="text-red-400 text-center p-4 bg-red-500/10 rounded-lg">{error}</p>}
              {!isLoading && !error && predictions.length === 0 && (
                <p className="text-gray-500 text-center mt-8">No recent image generations found.</p>
              )}
              {!isLoading && !error && predictions.length > 0 && (
                <div className="space-y-6">
                  {groupPredictionsByDate(predictions).map(({ date, predictions: datePredictions }) => (
                    <div key={date} className="space-y-3">
                      <div className="flex items-center gap-3 py-2">
                        <div className="flex-grow border-t border-pink-500/30"></div>
                        <span className="text-xs font-semibold text-pink-400 uppercase tracking-wider px-3">
                          {date}
                        </span>
                        <div className="flex-grow border-t border-pink-500/30"></div>
                      </div>
                      
                      <ul className="space-y-3">
                        {datePredictions.map(pred => (
                          <li
                            key={pred.id}
                            onClick={() => pred.status === 'completed' && pred.outputs.length > 0 && onSelectImage(pred.outputs[0])}
                            onMouseEnter={(e) => {
                              if (pred.status === 'completed' && pred.outputs.length > 0) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const popupWidth = 400;
                                const popupHeight = 400;
                                const spacing = 20;
                                
                                let x = rect.left - popupWidth - spacing;
                                let y = rect.top;
                                
                                if (x < 20) x = 20;
                                if (y + popupHeight > window.innerHeight - 20) {
                                  y = window.innerHeight - popupHeight - 20;
                                }
                                if (y < 20) y = 20;
                                
                                setHoveredImageUrl(pred.outputs[0]);
                                setHoverPosition({ x, y });
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredImageUrl(null);
                              setHoverPosition(null);
                            }}
                            className={`bg-[#0f1115] border border-white/5 p-3 rounded-xl transition-all relative ${
                              pred.status === 'completed' 
                                ? `cursor-pointer hover:border-pink-500 ${selectedIds.has(pred.id) ? 'border-pink-500 bg-pink-500/10' : ''}` 
                                : 'cursor-default'
                            }`}
                          >
                            {pred.status === 'completed' && pred.outputs.length > 0 && (
                              <div 
                                className="absolute top-2 left-2 z-10"
                                onClick={(e) => toggleSelection(pred.id, e)}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  selectedIds.has(pred.id)
                                    ? 'bg-pink-600 border-pink-600'
                                    : 'bg-gray-800/80 border-gray-600 hover:border-pink-500'
                                }`}>
                                  {selectedIds.has(pred.id) && (
                                    <i className="fas fa-check text-white text-xs"></i>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center text-gray-600">
                                {pred.status === 'completed' && pred.outputs.length > 0 ? (
                                  <img src={pred.outputs[0]} className="w-full h-full object-cover rounded-lg" alt="Generated" />
                                ) : (
                                  <i className="fas fa-image text-2xl"></i>
                                )}
                              </div>
                              <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-semibold text-gray-300">Image Generation</p>
                                  <StatusIndicator status={pred.status} />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(pred.created_at).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-600">
              <p>Showing image generations from alibaba/wan-2.6/image-edit.</p>
            </div>
          </div>
        </div>
        
        {hoveredImageUrl && hoverPosition && (
          <div 
            className="fixed z-[70] pointer-events-none animate-in fade-in duration-200"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
              width: '400px'
            }}
          >
            <div className="bg-[#0f1115] border border-pink-500/30 rounded-xl p-4 shadow-lg">
              <img 
                src={hoveredImageUrl} 
                className="w-full rounded-lg max-h-[400px] object-contain"
                alt="Preview"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSelectHistoryImage = (url: string) => {
    setGeneratedImageUrl(url);
    setIsHistoryVisible(false);
  };

  const handlePulseHistoryButton = () => {
    setIsHistoryButtonPulsing(true);
    setTimeout(() => {
      setIsHistoryButtonPulsing(false);
    }, 2000);
  };

  // Pulse history button when generation completes
  useEffect(() => {
    if (generatedImageUrl && !loading) {
      handlePulseHistoryButton();
    }
  }, [generatedImageUrl, loading]);

  const isGenerateDisabled = images.length === 0 || loading;

  return (
    <div className="min-h-screen bg-[#020408] text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-[#020408]/90 backdrop-blur-sm border-b border-pink-500/20 fixed top-0 left-24 right-0 z-40">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Fuckify
            </h1>
            <div className="p-2 rounded-full text-gray-400 bg-gray-800/50 flex items-center text-sm h-9 px-3">
              <i className="fas fa-wallet mr-2 text-pink-400"></i>
              {isBalanceLoading ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              ) : balanceError ? (
                <span className="text-red-400" title={balanceError}>Error</span>
              ) : balance !== null ? (
                <span className="font-semibold text-white">${balance.toFixed(2)}</span>
              ) : (
                <span className="text-gray-500">N/A</span>
              )}
            </div>
            <button 
              onClick={() => setIsHistoryVisible(true)} 
              className={`p-2 rounded-lg transition-colors relative flex items-center gap-2 ${
                isHistoryButtonPulsing 
                  ? 'text-pink-400 bg-pink-500/20 pulse-highlight' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-800 bg-gray-800/50'
              }`}
              title="Generation History"
            >
              <i className="fas fa-history text-base"></i>
              <span className="text-xs font-medium hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>

      {isHistoryVisible && (
        <FuckifyHistorySidebar
          onSelectImage={handleSelectHistoryImage}
          onClose={() => setIsHistoryVisible(false)}
        />
      )}

      <div className="container mx-auto p-4 md:p-8 max-w-6xl pt-24">
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
                      className="w-full md:w-auto px-8 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg shadow-pink-500/20 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      <i className="fas fa-magic text-white"></i>
                      <span className="text-white">Generate Edit</span>
                    </button>
                    <button
                      onClick={handleReset}
                      className="w-full md:w-auto px-6 py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white"
                    >
                      <i className="fas fa-redo"></i>
                      Reset
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
