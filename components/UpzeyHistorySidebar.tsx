import React, { useState, useEffect, useCallback } from 'react';

interface Prediction {
  id: string;
  model: string;
  status: string;
  outputs?: string[];
  created_at: string;
  input?: {
    image?: string;
    video?: string;
    target_resolution?: string;
    output_format?: string;
  };
}

interface UpzeyHistorySidebarProps {
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

export const UpzeyHistorySidebar: React.FC<UpzeyHistorySidebarProps> = ({ onSelectImage, onClose }) => {
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewPrediction, setPreviewPrediction] = useState<Prediction | null>(null);

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
      // Get all upscaler predictions (both image and video)
      const upscalerPredictions = result.data.items.filter((p: Prediction) =>
        p.model && (p.model.includes('ultimate-image-upscaler') || p.model.includes('ultimate-video-upscaler'))
      );
      setAllPredictions(upscalerPredictions);
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

    // Sort dates in descending order (newest first)
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelect = (prediction: Prediction) => {
    if (prediction.outputs && prediction.outputs.length > 0 && prediction.status === 'completed') {
      setPreviewPrediction(prediction);
    }
  };

  const handleBack = () => {
    setPreviewPrediction(null);
  };

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
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

    // Download each item
    for (let i = 0; i < selectedPredictions.length; i++) {
      const pred = selectedPredictions[i];
      const mediaUrl = pred.outputs[0];
      const date = new Date(pred.created_at);
      const dateStr = date.toISOString().split('T')[0];
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
      
      // Determine file extension based on active tab and output format
      let extension = activeTab === 'image' ? 'png' : 'mp4';
      if (pred.input?.output_format) {
        extension = pred.input.output_format;
      } else if (activeTab === 'image') {
        extension = 'png';
      }
      
      const filename = `upzey_${activeTab}_${dateStr}_${timeStr}_${pred.id.slice(0, 8)}.${extension}`;

      try {
        const response = await fetch(mediaUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Small delay between downloads to prevent browser blocking
        if (i < selectedPredictions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`Failed to download ${activeTab} ${pred.id}:`, err);
      }
    }

    // Clear selection after download
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;

  // Filter predictions based on active tab
  const predictions = allPredictions.filter((p: Prediction) => {
    if (activeTab === 'image') {
      return p.model && p.model.includes('ultimate-image-upscaler');
    } else {
      return p.model && p.model.includes('ultimate-video-upscaler');
    }
  });

  const groupedPredictions = groupPredictionsByDate(predictions);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div className="fixed top-0 right-0 h-full w-full md:w-96 bg-gray-900/50 backdrop-blur-lg animate-in slide-in-from-right-full duration-300 z-[60]" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full glass border-l border-cyan-500/20">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-xl font-semibold">Generation History</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchHistory}
                disabled={isLoading}
                className={`text-gray-500 hover:text-cyan-400 transition-colors p-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${isLoading ? 'animate-spin' : ''}`}
                title="Refresh History"
              >
                <i className="fas fa-sync-alt text-lg"></i>
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setActiveTab('image')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'image'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <i className="fas fa-image mr-2"></i>
              Image
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === 'video'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <i className="fas fa-video mr-2"></i>
              Video
            </button>
          </div>

