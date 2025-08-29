'use client';

import { useState, useCallback, useEffect } from 'react';
import { Eye, EyeOff, Key, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useOpenAI } from '@/app/hooks/useOpenAI';

interface ApiKeyInputProps {
  onValidated?: (valid: boolean) => void;
  className?: string;
}

export function ApiKeyInput({ onValidated, className = '' }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validated, setValidated] = useState<boolean | null>(null);
  const [usingServerKey, setUsingServerKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { validateApiKey, checkConfiguration, loading, error } = useOpenAI();

  // Check for existing API key on mount
  useEffect(() => {
    let mounted = true;
    
    const checkExistingKey = async () => {
      if (!mounted) return;
      setIsLoading(true);
      
      try {
        // First check if server has API key configured
        const serverConfig = await checkConfiguration();
        
        if (!mounted) return;
        
        if (serverConfig && serverConfig.configured) {
          setUsingServerKey(true);
          setValidated(true);
          onValidated?.(true);
        } else {
          // Check localStorage for client-side API key
          const storedKey = localStorage.getItem('openai_api_key');
          if (storedKey && mounted) {
            setApiKey(storedKey);
            // Validate the stored key
            try {
              const result = await validateApiKey(storedKey);
              if (!mounted) return;
              
              if (result && result.valid) {
                setValidated(true);
                onValidated?.(true);
              } else {
                setValidated(false);
                // Clear invalid stored key
                localStorage.removeItem('openai_api_key');
                setApiKey('');
              }
            } catch {
              if (mounted) setValidated(false);
            }
          } else {
            // No server key and no stored key
            if (mounted) setValidated(false);
          }
        }
      } catch (err) {
        console.error('Error checking existing API key:', err);
        if (mounted) setValidated(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkExistingKey();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const handleValidate = useCallback(async () => {
    if (!apiKey.trim()) {
      setValidated(false);
      onValidated?.(false);
      return;
    }

    try {
      const result = await validateApiKey(apiKey);
      setValidated(result.valid);
      onValidated?.(result.valid);
      
      if (result.valid) {
        // Save to localStorage on successful validation
        localStorage.setItem('openai_api_key', apiKey);
        setUsingServerKey(false);
      }
    } catch {
      setValidated(false);
      onValidated?.(false);
    }
  }, [apiKey, validateApiKey, onValidated]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setValidated(null); // Reset validation when key changes
    setUsingServerKey(false); // User is entering their own key
  };

  const handleClearKey = () => {
    setApiKey('');
    setValidated(null);
    setUsingServerKey(false);
    localStorage.removeItem('openai_api_key');
    onValidated?.(false);
  };

  // Show loading state only on initial load
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="h-[72px]"> {/* Fixed height to prevent layout shift */}
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    );
  }

  // If using server key, show a different UI
  if (usingServerKey && !apiKey) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="min-h-[72px]"> {/* Fixed min-height to prevent layout shift */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Using Server API Key</p>
                <p className="text-xs text-green-600 mt-1">
                  OpenAI is configured with a server-side API key for enhanced security.
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setUsingServerKey(false)}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          Use a different API key
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          OpenAI API Key
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={handleKeyChange}
            placeholder="sk-..."
            tabIndex={0}
            className={`block w-full pl-10 pr-20 py-2 border rounded-md focus:ring-purple-500 focus:border-purple-500 ${
              validated === true
                ? 'border-green-500 bg-green-50'
                : validated === false
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300'
            }`}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-2">
            {validated === true && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {validated === false && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              {showKey ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Get your API key from{' '}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:text-purple-500"
          >
            OpenAI Platform
          </a>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={loading || !apiKey.trim()}
          className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${loading || !apiKey.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
            }`}
        >
          {loading ? 'Validating...' : validated ? 'Re-validate' : 'Validate API Key'}
        </button>
        {apiKey && validated && (
          <button
            onClick={handleClearKey}
            className="py-2 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}