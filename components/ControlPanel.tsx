import React from 'react';
import { AppMode } from '../types';
import { Eye, Type, Users, Navigation, ShoppingBag } from 'lucide-react';

interface ControlPanelProps {
  currentMode: AppMode;
  onModeSelect: (mode: AppMode) => void;
  isProcessing: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ currentMode, onModeSelect, isProcessing }) => {
  const buttons = [
    { mode: AppMode.GENERAL, label: 'Describe Scene', icon: Eye, color: 'bg-blue-600' },
    { mode: AppMode.NAVIGATION, label: 'Navigation', icon: Navigation, color: 'bg-green-600' },
    { mode: AppMode.TEXT, label: 'Read Text', icon: Type, color: 'bg-orange-600' },
    { mode: AppMode.SOCIAL, label: 'Social Cues', icon: Users, color: 'bg-purple-600' },
    { mode: AppMode.SHOPPING, label: 'Shopping', icon: ShoppingBag, color: 'bg-pink-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 p-2">
      {buttons.map((btn) => {
        const isActive = currentMode === btn.mode;
        const Icon = btn.icon;
        
        return (
          <button
            key={btn.mode}
            onClick={() => onModeSelect(btn.mode)}
            disabled={isProcessing && isActive}
            className={`
              relative flex flex-col items-center justify-center p-4 md:p-6 rounded-xl transition-all duration-200
              ${isActive ? `${btn.color} ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-900 scale-[1.02]` : 'bg-gray-800 hover:bg-gray-700'}
              ${isActive ? 'text-white' : 'text-gray-300'}
              min-h-[120px] md:min-h-[140px] shadow-lg
            `}
            aria-pressed={isActive}
            aria-label={`${btn.label} Mode`}
          >
            <Icon size={32} className={`mb-3 ${isActive ? 'stroke-2' : 'stroke-1'}`} />
            <span className="text-lg md:text-xl font-bold text-center leading-tight">
              {btn.label}
            </span>
            {isActive && isProcessing && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ControlPanel;