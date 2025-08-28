'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  NAV_ITEMS, 
  SETTINGS_NAV_ITEM, 
  SIDEBAR_EXPAND_DELAY, 
  SIDEBAR_WIDTH 
} from '@/app/constants/navigation';

const Navigation = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, SIDEBAR_EXPAND_DELAY);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExpanded(false);
  };

  // Common classes for nav items
  const getNavItemClasses = (isActive?: boolean) => {
    const baseClasses = 'flex items-center rounded-md transition-all duration-300 h-12 overflow-hidden';
    return isActive 
      ? `${baseClasses} bg-purple-900` 
      : `${baseClasses} hover:bg-purple-900/70`;
  };

  return (
    <div 
      className={`${SIDEBAR_WIDTH.COLLAPSED} relative shrink-0`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Overlay container */}
      <div className={`${
        isExpanded 
          ? `fixed left-0 top-0 z-[9999] h-screen ${SIDEBAR_WIDTH.EXPANDED} shadow-2xl` 
          : `sticky top-0 z-[9999] h-screen ${SIDEBAR_WIDTH.COLLAPSED}`
      } flex flex-col bg-brand-gradient text-white transition-all duration-300 ease-in-out`}>
        
        {/* Logo */}
        <div className="flex h-16 items-center px-4">
          <Link className="flex items-center" href="/">
            <Image 
              src="/xelix_logo_small.svg" 
              alt="Xelix" 
              width={32} 
              height={32} 
              className="shrink-0" 
              priority
            />
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col p-2">
          {/* Main navigation items */}
          <div className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.id}
                  className={getNavItemClasses(item.isActive)}
                  href={item.href}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center">
                    <Icon className="size-5 text-white" />
                  </div>
                  {isExpanded && (
                    <span className="overflow-hidden whitespace-nowrap pr-3 font-medium">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
          
          {/* Bottom section with Settings */}
          <div className="mt-2 border-t border-purple-800/50 pt-2">
            <Link 
              className={getNavItemClasses()}
              href={SETTINGS_NAV_ITEM.href}
            >
              <div className="flex size-12 shrink-0 items-center justify-center">
                <SETTINGS_NAV_ITEM.icon className="size-5 text-white" />
              </div>
              {isExpanded && (
                <span className="overflow-hidden whitespace-nowrap pr-3 font-medium">
                  {SETTINGS_NAV_ITEM.label}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Navigation;