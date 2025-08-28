'use client';

import React from 'react';
import { TabItem } from '@/app/constants/navigation';

interface NavigationPillsProps {
  items: TabItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}

const NavigationPills: React.FC<NavigationPillsProps> = ({
  items,
  activeView,
  onViewChange,
  className = '',
}) => {
  return (
    <nav className={`flex flex-1 justify-start ${className}`} aria-label="Tabs">
      <div className="flex space-x-2">
        {items.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className={`${
              activeView === tab.id
                ? 'bg-purple-900 text-white'
                : 'text-gray-900 hover:bg-gray-100 hover:text-gray-950'
            } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
            aria-current={activeView === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default NavigationPills;