import React from 'react';
// @ts-ignore - GEMMA App may have different types
import GemmaApp from '../gemma/App';

export const GemmaPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020408] text-gray-100 font-sans selection:bg-orange-500/30">
      <div className="pl-24">
        <GemmaApp />
      </div>
    </div>
  );
};
