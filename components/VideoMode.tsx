import React from 'react';

export const VideoMode: React.FC = () => {
  return (
    <div className="px-4 md:px-8 pb-8">
      <div className="bg-[#0f1115] border border-white/5 rounded-xl p-6 md:p-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
          <i className="fas fa-video text-6xl mb-4 text-pink-400/30"></i>
          <h2 className="text-2xl font-semibold mb-2">Video Mode</h2>
          <p className="text-center">Video editing features coming soon...</p>
        </div>
      </div>
    </div>
  );
};
