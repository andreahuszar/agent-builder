'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
  // usePathname() reads from Next.js router state (always the committed, correct
  // pathname) rather than window.location which can lag in Concurrent Mode.
  const pathname = usePathname();

  const [currentModule, setCurrentModule] = useState<string>(activeModule);
  const [poVisibility, setPOVisibility] = useState(false);
  const [launchpadVisibility, setLaunchpadVisibility] = useState(false);
  const [exceptionNavigation, setExceptionNavigation] = useState(true);

  // Initialize currentView from the current URL. Uses pathname from Next.js router
  // (immune to pushState race conditions) and window.location.hash for hash pills.
  // Skips pathname matching on '/' so the root SPA defaults to 'invoices' (Exceptions)
  // unless a hash explicitly points to a different pill (e.g. /#dashboard).
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const modulePills = MODULE_PILLS[activeModule] || [];
      const hash = window.location.hash; // '#dashboard', '#all-invoices', etc.

      // Hash match takes priority (most specific)
      if (hash) {
        for (const pill of modulePills) {
          if (pill.href.includes('#')) {
            const [, pillHash] = pill.href.split('#');
            if (hash === `#${pillHash}`) return pill.id;
          }
        }
      }

      // Pathname match — skip '/' to avoid ambiguity with the root SPA
      if (pathname && pathname !== '/') {
        for (const pill of modulePills) {
          if (!pill.href.includes('#') && pill.href === pathname) {
            return pill.id;
          }
        }
      }
    }
    // Fallback defaults
    if (activeModule === 'invoice-processing') return 'invoices';
    if (activeModule === 'settings') return 'automation';
    const fallbackPills = MODULE_PILLS[activeModule];
    return fallbackPills?.length ? fallbackPills[0].id : '';
  });

  // Get pills for the active module and filter based on visibility preferences
  const currentPills = React.useMemo(() => {
    let pills = MODULE_PILLS[currentModule] || [];

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