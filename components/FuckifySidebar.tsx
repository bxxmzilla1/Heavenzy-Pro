import React from 'react';

interface FuckifySidebarProps {
  activeMenu: string;
  onMenuChange: (menu: string) => void;
}

const FuckifySidebar: React.FC<FuckifySidebarProps> = ({ activeMenu, onMenuChange }) => {
  const menuItems = [
    { id: 'imageMode', name: 'Image Mode', icon: 'fa-image', iconType: 'fa' as const },
    { id: 'videoMode', name: 'Video Mode', icon: 'fa-video', iconType: 'fa' as const },
  ];

  const handleClick = (e: React.MouseEvent, menuId: string) => {
    e.preventDefault();
    onMenuChange(menuId);
  };

  const renderIcon = (item: typeof menuItems[0], size: 'lg' | 'xl' = 'lg') => {
    if (item.iconType === 'svg') {
      return null; // Add SVG icons if needed
    }
    return <i className={`fas ${item.icon} ${size === 'lg' ? 'text-lg' : 'text-xl'}`}></i>;
  };

  return (
    <>
      {/* Desktop: Left Sidebar - Adjusted for main app left sidebar */}
      <aside className="hidden md:flex fixed left-24 top-16 bottom-0 w-64 bg-black/80 backdrop-blur-sm border-r border-pink-500/20 z-30">
        <nav className="w-full p-4 flex flex-col gap-2">
          {menuItems.map(item => (
            <a
              href="#"
              key={item.id}
              onClick={(e) => handleClick(e, item.id)}
              className={`px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                activeMenu === item.id
                  ? 'bg-pink-600 text-white neon-glow'
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
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-pink-500/20 z-40 safe-area-inset-bottom">
        <nav className="flex items-center justify-around px-2 py-3">
          {menuItems.map(item => (
            <a
              href="#"
              key={item.id}
              onClick={(e) => handleClick(e, item.id)}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[80px] ${
                activeMenu === item.id
                  ? 'text-pink-400'
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

export default FuckifySidebar;
