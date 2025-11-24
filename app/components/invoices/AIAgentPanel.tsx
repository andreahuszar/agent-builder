'use client';

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Send, X, MessageSquare, ChevronRight, AlertTriangle, Info, AlertCircle, MapPin, Check, Loader2, ListTodo } from 'lucide-react';
import { useAgentState } from './agent/useAgentState';
import { AgentMessage, AgentInsight, InvoiceException } from './agent/types';

type AgentViewMode = 'overview' | 'conversation';

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber: string;
  mode?: 'overlay' | 'inline'; // overlay = portal drawer, inline = integrated column
  exceptionCount: number;
  exceptions: InvoiceException[];
  lineItemCount: number;
  matchedLineItemCount: number;
  teachableFields?: string[]; // Fields that support teaching (e.g., ['job_number'])
  invoiceData?: any; // Full invoice data to check for missing fields
  isTeachingInProgress?: boolean; // Whether teaching mode is currently active
  onStartTeaching?: (fieldId: string) => void; // Callback to start teaching for a field
  onViewField?: (fieldId: string) => void; // Callback to scroll and highlight field on invoice
}

export function AIAgentPanel({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  mode = 'overlay',
  exceptionCount,
  exceptions,
  lineItemCount,
  matchedLineItemCount,
  teachableFields = [],
  invoiceData,
  isTeachingInProgress = false,
  onStartTeaching,
  onViewField,
}: AIAgentPanelProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use per-invoice Agent state
  const { messages, insights, addMessage, generateMockedReply, markTrainingInProgress, markTrainingResolved } = useAgentState({
    invoiceId,
    exceptionCount,
    exceptions,
    lineItemCount,
    matchedLineItemCount,
    invoiceNumber,
    teachableFields,
    invoiceData,
  });

  // Determine initial view mode based on whether there are open insights
  const hasOpenInsights = insights.some(insight => insight.status !== 'resolved');
  const initialViewMode: AgentViewMode = hasOpenInsights ? 'overview' : 'conversation';

  const [viewMode, setViewMode] = useState<AgentViewMode>(initialViewMode);

  // Track when component is mounted on client (prevents hydration mismatch)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle smooth slide-in animation
  useEffect(() => {
    if (isOpen) {
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
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessageContent = inputValue.trim();
    console.log('[AI Agent] User message:', userMessageContent);

    // Auto-switch to conversation mode if in overview
    if (viewMode === 'overview') {
      setViewMode('conversation');
    }

    // Add user message
    addMessage(userMessageContent, 'user', 'chat');
    setInputValue('');

    // Simulate agent typing
    setIsTyping(true);

    // Generate mocked reply after delay
    setTimeout(() => {
      generateMockedReply(userMessageContent);
      setIsTyping(false);
    }, 1500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    // Auto-switch to conversation when user starts typing in Overview mode
    if (viewMode === 'overview' && e.target.value.length > 0 && inputValue.length === 0) {
      setViewMode('conversation');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOnInvoice = (relatedFieldId?: string) => {
    console.log('[AI Agent] View on invoice clicked for field:', relatedFieldId);
    if (relatedFieldId && onViewField) {
      onViewField(relatedFieldId);
    }
  };

  const handleStartTeachingClick = (insight: AgentInsight) => {
    if (!insight.relatedFieldId || !onStartTeaching) {
      console.warn('[AI Agent] Cannot start teaching: missing field ID or callback');
      return;
    }

    console.log('[AI Agent] Starting teaching for field:', insight.relatedFieldId);

    // Mark as in progress in Agent state
    markTrainingInProgress(insight.relatedFieldId);

    // Trigger the actual teaching flow via parent callback
    onStartTeaching(insight.relatedFieldId);
  };

  // Don't render anything during SSR
  if (!isMounted) {
    return null;
  }

  // Extract summary and insight messages
  const summaryMessage = messages.find((m) => m.kind === 'summary');
  const insightMessages = messages.filter((m) => m.kind === 'insight');
  const chatMessages = messages.filter((m) => m.kind === 'chat' || !m.kind);

  // Count open insights for badge
  const openInsightsCount = insights.filter(insight => insight.status !== 'resolved').length;

  // Render panel content (shared between overlay and inline modes)
  const panelContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-purple-50 to-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-900" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Invoice Agent</h2>
              <p className="text-sm text-gray-500">Invoice {invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close agent panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              viewMode === 'overview'
                ? 'bg-purple-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <ListTodo className="h-4 w-4" />
            <span>Overview</span>
            {openInsightsCount > 0 && (
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                viewMode === 'overview' ? 'bg-white text-purple-900' : 'bg-purple-100 text-purple-900'
              }`}>
                {openInsightsCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setViewMode('conversation')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              viewMode === 'conversation'
                ? 'bg-purple-900 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Conversation</span>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {viewMode === 'overview' ? (
          <OverviewView
            summaryMessage={summaryMessage}
            insights={insights}
            openInsightsCount={openInsightsCount}
            onViewClick={handleViewOnInvoice}
            onTeachClick={handleStartTeachingClick}
            onDiscussClick={() => setViewMode('conversation')}
            isTeachingInProgress={isTeachingInProgress}
            formatTimestamp={formatTimestamp}
          />
        ) : (
          <ConversationView
            chatMessages={chatMessages}
            isTyping={isTyping}
            openInsightsCount={openInsightsCount}
            onViewOverview={() => setViewMode('overview')}
            formatTimestamp={formatTimestamp}
            messagesEndRef={messagesEndRef}
          />
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50 flex-shrink-0">
        {viewMode === 'conversation' ? (
          <>
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
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
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-500">
              Switch to <button
                onClick={() => setViewMode('conversation')}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                Conversation
              </button> to ask a question
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Inline mode: render directly as a column (for desktop 3-column layout)
  if (mode === 'inline') {
    return panelContent;
  }

  // Overlay mode: render in portal for mobile/drawer behavior
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
              textOrientation: 'mixed' as const,
            }}
          >
            Agent
          </span>
        </div>
        <ChevronRight className="h-4 w-4 mt-1 group-hover:translate-x-0.5 transition-transform" />
      </button>
    );
  }

  // Only render portal on client side (avoid SSR issues)
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Agent Panel - Overlay Drawer */}
      <div
        className={`absolute right-0 top-0 h-full shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto
          w-full sm:w-[500px] lg:w-[450px] xl:w-[500px]
          ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {panelContent}
      </div>
    </div>,
    document.body
  );
}

/**
 * Overview View Component
 */
function OverviewView({
  summaryMessage,
  insights,
  openInsightsCount,
  onViewClick,
  onTeachClick,
  onDiscussClick,
  isTeachingInProgress,
  formatTimestamp,
}: {
  summaryMessage?: AgentMessage;
  insights: AgentInsight[];
  openInsightsCount: number;
  onViewClick: (fieldId?: string) => void;
  onTeachClick: (insight: AgentInsight) => void;
  onDiscussClick: () => void;
  isTeachingInProgress: boolean;
  formatTimestamp: (dateString: string) => string;
}) {
  const openInsights = insights.filter(insight => insight.status !== 'resolved');
  const resolvedInsights = insights.filter(insight => insight.status === 'resolved');

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      {summaryMessage && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
              <Sparkles className="h-4 w-4 text-purple-900" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-950 mb-1">Summary</h3>
              <p className="text-sm text-gray-950 whitespace-pre-wrap">
                {summaryMessage.content}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatTimestamp(summaryMessage.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Needs Attention Section */}
      {openInsightsCount > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-950 mb-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Needs Attention ({openInsightsCount})
          </h3>
          <div className="space-y-3">
            {openInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewClick={() => onViewClick(insight.relatedFieldId)}
                onTeachClick={() => onTeachClick(insight)}
                onDiscussClick={onDiscussClick}
                isTeachingInProgress={isTeachingInProgress}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Section */}
      {resolvedInsights.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-950 flex items-center gap-2 hover:text-purple-900">
            <Check className="h-4 w-4 text-green-600" />
            Resolved ({resolvedInsights.length})
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-3 space-y-3">
            {resolvedInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onViewClick={() => onViewClick(insight.relatedFieldId)}
                onTeachClick={() => onTeachClick(insight)}
                onDiscussClick={onDiscussClick}
                isTeachingInProgress={isTeachingInProgress}
              />
            ))}
          </div>
        </details>
      )}

      {openInsightsCount === 0 && resolvedInsights.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No issues found on this invoice.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Conversation View Component
 */
function ConversationView({
  chatMessages,
  isTyping,
  openInsightsCount,
  onViewOverview,
  formatTimestamp,
  messagesEndRef,
}: {
  chatMessages: AgentMessage[];
  isTyping: boolean;
  openInsightsCount: number;
  onViewOverview: () => void;
  formatTimestamp: (dateString: string) => string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="space-y-4">
      {/* Overview Pill (if there are open insights) */}
      {openInsightsCount > 0 && (
        <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-white border-b border-gray-100">
          <button
            onClick={onViewOverview}
            className="w-full px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{openInsightsCount} {openInsightsCount === 1 ? 'issue needs' : 'issues need'} attention</span>
            <span>•</span>
            <span>View overview →</span>
          </button>
        </div>
      )}

      {/* Chat Messages */}
      {chatMessages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] ${
              message.role === 'user' ? 'order-2' : 'order-1'
            }`}
          >
            <div
              className={`px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-purple-900 text-white'
                  : 'bg-gray-100 text-gray-950'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            <p
              className={`text-xs text-gray-500 mt-1 ${
                message.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              {formatTimestamp(message.createdAt)}
            </p>
          </div>
          {message.role === 'agent' && (
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
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * Insight Card Component
 */
function InsightCard({
  insight,
  onViewClick,
  onTeachClick,
  onDiscussClick,
  isTeachingInProgress,
}: {
  insight: AgentInsight;
  onViewClick: () => void;
  onTeachClick?: () => void;
  onDiscussClick?: () => void;
  isTeachingInProgress?: boolean;
}) {
  const getSeverityIcon = () => {
    switch (insight.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-700" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-700" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-700" />;
    }
  };

  const getSeverityStyles = () => {
    switch (insight.severity) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getSeverityBadgeStyles = () => {
    switch (insight.severity) {
      case 'error':
        return 'bg-red-100 text-red-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'info':
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusBadge = () => {
    if (insight.type !== 'training') return null;

    switch (insight.status) {
      case 'inProgress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <Check className="h-3 w-3" />
            Learned
          </span>
        );
      default:
        return null;
    }
  };

  const renderActionButton = () => {
    if (insight.type === 'training') {
      // Training insight: show "Point to value" button
      const isThisInsightInProgress = insight.status === 'inProgress';
      const isResolved = insight.status === 'resolved';
      const isDisabled = isTeachingInProgress || isResolved;

      if (isResolved) {
        return (
          <div className="text-xs text-green-700 font-medium">
            ✓ Value learned: {insight.learnedValue}
          </div>
        );
      }

      return (
        <button
          onClick={onTeachClick}
          disabled={isDisabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-900 rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isThisInsightInProgress ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Waiting for selection...
            </>
          ) : (
            <>
              <MapPin className="h-3 w-3" />
              Point to value on document
            </>
          )}
        </button>
      );
    } else {
      // Exception insight: show "View on invoice" link
      return insight.relatedFieldId ? (
        <button
          onClick={onViewClick}
          className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
        >
          View on invoice →
        </button>
      ) : null;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getSeverityStyles()}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getSeverityIcon()}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-950">{insight.title}</h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge()}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityBadgeStyles()}`}
              >
                {insight.severity}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-950 mb-3">{insight.description}</p>
          {renderActionButton()}
        </div>
      </div>
    </div>
  );
}
