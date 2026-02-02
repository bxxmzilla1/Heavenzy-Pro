
import React from 'react';
import { SparklesIcon, HistoryIcon } from './IconComponents';

interface HeaderProps {
  onToggleHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleHistory }) => {
  return (
    <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-teal-500/20 fixed top-0 left-24 right-0 z-40">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <a href="#" onClick={(e) => { e.preventDefault(); }} className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-teal-400 via-teal-500 to-teal-400 bg-clip-text text-transparent">Halyxis</span>
          </a>
          <button
            onClick={onToggleHistory}
            className={`p-2 rounded-lg transition-colors relative flex items-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800 bg-gray-800/50`}
            title="Generation History"
          >
            <HistoryIcon className="w-5 h-5" />
            <span className="text-xs font-medium hidden sm:inline">History</span>
          </button>
        </div>
      </div>
    </header>
  );
};
