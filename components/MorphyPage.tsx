import React from 'react';
// @ts-ignore - Morphy App may have different types
import MorphyApp from '../morphy/App';

export const MorphyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020408] text-gray-100 font-sans selection:bg-indigo-500/30">
      <div className="pl-24">
        <MorphyApp />
      </div>
    </div>
  );
};
