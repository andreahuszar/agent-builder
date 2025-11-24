/**
 * Per-Invoice Agent State Management Hook
 *
 * Maintains Agent messages and insights per invoice ID across panel toggles.
 * State is stored in-memory (session-level) and persists until page refresh.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AgentMessage,
  AgentInsight,
  AgentSessionState,
  InvoiceException,
} from './types';

// In-memory store for all invoice Agent states (session-level)
const agentSessionStore = new Map<string, AgentSessionState>();

// Event emitter for store updates (triggers component re-renders)
type StoreUpdateListener = (invoiceId: string) => void;
const storeUpdateListeners = new Set<StoreUpdateListener>();

function notifyStoreUpdate(invoiceId: string) {
  storeUpdateListeners.forEach(listener => listener(invoiceId));
}

export function subscribeToStoreUpdates(listener: StoreUpdateListener) {
  storeUpdateListeners.add(listener);
  return () => storeUpdateListeners.delete(listener);
}

/**
 * Mark a training insight as resolved (called from parent component)
 * This function directly manipulates the session store to update the Agent state
 */
export function markAgentTrainingResolved(invoiceId: string, fieldId: string, learnedValue: string) {
  console.log('[Agent Store] Marking training resolved for invoice:', invoiceId, 'field:', fieldId);

  const session = agentSessionStore.get(invoiceId);
  if (!session) {
    console.warn('[Agent Store] No session found for invoice:', invoiceId);
    return;
  }

  // Find the training insight
  const insightIndex = session.insights.findIndex(
    (insight) => insight.type === 'training' && insight.relatedFieldId === fieldId
  );

  if (insightIndex === -1) {
    console.warn('[Agent Store] No training insight found for field:', fieldId);
    return;
  }

  // Update insight status
  const updatedInsights = [...session.insights];
  updatedInsights[insightIndex] = {
    ...updatedInsights[insightIndex],
    status: 'resolved',
    learnedValue,
  };

  // Add success message
  const fieldLabel = formatFieldName(fieldId);
  const successMessage: AgentMessage = {
    id: `msg-training-success-${Date.now()}`,
    role: 'agent',
    createdAt: new Date().toISOString(),
    content: `Perfect! I've learned where the **${fieldLabel}** appears on this vendor's invoices. I'll automatically extract it from this location for future documents.`,
    kind: 'chat',
  };

  // Update session store
  const updatedSession = {
    ...session,
    insights: updatedInsights,
    messages: [...session.messages, successMessage],
  };

  agentSessionStore.set(invoiceId, updatedSession);

  // Notify listeners that the store has been updated
  notifyStoreUpdate(invoiceId);
}

interface UseAgentStateProps {
  invoiceId: string;
  exceptionCount: number;
  exceptions: InvoiceException[];
  lineItemCount: number;
  matchedLineItemCount: number;
  invoiceNumber: string;
  teachableFields?: string[]; // Fields that support teaching (e.g., ['job_number'])
  invoiceData?: any; // Full invoice data to check for missing fields
}

interface UseAgentStateReturn {
  messages: AgentMessage[];
  insights: AgentInsight[];
  isInitialized: boolean;
  addMessage: (content: string, role: 'user' | 'agent', kind?: 'chat' | 'insight') => void;
  generateMockedReply: (userMessage: string) => void;
  markTrainingInProgress: (fieldId: string) => void;
  markTrainingResolved: (fieldId: string, learnedValue: string) => void;
}

