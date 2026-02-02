import React from 'react';
import { TransformationResult } from '../types';

interface HistorySidebarProps {
  history: TransformationResult[];
  isVisible: boolean;
  onClose: () => void;
  onSelect: (item: TransformationResult) => void;
  onClear: () => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, isVisible, onClose, onSelect, onClear }) => {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900/80 border-l border-slate-700/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-heading"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 flex-shrink-0">
          <h2 id="history-heading" className="text-xl font-bold text-white">Generation History</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close history sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* History List */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {history.length > 0 ? (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex flex-col gap-3 p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800/90 transition-all text-left group"
              >
                <img
                  src={item.imageUrl}
                  alt="Generated character"
                  className="w-full aspect-[4/5] object-cover rounded-lg flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {item.prompt}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 className="font-semibold text-slate-400">No History Yet</h3>
              <p className="text-sm mt-1">Your generated images will appear here.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-6 border-t border-slate-800 flex-shrink-0">
            <button
              onClick={onClear}
              className="w-full py-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold transition-colors border border-red-500/20"
            >
              Clear History
            </button>
          </div>
        )}
      </aside>
    </>
  );
};

export default HistorySidebar;