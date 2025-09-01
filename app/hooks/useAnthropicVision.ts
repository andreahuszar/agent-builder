'use client';

import { useState, useCallback } from 'react';
import type { InvoiceExtractionResult } from '@/lib/anthropic';

interface UseAnthropicVisionOptions {
  onError?: (error: string) => void;
  onSuccess?: (response: any) => void;
  onProgress?: (progress: number) => void;
}

export function useAnthropicVision(options: UseAnthropicVisionOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const analyzeImage = useCallback(async (
    file: File,
    prompt?: string
  ) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Update progress
      setProgress(10);
      options.onProgress?.(10);

      const formData = new FormData();
      formData.append('file', file);
      if (prompt) {
        formData.append('prompt', prompt);
      }

      setProgress(30);
      options.onProgress?.(30);

      const response = await fetch('/api/anthropic/vision', {
        method: 'PUT',
        body: formData,
      });

      setProgress(70);
      options.onProgress?.(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setProgress(100);
      options.onProgress?.(100);
      options.onSuccess?.(data);
      
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze image';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [options]);

  const analyzeImageUrl = useCallback(async (
    imageUrl: string,
    prompt?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageUrl,
          mediaType: 'image/jpeg', // Default, should be detected from URL
          prompt,
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
      const errorMessage = err.message || 'Failed to analyze image from URL';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [options]);

  const extractInvoice = useCallback(async (
    file: File
  ): Promise<InvoiceExtractionResult> => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Update progress
      setProgress(10);
      options.onProgress?.(10);

      const formData = new FormData();
      formData.append('file', file);

      setProgress(30);
      options.onProgress?.(30);

      const response = await fetch('/api/anthropic/extract-invoice', {
        method: 'POST',
        body: formData,
      });

      setProgress(70);
      options.onProgress?.(70);

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle overloaded server error specifically
        if (response.status === 503 || errorData.error?.includes('overloaded')) {
          const retryMessage = 'The AI service is temporarily busy. Please wait a moment and try again.';
          throw new Error(retryMessage);
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setProgress(100);
      options.onProgress?.(100);
      options.onSuccess?.(result.data);
      
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to extract invoice data';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [options]);

  const batchAnalyzeImages = useCallback(async (
    files: File[],
    prompts?: string[]
  ) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const totalFiles = files.length;
      const results = [];

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        const prompt = prompts?.[i];
        
        // Update progress for each file
        const fileProgress = ((i + 1) / totalFiles) * 100;
        setProgress(fileProgress);
        options.onProgress?.(fileProgress);

        const result = await analyzeImage(file, prompt);
        results.push(result);
      }

      options.onSuccess?.(results);
      return results;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to analyze batch images';
      setError(errorMessage);
      options.onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
      setProgress(0);
    }
  }, [analyzeImage, options]);

  const validateImageFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Unsupported format. Supported: JPEG, PNG, GIF, WebP`,
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `Image too large. Maximum size: 10MB`,
      };
    }

    return { valid: true };
  }, []);

  return {
    loading,
    error,
    progress,
    analyzeImage,
    analyzeImageUrl,
    extractInvoice,
    batchAnalyzeImages,
    validateImageFile,
  };
}