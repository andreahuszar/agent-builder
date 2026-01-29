'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppLayout from '@/app/components/AppLayout';
import AgentBuilderPage from '@/app/components/agentbuilder/AgentBuilderPage';

// Tab type definition
type SettingsTab = 'transactions' | 'statements' | 'vendors' | 'helpdesk' | 'accounts' | 'ap-automation';

interface TabConfig {
  id: SettingsTab;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'statements', label: 'Statements' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'helpdesk', label: 'Helpdesk' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'ap-automation', label: 'AP Automation' },
];

// Placeholder component for tabs that aren't implemented yet
function PlaceholderContent({ tabName }: { tabName: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{tabName} Settings</h2>
        <p className="text-gray-600">Settings for {tabName.toLowerCase()} will be available soon.</p>
      </div>
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('ap-automation');

  // Read tab from URL on mount and when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab') as SettingsTab;
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    router.push(`/settings?tab=${tabId}`, { scroll: false });
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 border-b border-gray-200 bg-white">
        <h1 className="text-2xl font-bold text-gray-950">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your platform configuration and preferences</p>
      </div>

      {/* Horizontal Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="px-4 sm:px-6 lg:px-8 flex space-x-8" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-50/60 min-h-screen">
        {activeTab === 'transactions' && <PlaceholderContent tabName="Transactions" />}
        {activeTab === 'statements' && <PlaceholderContent tabName="Statements" />}
        {activeTab === 'vendors' && <PlaceholderContent tabName="Vendors" />}
        {activeTab === 'helpdesk' && <PlaceholderContent tabName="Helpdesk" />}
        {activeTab === 'accounts' && <PlaceholderContent tabName="Accounts" />}
        {activeTab === 'ap-automation' && (
          <div className="w-full">
            <AgentBuilderPage />
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout activeModule="settings" hideNavigation={false}>
      <SettingsContent />
    </AppLayout>
  );
}
