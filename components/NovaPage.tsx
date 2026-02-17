import React from 'react';

export const NovaPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="w-full px-2 sm:px-6 lg:px-8 bg-black backdrop-blur-sm border-b border-violet-500/20 fixed top-0 left-24 right-0 z-50 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold whitespace-nowrap bg-gradient-to-r from-violet-400 via-violet-500 to-violet-400 bg-clip-text text-transparent">
              NOVA
            </h1>
          </div>
        </div>
      </header>

      {/* Body Section */}
      <div className="pt-20">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-300 mb-4">Nova</h2>
              <p className="text-gray-400">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
