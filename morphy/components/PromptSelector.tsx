
import React from 'react';

interface PromptSelectorProps {
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

const PromptSelector: React.FC<PromptSelectorProps> = ({ 
  customPrompt, 
  onCustomPromptChange 
}) => {
  return (
    <div className="space-y-4">
      <div className="mt-2">
        <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">
          Character Outfit & Identity
        </label>
        <textarea
          value={customPrompt}
          onChange={(e) => onCustomPromptChange(e.target.value)}
          placeholder="e.g., A cybernetic rebel in a sleek matte black jumpsuit, elaborate geometric tattoos on their neck and hands..."
          className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600 shadow-inner resize-none"
        />
      </div>
    </div>
  );
};

export default PromptSelector;
