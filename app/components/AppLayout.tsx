'use client';

import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { MODULE_PILLS } from '@/app/constants/navigation';
import { getPOVisibilityPreference, getLaunchpadVisibilityPreference } from '@/app/utils/cookies';

interface AppLayoutProps {
  activeModule: string;
  children: React.ReactNode;
  customTopBar?: React.ReactNode;
  hideNavigation?: boolean;
}

export default function AppLayout({ activeModule, children, customTopBar, hideNavigation = false }: AppLayoutProps) {
  const [currentModule, setCurrentModule] = useState<string>(activeModule);
  const [poVisibility, setPOVisibility] = useState(false);
  const [launchpadVisibility, setLaunchpadVisibility] = useState(false);

  // Initialize with default view - Invoices for invoice-processing, first pill for others
  const pills = MODULE_PILLS[activeModule];
  const defaultView = activeModule === 'invoice-processing' ? 'invoices' :
                      (pills && pills.length > 0 ? pills[0].id : '');
  const [currentView, setCurrentView] = useState<string>(defaultView);

  // Get pills for the active module and filter based on visibility preferences
  const currentPills = React.useMemo(() => {
    let pills = MODULE_PILLS[currentModule] || [];

    if (currentModule === 'invoice-processing') {
      // Filter based on visibility preferences
      pills = pills.filter(pill => {
        // Hide PO/GRs/Escalations when disabled
        if (!poVisibility && (
          pill.id === 'purchase-orders' ||
          pill.id === 'goods-receipts' ||
          pill.id === 'escalations'
        )) {
          return false;
        }
        // Hide Launchpad when disabled
        if (!launchpadVisibility && pill.id === 'launchpad') {
          return false;
        }
        return true;
      });
    }

    return pills;
  }, [currentModule, poVisibility, launchpadVisibility]);

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

  // Load visibility preferences on mount
  useEffect(() => {
    const poPreference = getPOVisibilityPreference();
    setPOVisibility(poPreference);

    const launchpadPreference = getLaunchpadVisibilityPreference();
    setLaunchpadVisibility(launchpadPreference);
  }, []);

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
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar with Navigation Pills or Custom Top Bar */}
        {customTopBar ? customTopBar : (
          <TopBar
            pills={currentPills}
            activeView={currentView}
            onViewChange={handleViewChange}
          />
        )}
        
        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-hidden">
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