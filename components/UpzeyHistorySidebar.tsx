import React, { useState, useEffect, useCallback } from 'react';

interface Prediction {
  id: string;
  model: string;
  status: string;
  outputs?: string[];
  created_at: string;
  input?: {
    image?: string;
    target_resolution?: string;
    output_format?: string;
  };
}

interface UpzeyHistorySidebarProps {
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

export const UpzeyHistorySidebar: React.FC<UpzeyHistorySidebarProps> = ({ onSelectImage, onClose }) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      // Filter for image upscaler predictions
      const imagePredictions = result.data.items.filter((p: Prediction) =>
        p.model && p.model.includes('ultimate-image-upscaler')
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
      onSelectImage(prediction.outputs[0]);
    }
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

  const selectedCount = selectedIds.size;

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

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading && predictions.length === 0 ? (
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
                <i className="fas fa-image text-4xl mb-4"></i>
                <p className="text-sm">No generation history found</p>
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
                          onClick={() => handleSelect(prediction)}
                          className={`relative bg-gray-800/50 rounded-lg overflow-hidden border cursor-pointer transition-all hover:border-cyan-500/50 ${
                            prediction.status === 'completed' ? 'border-gray-700' : 'border-gray-800'
                          }`}
                        >
                          {prediction.outputs && prediction.outputs.length > 0 && prediction.status === 'completed' ? (
                            <div className="relative">
                              <img
                                src={prediction.outputs[0]}
                                alt="Upscaled result"
                                className="w-full h-auto object-contain max-h-48 bg-gray-900"
                              />
                              <div className="absolute top-2 right-2">
                                <StatusIndicator status={prediction.status} />
                              </div>
                              {prediction.input?.target_resolution && (
                                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase">
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
          </div>
        </div>
      </div>
    </div>
  );
};
