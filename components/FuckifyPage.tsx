import React, { useState, useCallback, useEffect } from 'react';
import FuckifySidebar from './FuckifySidebar';
import { ImageMode, VideoMode } from './FuckifyModes';

interface Prediction {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  outputs: string[];
  model?: string;
  error?: string | null;
}

export const FuckifyPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('imageMode');
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isHistoryButtonPulsing, setIsHistoryButtonPulsing] = useState(false);


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
    const [hoveredMediaUrl, setHoveredMediaUrl] = useState<string | null>(null);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [hoveredMediaType, setHoveredMediaType] = useState<'image' | 'video' | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'images' | 'videos'>('images');

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
        // Filter for both image-edit and image-to-video models
        const filteredPredictions = result.data.items.filter((p: Prediction) => 
          p.model && (
            p.model.includes('alibaba/wan-2.6/image-edit') ||
            p.model.includes('wavespeed-ai/wan-2.2-spicy/image-to-video')
          )
        );
        setPredictions(filteredPredictions);
      } catch (err: any) {
        setError(err.message || "An unknown error occurred while fetching history.");
      } finally {
        setIsLoading(false);
      }
    }, []);

    useEffect(() => {
      fetchHistory();
      
      // Listen for history updates when generations complete
      const handleHistoryUpdate = () => {
        // Small delay to ensure API has indexed the new generation
        setTimeout(() => {
          fetchHistory();
        }, 2000);
      };
      
      window.addEventListener('fuckifyHistoryUpdate', handleHistoryUpdate);
      
      return () => {
        window.removeEventListener('fuckifyHistoryUpdate', handleHistoryUpdate);
      };
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
        const mediaUrl = pred.outputs[0];
        const isVideo = pred.model && pred.model.includes('image-to-video');
        const date = new Date(pred.created_at);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
        const extension = isVideo ? 'mp4' : 'png';
        const filename = `fuckify_${isVideo ? 'video' : 'image'}_${dateStr}_${timeStr}_${pred.id.slice(0, 8)}.${extension}`;

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

          if (i < selectedPredictions.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Failed to download ${isVideo ? 'video' : 'image'} ${pred.id}:`, err);
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

            {/* Tabs */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('images')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'images'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Images
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === 'videos'
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  Videos
                </button>
              </div>
            </div>

            {selectedCount > 0 && (
              <div className="px-4 py-3 border-b border-gray-800 bg-pink-500/10">
                <button
                  onClick={handleDownloadSelected}
                  className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-500 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Download {selectedCount} {selectedCount === 1 ? 'Item' : 'Items'}
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
                <p className="text-gray-500 text-center mt-8">No recent generations found.</p>
              )}
              {!isLoading && !error && predictions.length > 0 && (() => {
                // Filter predictions based on active tab
                const filteredPredictions = predictions.filter((p: Prediction) => {
                  const isVideo = p.model && p.model.includes('image-to-video');
                  if (activeTab === 'images') return !isVideo;
                  if (activeTab === 'videos') return isVideo;
                  return false;
                });

                if (filteredPredictions.length === 0) {
                  return (
                    <p className="text-gray-500 text-center mt-8">
                      No {activeTab} generations found.
                    </p>
                  );
                }

                return (
                  <div className="space-y-6">
                    {groupPredictionsByDate(filteredPredictions).map(({ date, predictions: datePredictions }) => (
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
                            onClick={() => {
                              if (pred.status === 'completed' && pred.outputs.length > 0) {
                                const isVideo = pred.model && pred.model.includes('image-to-video');
                                // For videos, we'll just close the sidebar for now
                                // VideoMode can be enhanced later to accept a selected video URL
                                if (!isVideo) {
                                  onSelectImage(pred.outputs[0]);
                                }
                              }
                            }}
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
                                
                                const isVideo = pred.model && pred.model.includes('image-to-video');
                                setHoveredMediaUrl(pred.outputs[0]);
                                setHoveredMediaType(isVideo ? 'video' : 'image');
                                setHoverPosition({ x, y });
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredMediaUrl(null);
                              setHoveredMediaType(null);
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
                              <div className="w-16 h-16 bg-black/40 rounded-lg flex items-center justify-center text-gray-600 relative overflow-hidden">
                                {pred.status === 'completed' && pred.outputs.length > 0 ? (
                                  (() => {
                                    const isVideo = pred.model && pred.model.includes('image-to-video');
                                    if (isVideo) {
                                      return (
                                        <>
                                          <video src={pred.outputs[0]} className="w-full h-full object-cover rounded-lg" muted />
                                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            <i className="fas fa-play text-white text-xl"></i>
                                          </div>
                                        </>
                                      );
                                    } else {
                                      return <img src={pred.outputs[0]} className="w-full h-full object-cover rounded-lg" alt="Generated" />;
                                    }
                                  })()
                                ) : (
                                  (() => {
                                    const isVideo = pred.model && pred.model.includes('image-to-video');
                                    return <i className={`fas ${isVideo ? 'fa-video' : 'fa-image'} text-2xl`}></i>;
                                  })()
                                )}
                              </div>
                              <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                  <p className="text-sm font-semibold text-gray-300">
                                    {pred.model && pred.model.includes('image-to-video') ? 'Video Generation' : 'Image Generation'}
                                  </p>
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
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-800 text-center text-xs text-gray-600">
              <p>Showing generations from alibaba/wan-2.6/image-edit and wavespeed-ai/wan-2.2-spicy/image-to-video models.</p>
            </div>
          </div>
        </div>
        
        {hoveredMediaUrl && hoverPosition && (
          <div 
            className="fixed z-[70] pointer-events-none animate-in fade-in duration-200"
            style={{
              left: `${hoverPosition.x}px`,
              top: `${hoverPosition.y}px`,
              width: '400px'
            }}
          >
            <div className="bg-[#0f1115] border border-pink-500/30 rounded-xl p-4 shadow-lg">
              {hoveredMediaType === 'video' ? (
                <video 
                  src={hoveredMediaUrl} 
                  className="w-full rounded-lg max-h-[400px] object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img 
                  src={hoveredMediaUrl} 
                  className="w-full rounded-lg max-h-[400px] object-contain"
                  alt="Preview"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSelectHistoryImage = (url: string) => {
    setIsHistoryVisible(false);
    // ImageMode will handle the image selection internally
  };

  const handlePulseHistoryButton = () => {
    setIsHistoryButtonPulsing(true);
    setTimeout(() => {
      setIsHistoryButtonPulsing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-pink-500/20 fixed top-0 left-24 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full">
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

      {/* Sidebar */}
      <FuckifySidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {isHistoryVisible && (
        <FuckifyHistorySidebar
          onSelectImage={handleSelectHistoryImage}
          onClose={() => setIsHistoryVisible(false)}
        />
      )}

      {/* Body Section - Adjusted for sidebar */}
      <div className="pt-20 md:ml-64">
        <div className="container mx-auto max-w-7xl px-4">
          {activeMenu === 'imageMode' && (
            <ImageMode
              onSelectHistoryImage={handleSelectHistoryImage}
              onPulseHistoryButton={handlePulseHistoryButton}
            />
          )}
          {activeMenu === 'videoMode' && (
            <VideoMode
              onSelectHistoryVideo={handleSelectHistoryImage}
              onPulseHistoryButton={handlePulseHistoryButton}
            />
          )}
        </div>
      </div>
    </div>
  );
};
