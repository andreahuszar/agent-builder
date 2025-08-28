'use client';

import React, { useState } from 'react';
import Navigation from './Navigation';
import UserMenu from './UserMenu';
import { TAB_ITEMS, TabViewMode } from '@/app/constants/navigation';

export default function MainApp() {
  const [currentView, setCurrentView] = useState<TabViewMode>('dashboard');

  const handleViewChange = (view: TabViewMode) => {
    setCurrentView(view);
    // Update URL without navigation
    window.history.pushState({}, '', `#${view}`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50/60">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              {/* Navigation Pills */}
              <nav className="flex flex-1 justify-start" aria-label="Tabs">
                <div className="flex space-x-2">
                  {TAB_ITEMS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleViewChange(tab.id)}
                      className={`${
                        currentView === tab.id
                          ? 'bg-purple-900 text-white'
                          : 'text-gray-900 hover:bg-gray-100 hover:text-gray-950'
                      } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                      aria-current={currentView === tab.id ? 'page' : undefined}
                    >
                      {tab.label}
                    </button>
                  ))}
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
          {currentView === 'dashboard' && (
            <div className="w-full p-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <div className="mb-2">
                  <h1 className="text-2xl font-bold text-gray-950">Invoice Processing Dashboard</h1>
                  <p className="text-sm text-gray-800">Centralized workspace for intelligent invoice processing and workflow management</p>
                </div>
              </div>
            </div>
          )}
          {currentView === 'invoices' && (
            <div className="w-full p-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-950">Invoices</h1>
                <p className="text-sm text-gray-800">Manage and process your invoices</p>
              </div>
            </div>
          )}
          {currentView === 'purchase-orders' && (
            <div className="w-full p-4 sm:px-6 lg:px-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-950">Purchase Orders</h1>
                <p className="text-sm text-gray-800">View and manage purchase orders</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}