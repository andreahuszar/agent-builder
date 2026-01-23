'use client';

import React, { useState, useEffect } from 'react';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { MODULE_PILLS } from '@/app/constants/navigation';
import { getPOVisibilityPreference, getLaunchpadVisibilityPreference, getExceptionNavigationPreference } from '@/app/utils/cookies';

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
  const [exceptionNavigation, setExceptionNavigation] = useState(true);

  // Initialize with default view - Invoices for invoice-processing, first pill for others
  const pills = MODULE_PILLS[activeModule];
  const defaultView = activeModule === 'invoice-processing' ? 'invoices' :
                      (pills && pills.length > 0 ? pills[0].id : '');
  const [currentView, setCurrentView] = useState<string>(defaultView);

  // Get pills for the active module and filter based on visibility preferences
  const currentPills = React.useMemo(() => {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppLayout.tsx:29',message:'Computing currentPills',data:{currentModule},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion
    let pills = MODULE_PILLS[currentModule] || [];
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppLayout.tsx:32',message:'Got pills from MODULE_PILLS',data:{pillsCount:pills.length,currentModule},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion

    if (currentModule === 'invoice-processing') {
      // Create a copy of pills to modify
      pills = pills.map(pill => ({ ...pill }));

      // Change "Invoices" to "Exceptions" when exception navigation is on
      if (exceptionNavigation) {
        const invoicesPill = pills.find(p => p.id === 'invoices');
        if (invoicesPill) {
          invoicesPill.label = 'Exceptions';
        }
      }

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

    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppLayout.tsx:62',message:'Returning filtered pills',data:{finalPillsCount:pills.length,pillIds:pills.map(p=>p.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    }
    // #endregion
    return pills;
  }, [currentModule, poVisibility, launchpadVisibility, exceptionNavigation]);

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

    const exceptionPreference = getExceptionNavigationPreference();
    setExceptionNavigation(exceptionPreference);
  }, []);

  // Listen for exception navigation preference changes
  useEffect(() => {
    const handleExceptionNavigationChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ value: boolean }>;
      setExceptionNavigation(customEvent.detail.value);
    };

    window.addEventListener('exceptionNavigationChanged', handleExceptionNavigationChange);

    return () => {
      window.removeEventListener('exceptionNavigationChanged', handleExceptionNavigationChange);
    };
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
      <div className="flex flex-1 flex-col h-screen overflow-hidden">
        {/* Top Bar with Navigation Pills or Custom Top Bar */}
        {customTopBar ? customTopBar : (
          <TopBar
            pills={currentPills}
            activeView={currentView}
            onViewChange={handleViewChange}
          />
        )}

        {/* Main Content */}
        <main id="main-content" className="flex-1 overflow-y-auto">
          {customTopBar ? children :
            React.isValidElement(children) && typeof children.type !== 'string'
              ? React.cloneElement(children as React.ReactElement<{ currentView?: string; currentModule?: string; useExceptionNavigation?: boolean }>, {
                  currentView,
                  currentModule,
                  useExceptionNavigation: exceptionNavigation
                })
              : children
          }
        </main>
      </div>
    </div>
  );
}