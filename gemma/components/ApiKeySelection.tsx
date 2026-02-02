import React, { useEffect, useState } from 'react';
import { hasSelectedApiKey, openApiKeySelection } from '../services/gemini';
import { Button } from './Button';
import { Lock, ExternalLink } from 'lucide-react';

interface ApiKeySelectionProps {
  onKeySelected: () => void;
}

export const ApiKeySelection: React.FC<ApiKeySelectionProps> = ({ onKeySelected }) => {
  const [checking, setChecking] = useState(true);

  const checkKey = async () => {
    setChecking(true);
    try {
      const hasKey = await hasSelectedApiKey();
      if (hasKey) {
        onKeySelected();
      }
    } catch (e) {
      console.error("Error checking API key status", e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectKey = async () => {
    await openApiKeySelection();
    // Assume success after closing dialog and proceed to the app.
    onKeySelected();
  };

  if (checking) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-pulse flex flex-col items-center">
        <div className="h-12 w-12 bg-gray-800 rounded-full mb-4"></div>
        <div className="h-4 w-48 bg-gray-800 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
      <div className="max-w-md w-full bg-gray-900 rounded-2xl shadow-xl p-8 text-center border border-gray-800">
        <div className="bg-blue-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Required</h1>
        <p className="text-gray-400 mb-6">
          To generate high-resolution 2K studio portraits, this application uses premium Gemini models. You need to connect a paid Google Cloud project.
        </p>
        
        <Button 
          onClick={handleSelectKey} 
          className="w-full mb-4 py-3 text-base bg-white text-black hover:bg-gray-200"
        >
          Connect Google Cloud Project
        </Button>
        
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-200 flex items-center justify-center gap-1 transition-colors"
        >
          Learn more about billing <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};