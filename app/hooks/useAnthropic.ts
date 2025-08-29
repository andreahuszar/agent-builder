'use client';

import { useState, useCallback } from 'react';
import type { AnthropicMessage, AnthropicRequest } from '@/lib/anthropic';

interface UseAnthropicOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: any) => void;
}

export function useAnthropic(options: UseAnthropicOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateApiKey = useCallback(async (apiKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      
      if (!data.valid) {
        throw new Error(data.error || 'Invalid API key');
      }

      options.onSuccess?.(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to validate API key';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const checkConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic/validate');
      const data = await response.json();
      
      if (response.ok) {
        options.onSuccess?.(data);
        return data;
      }
      
      throw new Error(data.error || 'Failed to check configuration');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to check configuration';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const sendMessage = useCallback(async (
    messages: AnthropicMessage[],
    requestOptions?: Partial<AnthropicRequest>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          ...requestOptions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      options.onSuccess?.(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const streamMessage = useCallback(async function* (
    messages: AnthropicMessage[],
    requestOptions?: Partial<AnthropicRequest>
  ) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          stream: true,
          ...requestOptions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        yield chunk;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to stream message';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    loading,
    error,
    validateApiKey,
    checkConfiguration,
    sendMessage,
    streamMessage,
  };
}