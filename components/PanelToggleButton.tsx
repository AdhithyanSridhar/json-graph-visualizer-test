import React from 'react';

type Theme = 'light' | 'dark';

interface PanelToggleButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
}

const PanelToggleButton: React.FC<PanelToggleButtonProps> = ({ isCollapsed, onToggle, theme }) => {
  const themeClasses = {
    light: {
      bg: 'bg-white hover:bg-gray-100',
      border: 'border-gray-300',
      icon: 'text-gray-600',
    },
    dark: {
      bg: 'bg-gray-800 hover:bg-gray-700',
      border: 'border-gray-600',
      icon: 'text-gray-300',
    },
  };
  const currentTheme = themeClasses[theme];

  return (
    <div className="absolute top-1/2 -translate-y-1/2 z-20" style={{ left: isCollapsed ? '0px' : 'calc(33.3333% - 20px)', transition: 'left 500ms ease-in-out' }}>
       <button
        onClick={onToggle}
        className={`w-10 h-10 rounded-full border shadow-lg flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${currentTheme.bg} ${currentTheme.border}`}
        aria-label={isCollapsed ? 'Expand Panel' : 'Collapse Panel'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${currentTheme.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
};

export default PanelToggleButton;
