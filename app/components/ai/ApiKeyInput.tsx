'use client';

import { useState, useCallback } from 'react';
import { Eye, EyeOff, Key, CheckCircle, XCircle } from 'lucide-react';
import { useOpenAI } from '@/app/hooks/useOpenAI';

interface ApiKeyInputProps {
  onValidated?: (valid: boolean) => void;
  className?: string;
}

export function ApiKeyInput({ onValidated, className = '' }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validated, setValidated] = useState<boolean | null>(null);
  const { validateApiKey, loading, error } = useOpenAI();

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
    } catch {
      setValidated(false);
      onValidated?.(false);
    }
  }, [apiKey, validateApiKey, onValidated]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setValidated(null); // Reset validation when key changes
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
          OpenAI API Key
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Key className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showKey ? 'text' : 'password'}
            id="api-key"
            value={apiKey}
            onChange={handleKeyChange}
            placeholder="sk-..."
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

      <button
        onClick={handleValidate}
        disabled={loading || !apiKey.trim()}
        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
          ${loading || !apiKey.trim()
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
          }`}
      >
        {loading ? 'Validating...' : 'Validate API Key'}
      </button>
    </div>
  );
}