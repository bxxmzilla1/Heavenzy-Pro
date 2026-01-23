import React from 'react';

interface VoicerSidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const VoicerSidebar: React.FC<VoicerSidebarProps> = ({ activeMenu, onMenuChange }) => {
  const menuItems = [
    { id: 'voiceCloner', name: 'Voice Cloner', icon: 'fa-microphone', iconType: 'fa' as const },
    { id: 'textToSpeech', name: 'Text To Speech', icon: 'fa-volume-up', iconType: 'fa' as const },
    { id: 'voiceChanger', name: 'Voice Changer', icon: 'fa-magic', iconType: 'fa' as const },
    { id: 'voiceActors', name: 'Voice Actors', icon: 'fa-users', iconType: 'fa' as const },
  ];

  const handleClick = (e: React.MouseEvent, menuId: string) => {
    e.preventDefault();
    onMenuChange(menuId);
  };

  const renderIcon = (item: typeof menuItems[0], size: 'lg' | 'xl' = 'lg') => {
    return <i className={`fas ${item.icon} ${size === 'lg' ? 'text-lg' : 'text-xl'}`}></i>;
  };

  return (
    <>
      {/* Desktop: Left Sidebar - Adjusted for main app left sidebar */}
      <aside className="hidden md:flex fixed left-24 top-16 bottom-0 w-64 bg-black/80 backdrop-blur-sm border-r border-blue-500/20 z-30">
        <nav className="w-full p-4 flex flex-col gap-2">
          <div className="mb-4 px-4">
            <h2 className="text-xl font-semibold text-white">Voicer</h2>
          </div>
          {menuItems.map(item => (
            <a
              href="#"
              key={item.id}
              onClick={(e) => handleClick(e, item.id)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                activeMenu === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {renderIcon(item, 'lg')}
              <span className="font-semibold">{item.name}</span>
            </a>
          ))}
        </nav>
      </aside>

      {/* Mobile: Footer Menu */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-blue-500/20 z-40 safe-area-inset-bottom">
        <nav className="flex items-center justify-around px-2 py-3">
          {menuItems.map(item => (
            <a
              href="#"
              key={item.id}
              onClick={(e) => handleClick(e, item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[80px] ${
                activeMenu === item.id
                  ? 'text-blue-400'
                  : 'text-gray-400'
              }`}
            >
              {renderIcon(item, 'xl')}
              <span className="text-xs font-semibold">{item.name}</span>
            </a>
          ))}
        </nav>
      </footer>
    </>
  );
};

export default VoicerSidebar;
