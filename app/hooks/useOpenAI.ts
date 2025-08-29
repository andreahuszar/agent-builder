'use client';

import { useState, useCallback } from 'react';
import type { ChatMessage, ChatCompletionRequest } from '@/lib/openai';

interface UseOpenAIOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: any) => void;
}

export function useOpenAI(options: UseOpenAIOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateApiKey = useCallback(async (apiKey?: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai/validate', {
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
      const response = await fetch('/api/openai/validate');
      const data = await response.json();
      
      // Don't set error state for configuration checks
      // Just return the data whether configured or not
      return data;
    } catch (err: any) {
      // Return not configured state instead of throwing
      return { configured: false, errors: ['Failed to check configuration'] };
    }
  }, [options]);

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    requestOptions?: Partial<ChatCompletionRequest>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai/chat', {
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

  const complete = useCallback(async (
    prompt: string,
    requestOptions?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/openai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
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
      const errorMessage = err.message || 'Failed to complete prompt';
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
    complete,
  };
}