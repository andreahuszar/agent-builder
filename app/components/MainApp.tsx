'use client';

import React, { useState } from 'react';
import Navigation from './Navigation';
import UserMenu from './UserMenu';

type ViewMode = 'workspace' | 'invoices' | 'purchase-orders';

export default function MainApp({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewMode>('workspace');

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    // Update URL without navigation
    window.history.pushState({}, '', `#${view}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-14">
              {/* Navigation Pills */}
              <nav className="flex-1 flex justify-start" aria-label="Tabs">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleViewChange('workspace')}
                    className={`${
                      currentView === 'workspace'
                        ? 'bg-purple-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } px-3 py-1.5 rounded-full text-sm font-medium transition-colors`}
                  >
                    Workspace
                  </button>
                  <button
                    onClick={() => handleViewChange('invoices')}
                    className={`${
                      currentView === 'invoices'
                        ? 'bg-purple-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } px-3 py-1.5 rounded-full text-sm font-medium transition-colors`}
                  >
                    Invoices
                  </button>
                  <button
                    onClick={() => handleViewChange('purchase-orders')}
                    className={`${
                      currentView === 'purchase-orders'
                        ? 'bg-purple-900 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    } px-3 py-1.5 rounded-full text-sm font-medium transition-colors`}
                  >
                    Purchase Orders
                  </button>
                </div>
              </nav>
              
              {/* User Menu */}
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 pb-8">
          {currentView === 'workspace' && (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="mb-6">
                <div className="mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">Invoice Processing Workspace</h1>
                  <p className="text-sm text-gray-600">Centralized workspace for intelligent invoice processing and workflow management</p>
                </div>
              </div>
            </div>
          )}
          {currentView === 'invoices' && (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                <p className="text-sm text-gray-600">Manage and process your invoices</p>
              </div>
            </div>
          )}
          {currentView === 'purchase-orders' && (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                <p className="text-sm text-gray-600">View and manage purchase orders</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}