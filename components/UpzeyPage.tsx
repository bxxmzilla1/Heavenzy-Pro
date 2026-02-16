import React, { useState } from 'react';
import UpzeySidebar from './UpzeySidebar';
import { UpzeyImageMode } from './UpzeyImageMode';
import { UpzeyVideoMode } from './UpzeyVideoMode';

export const UpzeyPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState('image');

  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-cyan-500/20 fixed top-0 left-24 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-clip-text text-transparent">
              UPZEY
            </h1>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <UpzeySidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} />

      {/* Body Section - Adjusted for sidebar */}
      <div className="pt-20 md:ml-64">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          {activeMenu === 'image' && <UpzeyImageMode />}
          {activeMenu === 'video' && <UpzeyVideoMode />}
        </div>
      </div>
    </div>
  );
};
