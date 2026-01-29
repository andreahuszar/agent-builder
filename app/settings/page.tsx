'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/app/components/AppLayout';
import AgentBuilderPage from '@/app/components/agentbuilder/AgentBuilderPage';
import APAutomationGeneralSettings from '@/app/components/settings/APAutomationGeneralSettings';

interface SettingsContentProps {
  currentView?: string;
}

function SettingsContent({ currentView = 'automation' }: SettingsContentProps) {
  const [activeSubTab, setActiveSubTab] = useState('workflow');

  // Check hash on mount and when hash changes
  useEffect(() => {
    const updateSubTabFromHash = () => {
      const hash = window.location.hash;
      if (hash.includes('general-settings')) {
        setActiveSubTab('general-settings');
      } else if (hash.includes('dashboard')) {
        setActiveSubTab('dashboard');
      } else if (hash.includes('workflow')) {
        setActiveSubTab('workflow');
      } else if (hash.includes('agent-builder')) {
        setActiveSubTab('agent-builder');
      } else if (hash.includes('documents')) {
        setActiveSubTab('documents');
      }
    };

    // Run on mount
    updateSubTabFromHash();

    // Listen for hash changes
    window.addEventListener('hashchange', updateSubTabFromHash);

    // Cleanup
    return () => {
      window.removeEventListener('hashchange', updateSubTabFromHash);
    };
  }, []);

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
                onClick={() => handleSubTabChange('workflow')}
                className={`${
                  activeSubTab === 'workflow'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Workflow
              </button>
              <button
                onClick={() => handleSubTabChange('agent-builder')}
                className={`${
                  activeSubTab === 'agent-builder'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Agent Builder
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
          <div className="flex-1 overflow-auto">
            {activeSubTab === 'general-settings' && <APAutomationGeneralSettings />}
            {activeSubTab === 'dashboard' && <AgentBuilderPage hideNavigation={true} defaultMode="executive-dashboard" />}
            {activeSubTab === 'workflow' && <AgentBuilderPage hideNavigation={true} defaultMode="observe" />}
            {activeSubTab === 'agent-builder' && <AgentBuilderPage hideNavigation={true} defaultMode="build" />}
            {activeSubTab === 'documents' && <AgentBuilderPage hideNavigation={true} defaultMode="documents" />}
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
                onClick={() => handleSubTabChange('workflow')}
                className={`${
                  activeSubTab === 'workflow'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Workflow
              </button>
              <button
                onClick={() => handleSubTabChange('agent-builder')}
                className={`${
                  activeSubTab === 'agent-builder'
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium transition-colors`}
              >
                Agent Builder
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
          <div className="flex-1 overflow-auto">
            {activeSubTab === 'general-settings' && <APAutomationGeneralSettings />}
            {activeSubTab === 'dashboard' && <AgentBuilderPage hideNavigation={true} defaultMode="executive-dashboard" />}
            {activeSubTab === 'workflow' && <AgentBuilderPage hideNavigation={true} defaultMode="observe" />}
            {activeSubTab === 'agent-builder' && <AgentBuilderPage hideNavigation={true} defaultMode="build" />}
            {activeSubTab === 'documents' && <AgentBuilderPage hideNavigation={true} defaultMode="documents" />}
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
