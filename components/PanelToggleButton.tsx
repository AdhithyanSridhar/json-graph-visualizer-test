import React from 'react';

type Theme = 'light' | 'dark';

interface PanelToggleButtonProps {
  isCollapsed: boolean;
  togglePanel: () => void;
  theme: Theme;
}

const PanelToggleButton: React.FC<PanelToggleButtonProps> = ({ isCollapsed, togglePanel, theme }) => {
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
    <button
      onClick={togglePanel}
      className={`absolute top-1/2 -mt-5 z-20 hidden lg:flex items-center justify-center w-6 h-10 border rounded-r-lg cursor-pointer transition-all duration-300 ease-in-out ${currentTheme.bg} ${currentTheme.border}`}
      style={{ left: '100%' }}
      aria-label={isCollapsed ? 'Show JSON Panel' : 'Hide JSON Panel'}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-300 ${currentTheme.icon} ${isCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
      </svg>
    </button>
  );
};

export default PanelToggleButton;
