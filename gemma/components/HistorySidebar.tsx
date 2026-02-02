import React from 'react';
import { HistoryItem } from '../types';
import { Trash2, Image as ImageIcon, History } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  isOpen: boolean;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, onClear, isOpen }) => {
  return (
    <aside className={`fixed top-0 right-0 h-full z-20 bg-gray-900 border-l border-gray-800 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} w-64 flex flex-col`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">History</h2>
        </div>
        <button
          onClick={onClear}
          disabled={history.length === 0}
          className="p-1.5 text-gray-400 rounded-md hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear History"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto p-2">
        {history.length > 0 ? (
          <div className="space-y-2">
            {history.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full bg-black rounded-lg overflow-hidden group relative border-2 border-transparent hover:border-white focus:border-white focus:outline-none transition-all flex items-center justify-center p-2"
              >
                <img src={item.imageUrl} alt="Generated portrait thumbnail" className="w-full h-auto max-h-80 object-contain rounded" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold">View</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
            <ImageIcon className="w-12 h-12 mb-2" />
            <p className="font-medium text-gray-400">No History Yet</p>
            <p className="text-xs">Your generated portraits will appear here.</p>
          </div>
        )}
      </div>
    </aside>
  );
};