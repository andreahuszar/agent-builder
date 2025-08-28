'use client';

import React from 'react';
import NavigationPills from './NavigationPills';
import UserMenu from './UserMenu';
import { TabItem } from '@/app/constants/navigation';

interface TopBarProps {
  pills: TabItem[];
  activeView: string;
  onViewChange: (view: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  pills,
  activeView,
  onViewChange,
}) => {
  return (
    <div className="border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center">
          {/* Navigation Pills */}
          <NavigationPills
            items={pills}
            activeView={activeView}
            onViewChange={onViewChange}
          />
          
          {/* User Menu */}
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;