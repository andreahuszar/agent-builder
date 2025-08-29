'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/app/components/AppLayout';
import { ApiKeyInput } from '@/app/components/ai/ApiKeyInput';
import { AnthropicApiKeyInput } from '@/app/components/ai/AnthropicApiKeyInput';
import { AIStatus } from '@/app/components/ai/AIStatus';
import { ChatInterface } from '@/app/components/ai/ChatInterface';
import { InvoiceScanner } from '@/app/components/ai/InvoiceScanner';
import { Brain, FileText, Sparkles } from 'lucide-react';

interface SettingsContentProps {
  currentView?: string;
  currentModule?: string;
}

function SettingsContent({ currentView = 'automation' }: SettingsContentProps) {
  const [showOpenAIChat, setShowOpenAIChat] = useState(false);
  const [showAnthropicFeatures, setShowAnthropicFeatures] = useState(false);
  const [activeAIProvider, setActiveAIProvider] = useState<'openai' | 'anthropic' | null>(null);

  // Prevent scroll restoration on tab switch
  useEffect(() => {
    if (activeAIProvider) {
      // Store current scroll position
      const scrollY = window.scrollY;
      // Use setTimeout to restore scroll after React renders
      setTimeout(() => {
        window.scrollTo(0, scrollY);
      }, 0);
    }
  }, [activeAIProvider]);

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {currentView === 'automation' ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">Automation Settings</h1>
            <p className="mt-1 text-sm text-gray-800">Configure automated workflows for invoice processing</p>
          </div>
          
          {/* Automation sections */}
          <div className="space-y-6">
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
      ) : currentView === 'admin' ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-950">Admin Settings</h1>
            <p className="mt-1 text-sm text-gray-800">Configure AI providers and system integrations</p>
          </div>
          
          {/* Admin sections */}
          <div className="space-y-6">
            {/* AI Provider Configuration */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Provider Configuration
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Choose and configure your preferred AI provider for invoice processing
          </p>
          
          {/* Provider Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveAIProvider('openai');
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeAIProvider === 'openai'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Sparkles className="inline-block mr-2 h-4 w-4" />
                OpenAI (GPT-4)
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setActiveAIProvider('anthropic');
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeAIProvider === 'anthropic'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="inline-block mr-2 h-4 w-4" />
                Anthropic (Claude + Vision)
              </button>
            </nav>
          </div>
          
          {/* OpenAI Configuration */}
          {activeAIProvider === 'openai' && (
            <div className="space-y-6">
              <AIStatus showDetails={true} />
              <div className="max-w-md">
                <ApiKeyInput 
                  onValidated={(valid) => {
                    if (valid) {
                      setShowOpenAIChat(true);
                    }
                  }}
                />
              </div>
              {showOpenAIChat && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Test OpenAI Chat</h3>
                  <ChatInterface
                    systemPrompt="You are a helpful AI assistant for invoice processing. Help users understand how to process invoices, extract data, and automate workflows."
                    placeholder="Ask about invoice processing..."
                    height="h-64"
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Anthropic Configuration */}
          {activeAIProvider === 'anthropic' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Claude Vision enabled!</strong> You can now scan and extract invoice data from images.
                </p>
              </div>
              <div className="max-w-md">
                <AnthropicApiKeyInput 
                  onValidated={(valid) => {
                    setShowAnthropicFeatures(valid);
                  }}
                />
              </div>
              {showAnthropicFeatures && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-gray-900">Invoice Scanner (Vision)</h3>
                  <InvoiceScanner 
                    onExtracted={(data) => {
                      console.log('Extracted invoice data:', data);
                    }}
                    onSave={(data) => {
                      console.log('Saving invoice data:', data);
                      alert('Invoice data extracted successfully!');
                    }}
                  />
                </div>
              )}
            </div>
          )}
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