'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, ChatCompletionRequest } from '@/lib/groq';

interface UseGroqOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: any) => void;
}

export function useGroq(options: UseGroqOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateApiKey = useCallback(async (apiKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/groq/validate', {
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
    try {
      const response = await fetch('/api/groq/validate');
      const data = await response.json();
      
      return data;
    } catch (err: any) {
      return { configured: false, errors: ['Failed to check configuration'] };
    }
  }, []);

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    requestOptions?: Partial<ChatCompletionRequest>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/groq/chat', {
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

  return {
    loading,
    error,
    validateApiKey,
    checkConfiguration,
    sendMessage,
  };
}
