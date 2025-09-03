'use client';

import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { MODULE_PILLS } from '@/app/constants/navigation';

interface AppLayoutProps {
  activeModule: string;
  children: React.ReactNode;
  customTopBar?: React.ReactNode;
  hideNavigation?: boolean;
}

export default function AppLayout({ activeModule, children, customTopBar, hideNavigation = false }: AppLayoutProps) {
  const [currentModule, setCurrentModule] = useState<string>(activeModule);
  // Initialize with default view first, then update from hash after mount
  const pills = MODULE_PILLS[activeModule];
  const defaultView = pills && pills.length > 0 ? pills[0].id : '';
  const [currentView, setCurrentView] = useState<string>(defaultView);

  // Get pills for the active module
  const currentPills = MODULE_PILLS[currentModule] || [];

  const handleViewChange = (view: string) => {
    setCurrentView(view);
    // Update URL without navigation, preserving the current pathname
    window.history.pushState({}, '', `${window.location.pathname}#${view}`);
  };

  const handleModuleChange = (moduleId: string) => {
    setCurrentModule(moduleId);
    // Reset view to first pill of new module
    const pills = MODULE_PILLS[moduleId];
    if (pills && pills.length > 0) {
      setCurrentView(pills[0].id);
    }
  };

  // Check hash on mount and handle browser navigation (back/forward)
  useEffect(() => {
    // Check initial hash on mount
    const hash = window.location.hash.substring(1);
    if (hash) {
      const pills = MODULE_PILLS[currentModule];
      if (pills && pills.some(pill => pill.id === hash)) {
        setCurrentView(hash);
      }
    }

    // Handle hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        const pills = MODULE_PILLS[currentModule];
        if (pills && pills.some(pill => pill.id === hash)) {
          setCurrentView(hash);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentModule]);

  return (
    <div className="flex min-h-screen bg-gray-50/60">
      {/* Navigation Sidebar */}
      {!hideNavigation && (
        <Navigation 
          activeModule={currentModule}
          onModuleChange={handleModuleChange}
        />
      )}
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar with Navigation Pills or Custom Top Bar */}
        {customTopBar ? customTopBar : (
          <TopBar
            pills={currentPills}
            activeView={currentView}
            onViewChange={handleViewChange}
          />
        )}
        
        {/* Main Content */}
        <main id="main-content" className="flex-1 pb-8">
          {customTopBar ? children : 
            React.isValidElement(children) && typeof children.type !== 'string' 
              ? React.cloneElement(children as React.ReactElement<{ currentView?: string; currentModule?: string }>, { 
                  currentView,
                  currentModule 
                })
              : children
          }
        </main>
      </div>
    </div>
  );
}