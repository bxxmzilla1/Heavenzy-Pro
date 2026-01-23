
import React from 'react';
import { SparklesIcon, HistoryIcon } from './IconComponents';

interface HeaderProps {
  onToggleHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
  return (
    <header className="bg-[#020408]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-8 h-8 text-teal-400" />
          <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
            Halyxis
          </h1>
          <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">
            Halyxis
          </h1>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
              onClick={onToggleHistory}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              title="View History"
          >
              <HistoryIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
