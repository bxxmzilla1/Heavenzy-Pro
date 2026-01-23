import React, { useState } from 'react';
// @ts-ignore - Reelzey components may have different types
import VoiceCloner from '../Reelzey/andreix---speedup/components/VoiceCloner';
// @ts-ignore
import TextToSpeech from '../Reelzey/andreix---speedup/components/TextToSpeech';
// @ts-ignore
import VoiceChanger from '../Reelzey/andreix---speedup/components/VoiceChanger';
// @ts-ignore
import VoiceActors from '../Reelzey/andreix---speedup/components/VoiceActors';

export const VoicerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('voiceCloner');

  const tabs = [
    { id: 'voiceCloner', label: 'Voice Cloner', icon: 'fa-microphone' },
    { id: 'textToSpeech', label: 'Text To Speech', icon: 'fa-volume-up' },
    { id: 'voiceChanger', label: 'Voice Changer', icon: 'fa-magic' },
    { id: 'voiceActors', label: 'Voice Actors', icon: 'fa-users' },
  ];

  return (
    <div className="min-h-screen bg-[#020408] text-gray-100">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#020408]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Voicer
          </h1>
          
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div style={{ display: activeTab === 'voiceCloner' ? 'block' : 'none' }}>
          <VoiceCloner />
        </div>
        <div style={{ display: activeTab === 'textToSpeech' ? 'block' : 'none' }}>
          <TextToSpeech />
        </div>
        <div style={{ display: activeTab === 'voiceChanger' ? 'block' : 'none' }}>
          <VoiceChanger />
        </div>
        <div style={{ display: activeTab === 'voiceActors' ? 'block' : 'none' }}>
          <VoiceActors />
        </div>
      </div>
    </div>
  );
};
