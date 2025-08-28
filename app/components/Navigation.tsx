'use client';

import React, { useState, useRef, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  NAV_ITEMS, 
  SETTINGS_NAV_ITEM, 
  SIDEBAR_EXPAND_DELAY, 
  SIDEBAR_WIDTH 
} from '@/app/constants/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { getNavItemAriaLabel, announceToScreenReader, getKeyboardShortcut } from '@/app/utils/accessibility';
import { useKeyboardNavigation } from '@/app/hooks/useKeyboardNavigation';

interface NavigationProps {
  activeModule?: string;
  onModuleChange?: (moduleId: string) => void;
}

const Navigation = memo(({ activeModule = 'invoice-processing', onModuleChange }: NavigationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [clickedDisabledItem, setClickedDisabledItem] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Enable keyboard navigation
  useKeyboardNavigation({ onModuleChange });

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
      announceToScreenReader('Navigation menu expanded');
    }, SIDEBAR_EXPAND_DELAY);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsExpanded(false);
    announceToScreenReader('Navigation menu collapsed');
  };

  // Common classes for nav items
  const getNavItemClasses = (isActive?: boolean) => {
    const baseClasses = 'flex items-center rounded-md transition-all duration-300 h-12 overflow-hidden';
    return isActive 
      ? `${baseClasses} bg-purple-900` 
      : `${baseClasses} hover:bg-purple-900/70`;
  };

  const handleNavClick = (e: React.MouseEvent, item: typeof NAV_ITEMS[0]) => {
    if (item.isDisabled) {
      e.preventDefault();
    } else if (onModuleChange) {
      onModuleChange(item.id);
    }
  };

  const handleDisabledClick = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setClickedDisabledItem(itemId);
    
    // Clear any existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Reset after 800ms
    clickTimeoutRef.current = setTimeout(() => {
      setClickedDisabledItem(null);
    }, 800);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div 
        className={`${SIDEBAR_WIDTH.COLLAPSED} relative shrink-0`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {/* Overlay container */}
      <nav 
        id="main-navigation"
        role="navigation"
        aria-label="Main navigation"
        className={`${
          isExpanded 
            ? `fixed left-0 top-0 z-[9999] h-screen ${SIDEBAR_WIDTH.EXPANDED} shadow-2xl` 
            : `sticky top-0 z-[9999] h-screen ${SIDEBAR_WIDTH.COLLAPSED}`
        } flex flex-col bg-brand-gradient text-white transition-all duration-300 ease-in-out`}
      >
        
        {/* Logo */}
        <div className="flex h-16 items-center px-4">
          <Link className="flex items-center" href="/" aria-label="Xelix Home">
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
              const isActive = item.id === activeModule;
              const isClicked = clickedDisabledItem === item.id;
              
              if (item.isDisabled) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <button
                        className={
                          isClicked 
                            ? 'flex h-12 cursor-not-allowed items-center overflow-hidden rounded-md bg-red-500/20 transition-all duration-300'
                            : `${getNavItemClasses(isActive)} cursor-not-allowed transition-colors duration-300`
                        }
                        onClick={(e) => handleDisabledClick(e, item.id)}
                        aria-label={getNavItemAriaLabel(item.label, isActive, true)}
                        aria-disabled="true"
                      >
                        <div className="flex size-12 shrink-0 items-center justify-center">
                          <Icon className="size-5 text-white" />
                        </div>
                        {isExpanded && (
                          <span className="overflow-hidden whitespace-nowrap pr-3 font-medium">
                            {item.label}
                          </span>
                        )}
                        {!isExpanded && (
                          <span className="sr-only">{item.label}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={16}>
                      <p>Not implemented in prototype</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              const navIndex = NAV_ITEMS.indexOf(item) + 1;
              const shortcutKey = navIndex.toString();
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Link 
                      className={getNavItemClasses(isActive)}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      aria-label={getNavItemAriaLabel(item.label, isActive)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center">
                        <Icon className="size-5 text-white" />
                      </div>
                      {isExpanded && (
                        <span className="overflow-hidden whitespace-nowrap pr-3 font-medium">
                          {item.label}
                        </span>
                      )}
                      {!isExpanded && (
                        <span className="sr-only">{item.label}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={16}>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Shortcut</p>
                      <p className="text-sm font-medium">{getKeyboardShortcut(shortcutKey)}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          
          {/* Bottom section with Settings */}
          <div className="mt-2 border-t border-purple-800/50 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link 
                  className={getNavItemClasses(activeModule === 'settings')}
                  href={SETTINGS_NAV_ITEM.href}
                  onClick={() => {
                    if (onModuleChange) {
                      onModuleChange('settings');
                    }
                  }}
                  aria-label={getNavItemAriaLabel(SETTINGS_NAV_ITEM.label, activeModule === 'settings')}
                  aria-current={activeModule === 'settings' ? 'page' : undefined}
                >
                  <div className="flex size-12 shrink-0 items-center justify-center">
                    <SETTINGS_NAV_ITEM.icon className="size-5 text-white" />
                  </div>
                  {isExpanded && (
                    <span className="overflow-hidden whitespace-nowrap pr-3 font-medium">
                      {SETTINGS_NAV_ITEM.label}
                    </span>
                  )}
                  {!isExpanded && (
                    <span className="sr-only">{SETTINGS_NAV_ITEM.label}</span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={16}>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Shortcut</p>
                  <p className="text-sm font-medium">{getKeyboardShortcut('7')}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </nav>
      </nav>
    </div>
    </TooltipProvider>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if activeModule changes
  return prevProps.activeModule === nextProps.activeModule;
});

Navigation.displayName = 'Navigation';

export default Navigation;