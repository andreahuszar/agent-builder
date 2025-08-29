'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/lib/openai';

interface UseChatOptions {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize with system prompt if provided
  const initializeChat = useCallback(() => {
    if (options.systemPrompt) {
      setMessages([{ role: 'system', content: options.systemPrompt }]);
    } else {
      setMessages([]);
    }
    setError(null);
  }, [options.systemPrompt]);

  // Add a user message and get AI response
  const sendMessage = useCallback(async (content: string) => {
    setLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: updatedMessages,
          model: options.model,
          temperature: options.temperature,
          max_tokens: options.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        const assistantMessage = data.choices[0].message;
        setMessages(prev => [...prev, assistantMessage]);
        return assistantMessage;
      }
      
      throw new Error('No response from AI');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Request cancelled');
      } else {
        const errorMessage = err.message || 'Failed to send message';
        setError(errorMessage);
        options.onError?.(errorMessage);
      }
      
      // Remove the user message if there was an error
      setMessages(messages);
      throw err;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, options]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  // Clear chat history
  const clearChat = useCallback(() => {
    initializeChat();
  }, [initializeChat]);

  // Remove a specific message
  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Edit a message
  const editMessage = useCallback((index: number, newContent: string) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, content: newContent } : msg
    ));
  }, []);

  // Get conversation summary
  const getConversationTokens = useCallback(() => {
    // Rough estimation: ~4 characters per token
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4);
  }, [messages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    cancelRequest,
    clearChat,
    removeMessage,
    editMessage,
    initializeChat,
    getConversationTokens,
  };
}