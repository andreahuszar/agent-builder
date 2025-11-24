'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/app/components/AppLayout';
import {
  getChartsInDrawerPreference,
  setChartsInDrawerPreference,
  getPOVisibilityPreference,
  setPOVisibilityPreference,
  getLaunchpadVisibilityPreference,
  setLaunchpadVisibilityPreference,
  getExceptionNavigationPreference,
  setExceptionNavigationPreference,
  getInvoiceAgentPreference,
  setInvoiceAgentPreference
} from '@/app/utils/cookies';

interface SettingsContentProps {
  currentView?: string;
  currentModule?: string;
}

function SettingsContent({ currentView = 'settings' }: SettingsContentProps) {
  const [chartsInDrawer, setChartsInDrawerState] = useState(false);
  const [poVisibility, setPOVisibilityState] = useState(false);
  const [launchpadVisibility, setLaunchpadVisibilityState] = useState(false);
  const [exceptionNavigation, setExceptionNavigationState] = useState(true);
  const [invoiceAgent, setInvoiceAgentState] = useState(false);

  // Load preferences from cookies on mount
  useEffect(() => {
    const chartsPreference = getChartsInDrawerPreference();
    setChartsInDrawerState(chartsPreference);

    const poPreference = getPOVisibilityPreference();
    setPOVisibilityState(poPreference);

    const launchpadPreference = getLaunchpadVisibilityPreference();
    setLaunchpadVisibilityState(launchpadPreference);

    const exceptionPreference = getExceptionNavigationPreference();
    setExceptionNavigationState(exceptionPreference);

    const invoiceAgentPreference = getInvoiceAgentPreference();
    setInvoiceAgentState(invoiceAgentPreference);
  }, []);

  // Handle toggle change for charts
  const handleToggleChange = () => {
    const newValue = !chartsInDrawer;
    setChartsInDrawerState(newValue);
    setChartsInDrawerPreference(newValue);
  };

  // Handle toggle change for PO/GRs/Escalations visibility
  const handlePOVisibilityToggle = () => {
    const newValue = !poVisibility;
    setPOVisibilityState(newValue);
    setPOVisibilityPreference(newValue);
  };

  // Handle toggle change for Launchpad visibility
  const handleLaunchpadVisibilityToggle = () => {
    const newValue = !launchpadVisibility;
    setLaunchpadVisibilityState(newValue);
    setLaunchpadVisibilityPreference(newValue);
  };

  // Handle toggle change for Exception Navigation
  const handleExceptionNavigationToggle = () => {
    const newValue = !exceptionNavigation;
    setExceptionNavigationState(newValue);
    setExceptionNavigationPreference(newValue);
  };

  // Handle toggle change for Invoice Agent
  const handleInvoiceAgentToggle = () => {
    const newValue = !invoiceAgent;
    setInvoiceAgentState(newValue);
    setInvoiceAgentPreference(newValue);
  };

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {(currentView === 'automation' || currentView === 'settings') ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">General Settings</h1>
            <p className="mt-1 text-sm text-gray-800">Customize display preferences, automation workflows, and system behavior</p>
          </div>

          {/* Settings sections */}
          <div className="space-y-6">
            {/* Display Settings */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Display Settings</h2>
              <p className="mb-4 text-sm text-gray-600">Customize the display of invoice management features</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded bg-gray-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Charts in a drawer</span>
                    <p className="text-xs text-gray-500 mt-1">(on invoice management page)</p>
                  </div>
                  <button
                    onClick={handleToggleChange}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      chartsInDrawer ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={chartsInDrawer}
                    aria-label="Toggle charts in drawer"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        chartsInDrawer ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">PO/GRs/Escalations list visibility</span>
                    <p className="text-xs text-gray-500 mt-1">Show Purchase Orders, Goods Receipts, and Escalations in top menu</p>
                  </div>
                  <button
                    onClick={handlePOVisibilityToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      poVisibility ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={poVisibility}
                    aria-label="Toggle PO/GRs/Escalations visibility"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        poVisibility ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Launchpad (concept)</span>
                    <p className="text-xs text-gray-500 mt-1">Show Launchpad concept in top navigation menu</p>
                  </div>
                  <button
                    onClick={handleLaunchpadVisibilityToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      launchpadVisibility ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={launchpadVisibility}
                    aria-label="Toggle Launchpad visibility"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        launchpadVisibility ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Invoice navigation by exception/approval</span>
                    <p className="text-xs text-gray-500 mt-1">Focus on exceptions with separate PO/Non-PO tabs</p>
                  </div>
                  <button
                    onClick={handleExceptionNavigationToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      exceptionNavigation ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={exceptionNavigation}
                    aria-label="Toggle exception navigation"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        exceptionNavigation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Enable Invoice Agent</span>
                    <p className="text-xs text-gray-500 mt-1">Show AI Agent button on invoice detail pages</p>
                  </div>
                  <button
                    onClick={handleInvoiceAgentToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      invoiceAgent ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                    aria-pressed={invoiceAgent}
                    aria-label="Toggle Invoice Agent"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        invoiceAgent ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Workflow Automation */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Workflow Automation</h2>
              <p className="mb-4 text-sm text-gray-600">Set up automated actions for invoice processing</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-sm text-gray-700">Auto-approve invoices under $1,000</span>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-sm text-gray-700">Route invoices by vendor category</span>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>
              </div>
            </div>

            {/* Email Integration */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Email Integration</h2>
              <p className="mb-4 text-sm text-gray-600">Automatically process invoices from email</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-sm text-gray-700">Email forwarding rules</span>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>
                <div className="flex items-center justify-between rounded bg-gray-50 p-3">
                  <span className="text-sm text-gray-700">Automatic attachment extraction</span>
                  <span className="text-xs text-gray-500">Coming soon</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AppLayout activeModule="settings">
      <SettingsContent />
    </AppLayout>
  );
}