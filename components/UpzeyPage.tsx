import React from 'react';

export const UpzeyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#020408] text-gray-100 font-sans selection:bg-cyan-500/30">
      <div className="pl-24 pt-20">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-clip-text text-transparent mb-4">
                UPZEY
              </h1>
              <p className="text-gray-400 text-lg">Coming soon...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
