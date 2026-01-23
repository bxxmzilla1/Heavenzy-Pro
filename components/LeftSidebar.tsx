
import React from 'react';
import { SparklesIcon } from './IconComponents';

interface LeftSidebarProps {
  // Add any props you might need in the future
}

export const LeftSidebar: React.FC<LeftSidebarProps> = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-[#0f1115]/95 backdrop-blur-sm border-r border-white/5 flex flex-col items-center py-6 z-30">
      {/* Halyxis Logo/Brand */}
      <button 
        className="flex flex-col items-center gap-2 mb-8 group"
        title="Halyxis"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-teal-500/10 rounded-xl border border-teal-500/20 hover:bg-teal-500/20 transition-all duration-200 group-hover:scale-105">
          <SparklesIcon className="w-6 h-6 text-teal-400 group-hover:text-teal-300 transition-colors" />
        </div>
        <span className="text-[9px] font-bold text-teal-400 uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">
          H
        </span>
      </button>

      {/* Divider */}
      <div className="w-8 h-px bg-white/5 mb-6"></div>

      {/* Future menu items can be added here */}
      <div className="flex-1"></div>
    </aside>
  );
};