          {/* Download Button - Shows when items are selected */}
          {selectedCount > 0 && (
            <div className="px-4 py-3 border-b border-gray-800 bg-cyan-500/10">
              <button
                onClick={handleDownloadSelected}
                className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <i className="fas fa-download"></i>
                Download {selectedCount} {selectedCount === 1 ? (activeTab === 'image' ? 'Image' : 'Video') : (activeTab === 'image' ? 'Images' : 'Videos')}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {previewPrediction ? (
              // Preview View
              <div className="flex flex-col h-full">
                <button
                  onClick={handleBack}
                  className="mb-4 flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm font-medium"
                >
                  <i className="fas fa-arrow-left"></i>
                  Back
                </button>
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-800/30 rounded-xl p-6 border border-gray-700">
                  {previewPrediction.outputs && previewPrediction.outputs.length > 0 ? (
                    <>
                      {activeTab === 'image' ? (
                        <img
                          src={previewPrediction.outputs[0]}
                          alt="Upscaled result"
                          className="max-w-full max-h-[calc(100vh-12rem)] object-contain rounded-lg"
                        />
                      ) : (
                        <video
                          src={previewPrediction.outputs[0]}
                          controls
                          className="max-w-full max-h-[calc(100vh-12rem)] rounded-lg"
                        />
                      )}
                      <div className="mt-4 w-full space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Status:</span>
                          <StatusIndicator status={previewPrediction.status} />
                        </div>
                        {previewPrediction.input?.target_resolution && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Resolution:</span>
                            <span className="text-gray-300 uppercase">{previewPrediction.input.target_resolution}</span>
                          </div>
                        )}
                        {previewPrediction.input?.output_format && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Format:</span>
                            <span className="text-gray-300 uppercase">{previewPrediction.input.output_format}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Created:</span>
                          <span className="text-gray-300">
                            {new Date(previewPrediction.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="text-sm">No preview available</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // List View
              <>
                {isLoading && allPredictions.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <svg className="animate-spin h-8 w-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                ) : groupedPredictions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <i className={`fas ${activeTab === 'image' ? 'fa-image' : 'fa-video'} text-4xl mb-4`}></i>
                    <p className="text-sm">No {activeTab} generation history found</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupedPredictions.map(({ date, predictions: datePredictions }) => (
                      <div key={date}>
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{date}</h3>
                        <div className="space-y-3">
                          {datePredictions.map((prediction) => (
                            <div
                              key={prediction.id}
                              onClick={() => prediction.status === 'completed' && prediction.outputs && prediction.outputs.length > 0 && handleSelect(prediction)}
                              className={`relative bg-gray-800/50 rounded-lg overflow-hidden border transition-all ${
                                prediction.status === 'completed' && prediction.outputs && prediction.outputs.length > 0
                                  ? `cursor-pointer hover:border-cyan-500/50 ${selectedIds.has(prediction.id) ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700'}`
                                  : 'border-gray-800 cursor-default'
                              }`}
                            >
                              {/* Checkbox for selection */}
                              {prediction.status === 'completed' && prediction.outputs && prediction.outputs.length > 0 && (
                                <div
                                  className="absolute top-2 left-2 z-10"
                                  onClick={(e) => handleToggleSelect(e, prediction.id)}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    selectedIds.has(prediction.id)
                                      ? 'bg-cyan-600 border-cyan-600'
                                      : 'bg-gray-800/80 border-gray-600 hover:border-cyan-500'
                                  }`}>
                                    {selectedIds.has(prediction.id) && (
                                      <i className="fas fa-check text-white text-xs"></i>
                                    )}
                                  </div>
                                </div>
                              )}
                              {prediction.outputs && prediction.outputs.length > 0 && prediction.status === 'completed' ? (
                                <div className="relative">
                                  {activeTab === 'image' ? (
                                    <img
                                      src={prediction.outputs[0]}
                                      alt="Upscaled result"
                                      className="w-full h-auto object-contain max-h-48 bg-gray-900"
                                    />
                                  ) : (
                                    <video
                                      src={prediction.outputs[0]}
                                      className="w-full h-auto object-contain max-h-48 bg-gray-900"
                                      controls
                                      muted
                                    />
                                  )}
                                  <div className="absolute top-2 right-2">
                                    <StatusIndicator status={prediction.status} />
                                  </div>
                                  {prediction.input?.target_resolution && (
                                    <div className="absolute top-2 left-10 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase">
                                      {prediction.input.target_resolution}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="p-8 flex flex-col items-center justify-center bg-gray-900/50">
                                  <StatusIndicator status={prediction.status} />
                                  {prediction.status === 'processing' && (
                                    <svg className="animate-spin h-6 w-6 text-cyan-400 mt-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  )}
                                </div>
                              )}
                              <div className="p-3">
                                <div className="flex items-center justify-between text-xs text-gray-400">
                                  <span>{new Date(prediction.created_at).toLocaleTimeString()}</span>
                                  {prediction.input?.output_format && (
                                    <span className="uppercase">{prediction.input.output_format}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
