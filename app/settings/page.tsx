'use client';

import React from 'react';
import AppLayout from '@/app/components/AppLayout';
import AgentBuilderPage from '@/app/components/agentbuilder/AgentBuilderPage';

interface SettingsContentProps {
  currentView?: string;
}

function SettingsContent({ currentView = 'automation' }: SettingsContentProps) {
  // Render different content based on the active tab
  switch (currentView) {
    case 'automation':
      return (
        <div className="w-full h-full">
          <AgentBuilderPage hideNavigation={true} defaultMode="observe" />
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
        <div className="w-full h-full">
          <AgentBuilderPage hideNavigation={true} defaultMode="observe" />
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