export function useAgentState({
  invoiceId,
  exceptionCount,
  exceptions,
  lineItemCount,
  matchedLineItemCount,
  invoiceNumber,
  teachableFields = [],
  invoiceData,
}: UseAgentStateProps): UseAgentStateReturn {
  // Local state that mirrors the session store
  const [sessionState, setSessionState] = useState<AgentSessionState>(() => {
    // Try to load from session store first
    const existing = agentSessionStore.get(invoiceId);
    if (existing) {
      return existing;
    }

    // Initialize new session state
    return {
      invoiceId,
      messages: [],
      insights: [],
      initialized: false,
    };
  });

  // Sync local state to session store whenever it changes
  useEffect(() => {
    agentSessionStore.set(invoiceId, sessionState);
  }, [invoiceId, sessionState]);

  // Subscribe to external store updates (e.g., from parent component)
  useEffect(() => {
    const handleStoreUpdate = (updatedInvoiceId: string) => {
      if (updatedInvoiceId === invoiceId) {
        console.log('[Agent Hook] Received store update notification for invoice:', invoiceId);
        const updatedSession = agentSessionStore.get(invoiceId);
        if (updatedSession) {
          setSessionState(updatedSession);
        }
      }
    };

    const unsubscribe = subscribeToStoreUpdates(handleStoreUpdate);
    return unsubscribe;
  }, [invoiceId]);

  // Generate initial summary and insights (only once per invoice)
  useEffect(() => {
    if (!sessionState.initialized) {
      console.log('[Agent] Initializing summary for invoice:', invoiceId);
      const { summary, insights } = generateInitialSummaryAndInsights({
        exceptionCount,
        exceptions,
        lineItemCount,
        matchedLineItemCount,
        invoiceNumber,
        teachableFields,
        invoiceData,
      });

      const newMessages: AgentMessage[] = [summary];

      // Add insight messages
      insights.forEach((insight) => {
        newMessages.push({
          id: `msg-insight-${insight.id}`,
          role: 'agent',
          createdAt: new Date().toISOString(),
          content: insight.description,
          kind: 'insight',
          insightId: insight.id,
        });
      });

      setSessionState({
        invoiceId,
        messages: newMessages,
        insights,
        initialized: true,
      });
    }
  }, [
    invoiceId,
    sessionState.initialized,
    exceptionCount,
    exceptions,
    lineItemCount,
    matchedLineItemCount,
    invoiceNumber,
    teachableFields,
    invoiceData,
  ]);

  const addMessage = useCallback(
    (content: string, role: 'user' | 'agent', kind: 'chat' | 'insight' = 'chat') => {
      const newMessage: AgentMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role,
        createdAt: new Date().toISOString(),
        content,
        kind,
      };

      setSessionState((prev) => ({
        ...prev,
        messages: [...prev.messages, newMessage],
      }));
    },
    []
  );

  const generateMockedReply = useCallback(
    (userMessage: string) => {
      // Simple mocked response based on current exception count
      const reply =
        exceptionCount > 0
          ? `I can see there ${exceptionCount === 1 ? 'is' : 'are'} ${exceptionCount} exception${
              exceptionCount === 1 ? '' : 's'
            } on this invoice. I'd be happy to help you resolve ${
              exceptionCount === 1 ? 'it' : 'them'
            }. (This is a placeholder response - AI integration coming soon!)`
          : `This invoice looks good! All ${matchedLineItemCount} of ${lineItemCount} line items are matched. (This is a placeholder response - AI integration coming soon!)`;

      addMessage(reply, 'agent', 'chat');
    },
    [exceptionCount, matchedLineItemCount, lineItemCount, addMessage]
  );

  const markTrainingInProgress = useCallback((fieldId: string) => {
    console.log('[Agent] Marking training in progress for field:', fieldId);

    setSessionState((prev) => {
      // Find the training insight for this field
      const insightIndex = prev.insights.findIndex(
        (insight) => insight.type === 'training' && insight.relatedFieldId === fieldId
      );

      if (insightIndex === -1) {
        console.warn('[Agent] No training insight found for field:', fieldId);
        return prev;
      }

      // Update insight status
      const updatedInsights = [...prev.insights];
      updatedInsights[insightIndex] = {
        ...updatedInsights[insightIndex],
        status: 'inProgress',
      };

      // Add progress message
      const progressMessage: AgentMessage = {
        id: `msg-training-progress-${Date.now()}`,
        role: 'agent',
        createdAt: new Date().toISOString(),
        content: `Okay, I'm ready. Click on the correct ${formatFieldName(fieldId)} value on the document.`,
        kind: 'chat',
      };

      return {
        ...prev,
        insights: updatedInsights,
        messages: [...prev.messages, progressMessage],
      };
    });
  }, []);

  const markTrainingResolved = useCallback((fieldId: string, learnedValue: string) => {
    console.log('[Agent] Marking training resolved for field:', fieldId, 'value:', learnedValue);

    setSessionState((prev) => {
      // Find the training insight for this field
      const insightIndex = prev.insights.findIndex(
        (insight) => insight.type === 'training' && insight.relatedFieldId === fieldId
      );

      if (insightIndex === -1) {
        console.warn('[Agent] No training insight found for field:', fieldId);
        return prev;
      }

      // Update insight status and value
      const updatedInsights = [...prev.insights];
      updatedInsights[insightIndex] = {
        ...updatedInsights[insightIndex],
        status: 'resolved',
        learnedValue,
      };

      // Add success message
      const fieldLabel = formatFieldName(fieldId);
      const successMessage: AgentMessage = {
        id: `msg-training-success-${Date.now()}`,
        role: 'agent',
        createdAt: new Date().toISOString(),
        content: `Perfect! I've learned where the **${fieldLabel}** appears on this vendor's invoices. I'll automatically extract it from this location for future documents.`,
        kind: 'chat',
      };

      return {
        ...prev,
        insights: updatedInsights,
        messages: [...prev.messages, successMessage],
      };
    });
  }, []);

  return {
    messages: sessionState.messages,
    insights: sessionState.insights,
    isInitialized: sessionState.initialized,
    addMessage,
    generateMockedReply,
    markTrainingInProgress,
    markTrainingResolved,
  };
}

