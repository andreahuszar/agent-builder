'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Send, X, MessageSquare, ChevronRight } from 'lucide-react';

interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber?: string;
}

export function AIAgentPanel({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
}: AIAgentPanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: '1',
      sender: 'agent',
      content: "I'll help you review and fix this invoice. I can identify missing fields, suggest corrections, and help resolve exceptions. What would you like me to help with?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Track when component is mounted on client (prevents hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle smooth slide-in animation
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the element is in the DOM before animating
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    // Type assertion for the event listener
    const handleEscapeWrapper = (e: Event) => {
      handleEscape(e as unknown as KeyboardEvent);
    };

    document.addEventListener('keydown', handleEscapeWrapper);
    return () => document.removeEventListener('keydown', handleEscapeWrapper);
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && isVisible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350); // Wait for animation to complete
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: AgentMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    console.log('[AI Agent] User message:', inputValue.trim());
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate agent typing
    setIsTyping(true);

    // Simulate agent response after a delay
    setTimeout(() => {
      const agentResponse: AgentMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        content: `I understand you're asking about "${inputValue.trim()}". Let me analyze the invoice and provide suggestions. (This is a placeholder response - AI integration coming soon!)`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  // Don't render portal if not open
  if (!isOpen) {
    // Render the floating pill when closed
    return (
      <button
        onClick={onClose}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-purple-900 text-white px-2 py-4 rounded-l-lg shadow-lg hover:bg-purple-800 transition-colors duration-200 group"
        aria-label="Open AI Assistant"
      >
        <div className="flex flex-col items-center gap-1">
          <Sparkles className="h-5 w-5 text-white" />
          <span
            className="text-xs font-medium"
            style={{
              writingMode: 'vertical-rl' as const,
              textOrientation: 'mixed' as const
            }}
          >
            Agent
          </span>
        </div>
        <ChevronRight className="h-4 w-4 mt-1 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop (only on mobile/tablet) */}
      <div
        className={`lg:hidden absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Agent Panel */}
      <div
        className={`absolute right-0 top-0 h-full bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto
          w-full sm:w-[500px] lg:w-[450px] xl:w-[500px]
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Invoice Agent</h2>
              {invoiceNumber && (
                <p className="text-sm text-gray-500">Invoice {invoiceNumber}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close agent panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 h-[calc(100%-9rem)]">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.sender === 'user'
                      ? 'order-2'
                      : 'order-1'
                  }`}
                >
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-purple-900 text-white'
                        : 'bg-gray-100 text-gray-950'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p
                    className={`text-xs text-gray-500 mt-1 ${
                      message.sender === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {formatTimestamp(message.timestamp)}
                  </p>
                </div>
                {message.sender === 'agent' && (
                  <div className="order-0 mr-3 mt-1">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-purple-900" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-purple-900" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about missing fields, exceptions, or corrections..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}