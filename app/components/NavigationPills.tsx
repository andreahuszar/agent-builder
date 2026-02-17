'use client';

import React, { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');

  // Track hash changes
  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };
    
    updateHash(); // Set initial hash
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  return (
    <nav className={`flex flex-1 justify-start ${className}`} aria-label="Tabs">
      <div className="flex space-x-2">
        {items.map((tab) => {
          // Check if this is a hash-based navigation (contains #)
          const hasHash = tab.href.includes('#');
          
          let isActive = false;
          
          if (hasHash) {
            // For hash navigation, check if current URL matches (pathname + hash)
            const [basePath, hash] = tab.href.split('#');
            const targetPath = basePath || '/';
            isActive = pathname === targetPath && currentHash === `#${hash}`;
          } else {
            // For regular navigation, just check pathname
            isActive = pathname === tab.href;
          }
          
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => {
                onViewChange(tab.id);
                announceToScreenReader(`Navigated to ${tab.label}`);
              }}
              className={`${
                isActive
                  ? 'bg-purple-900 text-white'
                  : 'text-gray-900 hover:bg-gray-100 hover:text-gray-950'
              } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${tab.label} ${isActive ? '(current)' : ''}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

NavigationPills.displayName = 'NavigationPills';

export default NavigationPills;