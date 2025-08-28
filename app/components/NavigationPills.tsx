'use client';

import React, { memo } from 'react';
import { TabItem } from '@/app/constants/navigation';
import { announceToScreenReader } from '@/app/utils/accessibility';

interface NavigationPillsProps {
  items: TabItem[];
  activeView: string;
  onViewChange: (view: string) => void;
  className?: string;
}

const NavigationPills: React.FC<NavigationPillsProps> = memo(({
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
            onClick={() => {
              onViewChange(tab.id);
              announceToScreenReader(`Switched to ${tab.label} view`);
            }}
            className={`${
              activeView === tab.id
                ? 'bg-purple-900 text-white'
                : 'text-gray-900 hover:bg-gray-100 hover:text-gray-950'
            } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
            aria-current={activeView === tab.id ? 'page' : undefined}
            aria-label={`${tab.label} ${activeView === tab.id ? '(current)' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
});

NavigationPills.displayName = 'NavigationPills';

export default NavigationPills;