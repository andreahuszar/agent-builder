'use client';

import { useState } from 'react';
import EnhancedInvoicesClient from '@/app/components/invoices/EnhancedInvoicesClient';

const TABS = [
  { id: 'needs-info', label: 'Needs info' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'in-approval', label: 'In approval' }
];

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('needs-info');

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-900 text-purple-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'needs-info' && (
          <EnhancedInvoicesClient initialInvoices={[]} initialTab="needs-info" />
        )}
        {activeTab === 'blocked' && (
          <EnhancedInvoicesClient initialInvoices={[]} initialTab="blocked" />
        )}
        {activeTab === 'in-approval' && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">In Approval</h3>
            <p className="text-gray-500">Content coming soon...</p>
          </div>
        )}
      </div>
    </div>
  );
}