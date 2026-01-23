
import React from 'react';
import { SparklesIcon, VideoIcon, SettingsIcon, MicrophoneIcon } from './IconComponents';

interface LeftSidebarProps {
  activeApp: string;
  onAppChange: (app: string) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeApp, onAppChange }) => {
  const menuItems = [
    { id: 'halyxis', label: 'Halyxis', icon: SparklesIcon, color: 'teal' },
    { id: 'reelzey', label: 'Reelzey', icon: VideoIcon, color: 'purple' },
    { id: 'voicer', label: 'Voizer', icon: MicrophoneIcon, color: 'blue' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, color: 'gray' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-24 bg-[#0f1115]/95 backdrop-blur-sm border-r border-white/5 flex flex-col items-center py-6 z-30">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeApp === item.id;
        const colorClasses = {
          teal: {
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
            hoverBg: 'hover:bg-teal-500/20',
            text: 'text-teal-400',
            hoverText: 'group-hover:text-teal-300',
          },
          purple: {
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            hoverBg: 'hover:bg-purple-500/20',
            text: 'text-purple-400',
            hoverText: 'group-hover:text-purple-300',
          },
          gray: {
            bg: 'bg-gray-500/10',
            border: 'border-gray-500/20',
            hoverBg: 'hover:bg-gray-500/20',
            text: 'text-gray-400',
            hoverText: 'group-hover:text-gray-300',
          },
          blue: {
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            hoverBg: 'hover:bg-blue-500/20',
            text: 'text-blue-400',
            hoverText: 'group-hover:text-blue-300',
          },
        };
        const colors = colorClasses[item.color as keyof typeof colorClasses] || colorClasses.teal;

        return (
          <button
            key={item.id}
            onClick={() => onAppChange(item.id)}
            className={`flex flex-col items-center gap-2 mb-6 group transition-all ${
              isActive ? 'scale-105' : ''
            }`}
            title={item.label}
          >
            <div
              className={`w-12 h-12 flex items-center justify-center rounded-xl border transition-all duration-200 group-hover:scale-105 ${
                isActive
                  ? `${colors.bg} ${colors.border} ${colors.hoverBg} ring-2 ring-offset-2 ring-offset-[#0f1115] ${colors.border.replace('/20', '/40')}`
                  : `${colors.bg} ${colors.border} ${colors.hoverBg}`
              }`}
            >
              <Icon className={`w-7 h-7 ${colors.text} ${colors.hoverText} transition-colors`} />
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-widest transition-opacity ${
                isActive ? `${colors.text} opacity-100` : `${colors.text} opacity-80 group-hover:opacity-100`
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-white/5 mb-6"></div>

      {/* Future menu items can be added here */}
      <div className="flex-1"></div>
    </aside>
  );
};
