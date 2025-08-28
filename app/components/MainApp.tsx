'use client';

import React, { useState } from 'react';
import Navigation from './Navigation';
import TopBar from './TopBar';
import { MODULE_PILLS } from '@/app/constants/navigation';

export default function MainApp() {
  // Track which module is active (default to invoice-processing)
  const [activeModule] = useState<string>('invoice-processing');
  // TODO: Pass setActiveModule to Navigation component when implementing module switching
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Get pills for the active module
  const currentPills = MODULE_PILLS[activeModule] || MODULE_PILLS['invoice-processing'];

  const handleViewChange = (view: string) => {
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
        {/* Top Bar with Navigation Pills */}
        <TopBar
          pills={currentPills}
          activeView={currentView}
          onViewChange={handleViewChange}
        />
        
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