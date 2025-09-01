'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RotateCcw, User, Bot } from 'lucide-react';
import { useChat } from '@/app/hooks/useChat';
import type { ChatMessage } from '@/lib/openai';

interface ChatInterfaceProps {
  systemPrompt?: string;
  placeholder?: string;
  className?: string;
  height?: string;
}

export function ChatInterface({
  systemPrompt,
  placeholder = 'Type your message...',
  className = '',
  height = 'h-96',
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    loading,
    error,
    sendMessage,
    clearChat,
    initializeChat,
  } = useChat({ systemPrompt });

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const message = input;
    setInput('');
    
    try {
      await sendMessage(message);
    } catch {
      // Error is handled by the hook
    }
  };

  const formatMessage = (content: string) => {
    // Simple formatting for code blocks
    return content.split('```').map((part, index) => {
      if (index % 2 === 1) {
        return (
          <pre key={index} className="bg-gray-900 text-gray-100 p-2 rounded-md overflow-x-auto my-2">
            <code>{part}</code>
          </pre>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Filter out system messages from display
  const displayMessages = messages.filter(msg => msg.role !== 'system');

  return (
    <div className={`flex flex-col bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
        <button
          onClick={clearChat}
          disabled={loading || displayMessages.length === 0}
          className="text-gray-400 hover:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear chat"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${height}`}>
        {displayMessages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Start a conversation with the AI assistant
          </div>
        )}
        
        {displayMessages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {formatMessage(message.content)}
              </div>
            </div>
            
            {message.role === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-red-500 text-sm py-2">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}