'use client';

import { useState, useEffect, useRef } from 'react';
import { Key, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { useAnthropic } from '@/app/hooks/useAnthropic';

interface AnthropicApiKeyInputProps {
  onValidated?: (valid: boolean) => void;
}

export function AnthropicApiKeyInput({ onValidated }: AnthropicApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
  const hasCheckedRef = useRef(false);

  const { loading, error, validateApiKey } = useAnthropic();

  // Load saved key from localStorage on mount - ONLY ONCE
  useEffect(() => {
    // Prevent multiple checks
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    const checkSavedKey = async () => {
      const saved = localStorage.getItem('anthropic_api_key');
      if (saved) {
        setSavedKey(saved);
        setApiKey(saved);
        // Auto-validate saved key ONCE
        try {
          const result = await validateApiKey(saved);
          setIsValid(result.valid);
          onValidated?.(result.valid);
          
          if (!result.valid) {
            // Clear invalid saved key
            localStorage.removeItem('anthropic_api_key');
            setSavedKey(null);
            setApiKey('');
          }
        } catch {
          setIsValid(false);
          onValidated?.(false);
        }
      }
      setIsInitialCheckDone(true);
    };
    
    checkSavedKey();
  }, []); // Empty dependency array - run only once on mount

  const handleValidate = async (keyToValidate?: string) => {
    const key = keyToValidate || apiKey;
    if (!key) return;

    try {
      const result = await validateApiKey(key);
      setIsValid(result.valid);
      onValidated?.(result.valid);
      
      if (result.valid) {
        // Save to localStorage
        localStorage.setItem('anthropic_api_key', key);
        setSavedKey(key);
      }
    } catch {
      setIsValid(false);
      onValidated?.(false);
    }
  };

  const handleClear = () => {
    setApiKey('');
    setIsValid(null);
    setSavedKey(null);
    localStorage.removeItem('anthropic_api_key');
    onValidated?.(false);
  };

  const handleManualRefresh = async () => {
    if (!apiKey) return;
    await handleValidate(apiKey);
  };

  // Show loading state only during the very first check
  if (!isInitialCheckDone && !hasCheckedRef.current) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-gray-500" />
          <label className="text-sm font-medium text-gray-700">
            Anthropic API Key
          </label>
        </div>
        <div className="h-10 animate-pulse bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">
          Anthropic API Key
        </label>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsValid(null);
            }}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
          />
          
          {/* Show/Hide toggle */}
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showKey ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        <button
          onClick={() => handleValidate()}
          disabled={!apiKey || loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Validate'
          )}
        </button>
        
        {savedKey && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      
      {/* Status message */}
      {isInitialCheckDone && isValid !== null && (
        <div className="space-y-2">
          <div className={`flex items-center justify-between text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
            <div className="flex items-center gap-2">
              {isValid ? (
                <>
                  <Check className="h-4 w-4" />
                  API key validated successfully
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  {error || 'Invalid API key'}
                </>
              )}
            </div>
            {savedKey && (
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:text-gray-400"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Checking...' : 'Recheck'}
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Info message */}
      <p className="text-xs text-gray-500">
        Enter your Anthropic API key to enable Claude AI features. Get your API key from{' '}
        <a 
          href="https://console.anthropic.com/api-keys" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-purple-600 hover:underline"
        >
          Anthropic Console
        </a>
      </p>
    </div>
  );
}