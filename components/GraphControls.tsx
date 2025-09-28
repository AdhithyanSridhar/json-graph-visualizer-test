import React from 'react';

type Theme = 'light' | 'dark';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExport: () => void;
  theme: Theme;
}

const GraphControls: React.FC<GraphControlsProps> = ({ onZoomIn, onZoomOut, onReset, onExport, theme }) => {
  const baseButtonClass = "p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const themeClasses = {
    light: {
      panel: "bg-white/80 border-gray-300 backdrop-blur-sm",
      button: "text-gray-600 hover:bg-gray-200 focus:ring-indigo-500",
      icon: "h-6 w-6"
    },
    dark: {
      panel: "bg-gray-900/70 border-gray-700 backdrop-blur-sm",
      button: "text-gray-300 hover:bg-gray-700 focus:ring-indigo-400",
      icon: "h-6 w-6"
    }
  };

  const currentTheme = themeClasses[theme];

  return (
    <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-full border shadow-lg ${currentTheme.panel}`}>
      <button onClick={onZoomIn} className={`${baseButtonClass} ${currentTheme.button}`} aria-label="Zoom In">
        <svg xmlns="http://www.w3.org/2000/svg" className={currentTheme.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      </button>
      <button onClick={onZoomOut} className={`${baseButtonClass} ${currentTheme.button}`} aria-label="Zoom Out">
        <svg xmlns="http://www.w3.org/2000/svg" className={currentTheme.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
        </svg>
      </button>
      <button onClick={onReset} className={`${baseButtonClass} ${currentTheme.button}`} aria-label="Reset View">
        <svg xmlns="http://www.w3.org/2000/svg" className={currentTheme.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
        </svg>
      </button>
      <div className={`w-px h-6 ${theme === 'light' ? 'bg-gray-300' : 'bg-gray-600'}`}></div>
      <button onClick={onExport} className={`${baseButtonClass} ${currentTheme.button}`} aria-label="Export as PNG">
        <svg xmlns="http://www.w3.org/2000/svg" className={currentTheme.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </div>
  );
};

export default GraphControls;
