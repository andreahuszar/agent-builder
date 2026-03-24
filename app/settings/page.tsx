'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/app/components/AppLayout';
import AgentBuilderPage from '@/app/components/agentbuilder/AgentBuilderPage';
import APAutomationGeneralSettings from '@/app/components/settings/APAutomationGeneralSettings';
import { BackTestPanel, useBackTestActive } from '@/app/components/agentbuilder/BackTestPanel';
import { useToast } from '@/app/components/ui/Toast';

interface SettingsContentProps {
  currentView?: string;
}

function SettingsContent({ currentView = 'automation' }: SettingsContentProps) {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('newAgent') === 'true') return 'agent-builder-2'
      const hash = window.location.hash
      if (hash.includes('back-testing')) return 'back-testing'
      if (hash.includes('agent-builder-2')) return 'agent-builder-2'
      if (hash.includes('general-settings')) return 'general-settings'
      if (hash.includes('documents')) return 'documents'
    }
    return 'dashboard'
  });
  const backTestActive = useBackTestActive();
  const { showToast } = useToast();

  // Check hash and URL params on mount and when they change
  useEffect(() => {
    const updateSubTabFromHash = () => {
      // Check if we're creating a new agent (URL param takes priority)
      const params = new URLSearchParams(window.location.search);
      const isNewAgent = params.get('newAgent') === 'true';
      
      if (isNewAgent) {
        console.log('[Settings] Detected newAgent param, switching to agent-builder-2');
        setActiveSubTab('agent-builder-2');
        return;
      }
      
      // Otherwise, check hash for navigation
      const hash = window.location.hash;
      if (hash.includes('general-settings')) {
        setActiveSubTab('general-settings');
      } else if (hash.includes('back-testing')) {
        setActiveSubTab('back-testing');
      } else if (hash.includes('dashboard')) {
        setActiveSubTab('dashboard');
      } else if (hash.includes('agent-builder-2')) {
        setActiveSubTab('agent-builder-2');
      } else if (hash.includes('documents')) {
        setActiveSubTab('documents');
      }
    };

    // Listen for back-test-tab-switch event from AgentBuilder2
    const onBackTestTabSwitch = () => {
      setActiveSubTab('back-testing');
      window.history.pushState({}, '', `/settings#${currentView}-back-testing`);
    };

    // When user clicks "Run New Test" in BackTestPanel, go back to Agent Builder
    const onRunNew = () => {
      setActiveSubTab('agent-builder-2');
      window.history.pushState({}, '', `/settings#${currentView}-agent-builder-2`);
    };

    // Toast notification when a back test completes
    const onBackTestComplete = (e: Event) => {
      const { agentName } = (e as CustomEvent).detail ?? {}
      showToast(
        `Back test complete${agentName ? `: ${agentName}` : ''}`,
        'success',
        {
          label: 'View results →',
          onClick: () => {
            setActiveSubTab('back-testing');
            window.history.pushState({}, '', `/settings#${currentView}-back-testing`);
          },
        },
        8000
      );
    };

    // Run on mount
    updateSubTabFromHash();

    window.addEventListener('hashchange', updateSubTabFromHash);
    window.addEventListener('back-test-tab-switch', onBackTestTabSwitch);
    window.addEventListener('back-test-run-new', onRunNew);
    window.addEventListener('back-test-complete', onBackTestComplete);

    return () => {
      window.removeEventListener('hashchange', updateSubTabFromHash);
      window.removeEventListener('back-test-tab-switch', onBackTestTabSwitch);
      window.removeEventListener('back-test-run-new', onRunNew);
      window.removeEventListener('back-test-complete', onBackTestComplete);
    };
  }, [currentView, showToast]);

  const handleSubTabChange = (subTab: string) => {
    setActiveSubTab(subTab);
    window.history.pushState({}, '', `/settings#${currentView}-${subTab}`);
  };

  // Render different content based on the active tab
  switch (currentView) {
    case 'automation':
      return (
        <div className="w-full h-full flex flex-col">
          {/* Secondary Tab Navigation */}
          <div className="border-b border-gray-200 bg-white px-6">
            <nav className="flex space-x-8" aria-label="Sub navigation">
              <button
                onClick={() => handleSubTabChange('dashboard')}
                className={`${
                  activeSubTab === 'dashboard'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleSubTabChange('agent-builder-2')}
                className={`${
                  activeSubTab === 'agent-builder-2'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Agent Builder
              </button>
              <button
                onClick={() => handleSubTabChange('back-testing')}
                className={`${
                  activeSubTab === 'back-testing'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors flex items-center gap-1.5`}
              >
                Back Testing
                {backTestActive && (
                    <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                )}
              </button>
              <button
                onClick={() => handleSubTabChange('documents')}
                className={`${
                  activeSubTab === 'documents'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Documents
              </button>
              <button
                onClick={() => handleSubTabChange('general-settings')}
                className={`${
                  activeSubTab === 'general-settings'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                General Settings
              </button>
            </nav>
          </div>

          {/* Sub-tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeSubTab === 'general-settings' && <div className="h-full overflow-auto"><APAutomationGeneralSettings /></div>}
            {activeSubTab === 'dashboard' && <div className="h-full overflow-auto"><AgentBuilderPage key="dashboard" hideNavigation={true} defaultMode="executive-dashboard" lockMode={true} /></div>}
            {/* AgentBuilderPage stays mounted while back-testing is active so the test keeps running */}
            <div className={`h-full ${activeSubTab === 'agent-builder-2' || activeSubTab === 'back-testing' ? '' : 'hidden'}`}>
              <AgentBuilderPage key="builder2" hideNavigation={true} defaultMode="build2" />
            </div>
            {/* BackTestPanel is ALWAYS mounted (never unmounted) so it never misses events */}
            <div className={`absolute inset-0 flex flex-col bg-gray-50 overflow-hidden ${activeSubTab !== 'back-testing' ? 'hidden' : ''}`}>
              <BackTestPanel />
            </div>
            {activeSubTab === 'documents' && <div className="h-full overflow-auto"><AgentBuilderPage key="documents" hideNavigation={true} defaultMode="documents" /></div>}
          </div>
        </div>
      );
    
    case 'transactions':
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-950 mb-4">Transactions Settings</h2>
          <p className="text-gray-600">Transactions settings will be available soon.</p>
        </div>
      );
    
    case 'statements':
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-950 mb-4">Statements Settings</h2>
          <p className="text-gray-600">Statements settings will be available soon.</p>
        </div>
      );
    
    case 'vendors':
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-950 mb-4">Vendors Settings</h2>
          <p className="text-gray-600">Vendors settings will be available soon.</p>
        </div>
      );
    
    case 'helpdesk':
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-950 mb-4">Helpdesk Settings</h2>
          <p className="text-gray-600">Helpdesk settings will be available soon.</p>
        </div>
      );
    
    case 'accounts':
      return (
        <div className="p-8">
          <h2 className="text-2xl font-bold text-gray-950 mb-4">Accounts Settings</h2>
          <p className="text-gray-600">Accounts settings will be available soon.</p>
        </div>
      );
    
    default:
      return (
        <div className="w-full h-full flex flex-col">
          {/* Secondary Tab Navigation */}
          <div className="border-b border-gray-200 bg-white px-6">
            <nav className="flex space-x-8" aria-label="Sub navigation">
              <button
                onClick={() => handleSubTabChange('general-settings')}
                className={`${
                  activeSubTab === 'general-settings'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                General Settings
              </button>
              <button
                onClick={() => handleSubTabChange('dashboard')}
                className={`${
                  activeSubTab === 'dashboard'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleSubTabChange('agent-builder-2')}
                className={`${
                  activeSubTab === 'agent-builder-2'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Agent Builder
              </button>
              <button
                onClick={() => handleSubTabChange('back-testing')}
                className={`${
                  activeSubTab === 'back-testing'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors flex items-center gap-1.5`}
              >
                Back Testing
                {backTestActive && (
                    <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                )}
              </button>
              <button
                onClick={() => handleSubTabChange('documents')}
                className={`${
                  activeSubTab === 'documents'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Documents
              </button>
            </nav>
          </div>

          {/* Sub-tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeSubTab === 'general-settings' && <div className="h-full overflow-auto"><APAutomationGeneralSettings /></div>}
            {activeSubTab === 'dashboard' && <div className="h-full overflow-auto"><AgentBuilderPage hideNavigation={true} defaultMode="executive-dashboard" lockMode={true} /></div>}
            <div className={`h-full ${activeSubTab === 'agent-builder-2' || activeSubTab === 'back-testing' ? '' : 'hidden'}`}>
              <AgentBuilderPage key="builder2" hideNavigation={true} defaultMode="build2" />
            </div>
            {/* BackTestPanel is ALWAYS mounted (never unmounted) so it never misses events */}
            <div className={`absolute inset-0 flex flex-col bg-gray-50 overflow-hidden ${activeSubTab !== 'back-testing' ? 'hidden' : ''}`}>
              <BackTestPanel />
            </div>
            {activeSubTab === 'documents' && <div className="h-full overflow-auto"><AgentBuilderPage key="documents" hideNavigation={true} defaultMode="documents" /></div>}
          </div>
        </div>
      );
  }
}

export default function SettingsPage() {
  return (
    <AppLayout activeModule="settings">
      <SettingsContent />
    </AppLayout>
  );
}
