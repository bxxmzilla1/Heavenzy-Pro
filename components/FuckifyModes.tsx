import React from 'react';

interface FuckifyModeProps {
  modeName: string;
  icon?: string;
}

const BlankMode: React.FC<FuckifyModeProps> = ({ modeName, icon }) => {
  return (
    <div className="px-4 md:px-8 pb-8">
      <div className="bg-[#0f1115] border border-white/5 rounded-xl p-6 md:p-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
          {icon && <i className={`${icon} text-6xl mb-4 text-pink-400/30`}></i>}
          <h2 className="text-2xl font-semibold mb-2">{modeName}</h2>
          <p className="text-center">This mode is coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export const ImageMode: React.FC = () => {
  return <BlankMode modeName="Image Mode" icon="fas fa-image" />;
};

export const VideoMode: React.FC = () => {
  return <BlankMode modeName="Video Mode" icon="fas fa-video" />;
};

export const EditMode: React.FC = () => {
  return <BlankMode modeName="Edit Mode" icon="fas fa-edit" />;
};

export const TransformMode: React.FC = () => {
  return <BlankMode modeName="Transform Mode" icon="fas fa-magic" />;
};
