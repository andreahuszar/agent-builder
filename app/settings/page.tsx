'use client';

import { useState } from 'react';
import AppLayout from '@/app/components/AppLayout';
import { ApiKeyInput } from '@/app/components/ai/ApiKeyInput';
import { AIStatus } from '@/app/components/ai/AIStatus';
import { ChatInterface } from '@/app/components/ai/ChatInterface';

interface SettingsContentProps {
  currentView?: string;
  currentModule?: string;
}

function SettingsContent({}: SettingsContentProps) {
  const [showChat, setShowChat] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState(false);

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950">Automation Settings</h1>
        <p className="mt-1 text-sm text-gray-800">Configure automated workflows and rules</p>
      </div>
      
      {/* Settings sections */}
      <div className="space-y-6">
        {/* OpenAI Configuration Section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">AI Configuration</h2>
          <p className="mb-4 text-sm text-gray-600">Connect to OpenAI for intelligent invoice processing</p>
          
          <div className="space-y-6">
            {/* Status Indicator */}
            <AIStatus showDetails={true} />
            
            {/* API Key Input */}
            <div className="max-w-md">
              <ApiKeyInput 
                onValidated={(valid) => {
                  setApiKeyValid(valid);
                  if (valid) {
                    setShowChat(true);
                  }
                }}
              />
            </div>
            
            {/* Test Chat Interface */}
            {showChat && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-gray-900">Test AI Assistant</h3>
                <ChatInterface
                  systemPrompt="You are a helpful AI assistant for invoice processing. Help users understand how to process invoices, extract data, and automate workflows."
                  placeholder="Ask about invoice processing..."
                  height="h-64"
                />
              </div>
            )}
          </div>
        </div>
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