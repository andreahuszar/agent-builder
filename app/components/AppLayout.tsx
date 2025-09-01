'use client';

import React, { useState } from 'react';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { MODULE_PILLS } from '@/app/constants/navigation';

interface AppLayoutProps {
  activeModule: string;
  children: React.ReactNode;
}

export default function AppLayout({ activeModule, children }: AppLayoutProps) {
  const [currentModule, setCurrentModule] = useState<string>(activeModule);
  const [currentView, setCurrentView] = useState<string>(() => {
    // Set initial view to the first pill of the module
    const pills = MODULE_PILLS[activeModule];
    return pills && pills.length > 0 ? pills[0].id : '';
  });

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

  return (
    <div className="flex min-h-screen bg-gray-50/60">
      {/* Navigation Sidebar */}
      <Navigation 
        activeModule={currentModule}
        onModuleChange={handleModuleChange}
      />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Top Bar with Navigation Pills */}
        <TopBar
          pills={currentPills}
          activeView={currentView}
          onViewChange={handleViewChange}
        />
        
        {/* Main Content */}
        <main id="main-content" className="flex-1 pb-8">
          {React.cloneElement(children as React.ReactElement<{ currentView?: string; currentModule?: string }>, { 
            currentView,
            currentModule 
          })}
        </main>
      </div>
    </div>
  );
}