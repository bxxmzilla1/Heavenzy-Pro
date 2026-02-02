import React, { useState, useEffect } from 'react';
import { 
  CLOTHING_OPTIONS, 
  LIGHTING_OPTIONS, 
  ETHNICITY_OPTIONS, 
  EYE_COLOR_OPTIONS, 
  EYE_SHAPE_OPTIONS, 
  HAIR_STYLE_OPTIONS, 
  HAIR_COLOR_OPTIONS, 
  NOSE_SHAPE_OPTIONS, 
  MOUTH_SHAPE_OPTIONS, 
  GenerationConfig,
  HistoryItem
} from './types';
import { generatePortrait } from './services/gemini';
import { Button } from './components/Button';
import { HistorySidebar } from './components/HistorySidebar';
import { Camera, Download, Wand2, User, AlertCircle, Palette, Sparkles, History } from 'lucide-react';

const HISTORY_STORAGE_KEY = 'gemma-generation-history';

const loadHistory = (): HistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Failed to load history from local storage:", error);
    return [];
  }
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [config, setConfig] = useState<GenerationConfig>({
    clothing: CLOTHING_OPTIONS[0],
    lighting: LIGHTING_OPTIONS[0],
    ethnicity: 'Caucasian',
    skinTone: 20,
    eyeColor: 'Blue',
    eyeShape: 'Almond',
    hairStyle: 'Straight Long',
    hairColor: 'Blonde',
    noseShape: 'Button',
    mouthShape: 'Full Lips'
  });

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save history to local storage:", error);
    }
  }, [history]);

  const handleGenerate = async () => {
    // Check if API key is set
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey || apiKey.trim() === '') {
      setError('Gemini API key not found. Please set it in Settings.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = await generatePortrait(config);
      setImageUrl(url);
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: url,
        config: { ...config }
      };
      setHistory(prevHistory => [newItem, ...prevHistory]);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('API key not found') || errorMessage.includes('not found')) {
        setError('Gemini API key not found. Please set it in Settings.');
      } else if (errorMessage.includes('PERMISSION_DENIED')) {
        setError("Permission denied. Please check your API key in Settings and ensure billing is enabled.");
      } else {
        setError(errorMessage || "Failed to generate image. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `gemma-portrait-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setImageUrl(item.imageUrl);
    setConfig(item.config);
  };
  
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire generation history? This action cannot be undone.")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-white selection:text-black">
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:pr-64' : 'pr-0'}`}>
        {/* Header */}
        <header className="border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white text-black p-1.5 rounded-lg">
                <Camera size={20} strokeWidth={2.5} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">GEMMA</h1>
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
                title="Toggle History Sidebar"
              >
                <History className="w-5 h-5 text-gray-300" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Controls Section */}
            <div className="lg:col-span-5 space-y-8 h-fit">
              
              {/* Identity Group */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Identity & Skin
                </h2>
                
                <div className="space-y-5">
                  {/* Ethnicity */}
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-2">Ethnicity</label>
                    <div className="flex flex-wrap gap-2">
                      {ETHNICITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setConfig({ ...config, ethnicity: opt })}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                            config.ethnicity === opt
                              ? 'bg-white text-black border-white shadow-md'
                              : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Tone Slider */}
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-medium text-gray-300">Skin Tone</label>
                        <span className="text-xs text-gray-500">
                          {config.skinTone < 33 ? 'Light' : config.skinTone < 66 ? 'Medium' : 'Dark'}
                        </span>
                      </div>
                      <div className="relative h-6 w-full">
                        <div 
                          className="absolute inset-0 rounded-full opacity-80"
                          style={{
                            background: 'linear-gradient(to right, #ffe0d0, #e0ac69, #8d5524, #3b2219)'
                          }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={config.skinTone}
                          onChange={(e) => setConfig({ ...config, skinTone: parseInt(e.target.value) })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {/* Thumb Indicator */}
                        <div 
                          className="absolute top-0 bottom-0 w-6 h-6 bg-black border-2 border-white rounded-full shadow-lg pointer-events-none transition-transform"
                          style={{ left: `calc(${config.skinTone}% - 12px)` }}
                        />
                      </div>
                  </div>
                </div>
              </div>

              {/* Facial Features Group */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Features
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Hair */}
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Hair Style</label>
                        <select 
                          value={config.hairStyle}
                          onChange={(e) => setConfig({...config, hairStyle: e.target.value})}
                          className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                        >
                          {HAIR_STYLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-300 mb-1">Hair Color</label>
                        <select 
                          value={config.hairColor}
                          onChange={(e) => setConfig({...config, hairColor: e.target.value})}
                          className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                        >
                          {HAIR_COLOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                  </div>

                  {/* Eyes */}
                  <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Eye Color</label>
                      <select 
                        value={config.eyeColor}
                        onChange={(e) => setConfig({...config, eyeColor: e.target.value})}
                        className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                      >
                        {EYE_COLOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Eye Shape</label>
                      <select 
                        value={config.eyeShape}
                        onChange={(e) => setConfig({...config, eyeShape: e.target.value})}
                        className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                      >
                        {EYE_SHAPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                  </div>

                  {/* Nose & Mouth */}
                  <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Nose Shape</label>
                      <select 
                        value={config.noseShape}
                        onChange={(e) => setConfig({...config, noseShape: e.target.value})}
                        className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                      >
                        {NOSE_SHAPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">Mouth Shape</label>
                      <select 
                        value={config.mouthShape}
                        onChange={(e) => setConfig({...config, mouthShape: e.target.value})}
                        className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                      >
                        {MOUTH_SHAPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                  </div>
                </div>
              </div>

              {/* Style Group */}
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Style & Lighting
                </h2>
                
                <div className="space-y-4">
                    {/* Lighting */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">Lighting</label>
                      <select 
                        value={config.lighting}
                        onChange={(e) => setConfig({...config, lighting: e.target.value})}
                        className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                      >
                        {LIGHTING_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    
                    {/* Clothing - Keep as compact grid */}
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-2">Clothing</label>
                      <div className="grid grid-cols-1 gap-2">
                        <select 
                          value={config.clothing.id}
                          onChange={(e) => {
                            const selected = CLOTHING_OPTIONS.find(c => c.id === e.target.value);
                            if(selected) setConfig({...config, clothing: selected});
                          }}
                          className="w-full text-sm border-gray-600 rounded-lg focus:ring-white focus:border-white bg-gray-700 py-2 px-3 text-white"
                        >
                          {CLOTHING_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleGenerate} 
                  isLoading={loading} 
                  className="w-full py-4 text-base shadow-lg shadow-black/50 bg-gray-800 text-white hover:bg-gray-700 transition-all hover:shadow-xl focus:ring-white"
                  icon={<Wand2 className="w-4 h-4" />}
                >
                  {loading ? 'Generating Synthetic Model...' : 'Generate Portrait'}
                </Button>
                <p className="text-xs text-center text-gray-500 mt-3">
                  Generates a 2K resolution image.
                </p>
              </div>
            </div>

            {/* Image Display Section */}
            <div className="lg:col-span-7">
              <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-black/30 flex items-center justify-center group sticky top-24">
                
                {imageUrl ? (
                  <>
                    <img 
                      src={imageUrl} 
                      alt="Generated Synthetic Portrait" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                    />
                    
                    {/* Overlay Actions */}
                    <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 translate-y-2 group-hover:translate-y-0">
                      <button 
                        onClick={handleDownload}
                        className="bg-white text-black p-3 rounded-full shadow-lg hover:bg-gray-200 transition-colors flex items-center gap-2 px-5"
                      >
                        <Download className="w-5 h-5" />
                        <span className="font-medium text-sm">Download 2K</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-12">
                    {loading ? (
                      <div className="flex flex-col items-center animate-pulse">
                          <div className="w-16 h-16 bg-gray-800 rounded-full mb-4 flex items-center justify-center">
                            <Wand2 className="w-8 h-8 text-gray-700" />
                          </div>
                          <div className="h-4 w-48 bg-gray-800 rounded mb-2"></div>
                          <div className="h-3 w-32 bg-gray-700 rounded"></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-gray-500">
                        <div className="bg-gray-800 p-6 rounded-full mb-4">
                          <User className="w-12 h-12 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-100 mb-1">Ready to Create</h3>
                        <p className="max-w-xs mx-auto text-sm">
                          Use the detailed controls to customize ethnicity, skin tone, hair, and facial features.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="absolute top-6 left-6 right-6 bg-red-900/30 text-red-300 px-4 py-3 rounded-lg text-sm border border-red-500/30 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Generation Error</p>
                      <p>{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-10"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <HistorySidebar 
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
        isOpen={isSidebarOpen}
      />
    </div>
  );
};

export default App;