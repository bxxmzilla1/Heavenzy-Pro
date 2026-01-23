import React, { useState } from 'react';
// @ts-ignore - Reelzey components may have different types
import VoiceCloner from '../Reelzey/andreix---speedup/components/VoiceCloner';
// @ts-ignore
import TextToSpeech from '../Reelzey/andreix---speedup/components/TextToSpeech';
// @ts-ignore
import VoiceChanger from '../Reelzey/andreix---speedup/components/VoiceChanger';
// @ts-ignore
import VoiceActors from '../Reelzey/andreix---speedup/components/VoiceActors';
import VoicerSidebar from './VoicerSidebar';

export const VoicerPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<string>('voiceCloner');

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-blue-500/20 fixed top-0 left-24 right-0 z-40">
        <div className="flex items-center justify-between h-16">
          <a href="#" onClick={(e) => { e.preventDefault(); setActiveMenu('voiceCloner'); }} className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Voizer</span>
          </a>
        </div>
      </header>

      {/* Sidebar Menu - Left on desktop, Footer on mobile */}
      <VoicerSidebar 
        activeMenu={activeMenu} 
        onMenuChange={setActiveMenu} 
      />

      {/* Main Content Area - Adjusted for sidebar/footer and main app left sidebar */}
      <div className={`pt-16 ${(activeMenu === 'voiceCloner' || activeMenu === 'textToSpeech' || activeMenu === 'voiceChanger' || activeMenu === 'voiceActors') ? 'md:pl-64' : ''} ${(activeMenu === 'voiceCloner' || activeMenu === 'textToSpeech' || activeMenu === 'voiceChanger' || activeMenu === 'voiceActors') ? 'pb-24 md:pb-0' : ''}`}>
        {/* Voice Cloner Title */}
        {activeMenu === 'voiceCloner' && (
          <div className="px-4 md:px-8 pt-8 pb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Voice Cloner</h1>
          </div>
        )}
        {/* Text To Speech Title */}
        {activeMenu === 'textToSpeech' && (
          <div className="px-4 md:px-8 pt-8 pb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Text To Speech</h1>
          </div>
        )}
        {/* Voice Changer Title */}
        {activeMenu === 'voiceChanger' && (
          <div className="px-4 md:px-8 pt-8 pb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Voice Changer</h1>
          </div>
        )}
        {/* Voice Actors Title */}
        {activeMenu === 'voiceActors' && (
          <div className="px-4 md:px-8 pt-8 pb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">Voice Actors</h1>
          </div>
        )}

        <main>
          {activeMenu === 'voiceCloner' && (
            <VoiceCloner />
          )}
          {activeMenu === 'textToSpeech' && (
            <TextToSpeech />
          )}
          {activeMenu === 'voiceChanger' && (
            <VoiceChanger />
          )}
          {activeMenu === 'voiceActors' && (
            <VoiceActors />
          )}
        </main>
      </div>
    </div>
  );
};
