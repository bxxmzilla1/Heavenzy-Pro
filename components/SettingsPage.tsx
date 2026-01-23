import React, { useState, useEffect } from 'react';

interface SettingsPageProps {
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [wavespeedKey, setWavespeedKey] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load API keys from localStorage
    setGeminiKey(localStorage.getItem('geminiApiKey') || '');
    setWavespeedKey(localStorage.getItem('wavespeedApiKey') || '');
    setElevenlabsKey(localStorage.getItem('elevenlabsApiKey') || '');
  }, []);

  const handleSave = () => {
    // Save API keys to localStorage (shared between both apps)
    localStorage.setItem('geminiApiKey', geminiKey);
    localStorage.setItem('wavespeedApiKey', wavespeedKey);
    localStorage.setItem('elevenlabsApiKey', elevenlabsKey);
    
    // Update global variables for libraries that check them
    if (typeof window !== 'undefined' && geminiKey) {
      (window as any).GOOGLE_GEN_AI_API_KEY = geminiKey;
      if (typeof process !== 'undefined' && process.env) {
        process.env.GOOGLE_GEN_AI_API_KEY = geminiKey;
        process.env.GEMINI_API_KEY = geminiKey;
      } else if (typeof window !== 'undefined') {
        // Polyfill process.env if needed
        if (!(window as any).process) {
          (window as any).process = { env: {} };
        }
        (window as any).process.env.GOOGLE_GEN_AI_API_KEY = geminiKey;
        (window as any).process.env.GEMINI_API_KEY = geminiKey;
      }
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  };

  return (
    <div className="w-full bg-[#020408] text-gray-100">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 via-purple-400 to-teal-400 bg-clip-text text-transparent mb-2">
            API Settings
          </h1>
          <p className="text-gray-400">Configure API keys that will be shared across Halyxis and Reelzey applications.</p>
        </div>

        <div className="bg-[#0f1115] border border-white/5 rounded-xl p-6 md:p-8 space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Wavespeed API Key</label>
            <input
              type="password"
              value={wavespeedKey}
              onChange={(e) => setWavespeedKey(e.target.value)}
              placeholder="Enter your Wavespeed API key"
              className="w-full bg-black/40 rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-300"
            />
            <p className="text-xs text-gray-500 mt-2">Required for video generation features including Mirror Mode, Video Creator, and motion control. Get your API key from <a href="https://wavespeed.ai" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Wavespeed.ai</a>.</p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">ElevenLabs API Key</label>
            <input
              type="password"
              value={elevenlabsKey}
              onChange={(e) => setElevenlabsKey(e.target.value)}
              placeholder="Enter your ElevenLabs API key"
              className="w-full bg-black/40 rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-300"
            />
            <p className="text-xs text-gray-500 mt-2">Required for Voice Cloner, Text-to-Speech, and Voice Changer features. Create an API key in the <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">ElevenLabs dashboard</a>.</p>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-300">Gemini API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full bg-black/40 rounded-lg p-3 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-gray-300"
            />
            <p className="text-xs text-gray-500 mt-2">Required for all Gemini AI features including Stage Creator, image analysis, script generation, and content generation. Get your API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Google AI Studio</a>.</p>
          </div>

          <div className="flex gap-4 justify-end border-t border-gray-700/50 pt-6 mt-6">
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-500 hover:to-teal-500 text-white shadow-lg shadow-purple-500/20"
            >
              {saved ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                'Save API Keys'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
