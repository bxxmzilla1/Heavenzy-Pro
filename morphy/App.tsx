import React, { useState, useCallback, useEffect } from 'react';
import ImageUploader from './components/ImageUploader';
import PromptSelector from './components/PromptSelector';
import { geminiService } from './services/geminiService';
import { TransformationResult } from './types';
import HistorySidebar from './components/HistorySidebar';

const App: React.FC = () => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState(false);
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TransformationResult[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('generationHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage:", e);
      // If parsing fails, clear the corrupted data
      localStorage.removeItem('generationHistory');
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('generationHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage:", e);
    }
  }, [history]);

  // FIX: Wrapped handler in `useCallback` and improved error handling to resolve potential scope issues and provide more robust error handling.
  const handleTransform = useCallback(async () => {
    if (!sourceImage || !prompt) {
      setError("Please upload an image and specify a character description.");
      return;
    }

    setIsTransforming(true);
    setError(null);
    
    try {
      const resultImageUrl = await geminiService.transformFace(sourceImage, prompt);
      const newResult: TransformationResult = {
        id: Date.now().toString(),
        imageUrl: resultImageUrl,
        prompt: prompt,
        timestamp: Date.now(),
      };
      setResult(newResult);
      setHistory(prevHistory => [newResult, ...prevHistory]);
    } catch (err: unknown) {
      let message = "Failed to transform image. The prompt might be too restrictive or the service is temporarily unavailable.";
      if (err instanceof Error) {
        message = err.message || message;
      }
      setError(message);
    } finally {
      setIsTransforming(false);
    }
  }, [sourceImage, prompt]);

  // FIX: Wrapped handler in `useCallback` to resolve potential scope issues.
  const downloadResult = useCallback(() => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.imageUrl;
    link.download = `morphy-${result.id}.png`;
    link.click();
  }, [result]);

  const viewHistoryItem = useCallback((item: TransformationResult) => {
    setResult(item);
    setIsHistoryVisible(false); // Close sidebar on selection
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm('Are you sure you want to clear your entire generation history? This cannot be undone.')) {
        setHistory([]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-50 selection:bg-indigo-500/30 font-['Inter']">
       <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-indigo-500/20 fixed top-0 left-24 right-0 z-40">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <a href="#" onClick={(e) => { e.preventDefault(); }} className="flex items-center">
              <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">Morphy</span>
            </a>
            <button
              onClick={() => setIsHistoryVisible(true)}
              className="p-2 rounded-lg transition-colors relative flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 bg-gray-800/50"
              aria-label="Open generation history"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="text-xs font-medium hidden sm:inline">History</span>
            </button>
          </div>
        </div>
      </header>
      
      <div className="pt-16">
        <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          
          {/* Controls Column */}
          <div className="space-y-8">
            <section className="glass rounded-3xl p-8 space-y-8 shadow-xl">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  Reference Image
                </label>
                <ImageUploader onImageSelected={setSourceImage} />
              </div>
              
              <PromptSelector 
                customPrompt={prompt}
                onCustomPromptChange={setPrompt}
              />

              <button
                onClick={handleTransform}
                disabled={isTransforming || !sourceImage || !prompt}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform active:scale-[0.98] ${
                  isTransforming 
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30 active:shadow-inner'
                }`}
              >
                {isTransforming ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Simulating Studio Setup...
                  </div>
                ) : 'Manifest Persona'}
              </button>
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
            </section>
          </div>

          {/* Result Column */}
          <div className="lg:sticky lg:top-12">
            <div className={`transition-all duration-500 ${result ? 'scale-100 opacity-100' : 'scale-95 pointer-events-none'}`}>
              <div className="glass rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10">
                <div className="aspect-[4/5] relative bg-slate-900 flex items-center justify-center">
                  {result ? (
                    <img src={result.imageUrl} alt="Transformation Result" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-600">
                      <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-indigo-600 animate-pulse flex items-center justify-center">
                         <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                         </svg>
                      </div>
                      <p className="font-medium italic text-sm">Studio result will appear here...</p>
                    </div>
                  )}
                  {isTransforming && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                       <div className="text-center p-6 max-w-xs">
                          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <h3 className="text-lg font-bold">Studio Lighting Active...</h3>
                          <p className="text-slate-400 text-sm mt-2">Processing balanced exposure, high-end skin detail, and clean studio textures.</p>
                       </div>
                    </div>
                  )}
                </div>
                {result && (
                  <div className="p-6 flex items-center justify-end bg-slate-900/50">
                    <button 
                      onClick={downloadResult}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300 border border-white/5"
                      title="Download Image"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      </div>
      <HistorySidebar
        history={history}
        isVisible={isHistoryVisible}
        onClose={() => setIsHistoryVisible(false)}
        onSelect={viewHistoryItem}
        onClear={clearHistory}
      />
    </div>
  );
};

export default App;