/**
 * Generate initial summary message and insights from invoice exceptions
 */
function generateInitialSummaryAndInsights({
  exceptionCount,
  exceptions,
  lineItemCount,
  matchedLineItemCount,
  invoiceNumber,
  teachableFields = [],
  invoiceData,
}: {
  exceptionCount: number;
  exceptions: InvoiceException[];
  lineItemCount: number;
  matchedLineItemCount: number;
  invoiceNumber: string;
  teachableFields?: string[];
  invoiceData?: any;
}): { summary: AgentMessage; insights: AgentInsight[] } {
  // Build summary message
  let summaryContent = '';
  if (exceptionCount > 0) {
    summaryContent = `I've analyzed invoice **${invoiceNumber}** and found **${exceptionCount} exception${
      exceptionCount === 1 ? '' : 's'
    }** that need attention. ${
      lineItemCount > 0
        ? `**${matchedLineItemCount}** of **${lineItemCount}** line items are fully matched.`
        : ''
    }`;
  } else {
    summaryContent = `I've analyzed invoice **${invoiceNumber}** and everything looks good! ${
      lineItemCount > 0
        ? `All **${lineItemCount}** line items are fully matched.`
        : ''
    } You can still ask me to double-check anything.`;
  }

  const summary: AgentMessage = {
    id: 'msg-summary-initial',
    role: 'agent',
    createdAt: new Date().toISOString(),
    content: summaryContent,
    kind: 'summary',
  };

  // Build insights from exceptions (map up to 5 most critical)
  const insights: AgentInsight[] = [];
  const maxInsights = 5;

  exceptions.slice(0, maxInsights).forEach((exception, index) => {
    const insight: AgentInsight = {
      id: `insight-exception-${index + 1}`,
      type: 'exception',
      title: getInsightTitle(exception),
      description: exception.message,
      severity: exception.severity,
      status: 'open',
      relatedFieldId: exception.fieldName,
    };
    insights.push(insight);
  });

  // Generate training insights for missing teachable fields
  if (invoiceData && teachableFields.length > 0) {
    teachableFields.forEach((fieldId) => {
      // Check if field is missing (empty or undefined)
      const fieldValue = invoiceData[fieldId];
      const isMissing = !fieldValue || fieldValue === '' || fieldValue.trim() === '';

      if (isMissing) {
        const fieldLabel = formatFieldName(fieldId);
        const trainingInsight: AgentInsight = {
          id: `insight-training-${fieldId}`,
          type: 'training',
          title: `Teach the Agent: ${fieldLabel}`,
          description: `I couldn't find the **${fieldLabel}** automatically on this vendor's invoices. Click "Point to value on document" to show me where it appears so I can learn for next time.`,
          severity: 'info',
          status: 'open',
          relatedFieldId: fieldId,
        };
        insights.push(trainingInsight);
      }
    });
  }

  return { summary, insights };
}

/**
 * Generate user-friendly insight titles from exception types
 */
function getInsightTitle(exception: InvoiceException): string {
  const { type, fieldName } = exception;

  // Map common exception types to friendly titles
  const titleMap: Record<string, string> = {
    missing_required_field: `Missing ${formatFieldName(fieldName)}`,
    field_validation_error: `Invalid ${formatFieldName(fieldName)}`,
    line_variance: 'Line Item Variance',
    price_variance: 'Price Variance',
    quantity_variance: 'Quantity Variance',
    bank_details_change: 'Bank Account Mismatch',
    duplicate_invoice: 'Duplicate Invoice',
    po_match_failed: 'PO Matching Failed',
    close_match: `${formatFieldName(fieldName)} Close Match`,
  };

  return titleMap[type] || 'Invoice Exception';
}

/**
 * Format field names for display (e.g. 'invoice_number' -> 'Invoice Number')
 */
function formatFieldName(fieldName?: string): string {
  if (!fieldName) return 'Field';

  // Special cases
  const specialCases: Record<string, string> = {
    po_number: 'PO Number',
    job_number: 'Customer ID',
    vendor_tax_id_snapshot: 'Vendor Tax ID',
    vendor_name_snapshot: 'Vendor Name',
  };

  if (specialCases[fieldName]) {
    return specialCases[fieldName];
  }

  // Default: capitalize and replace underscores
  return fieldName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
