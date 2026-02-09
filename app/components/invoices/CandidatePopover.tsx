'use client';

import React, { useEffect, useRef } from 'react';
import { Check, X, Sparkles, Bot } from 'lucide-react';

interface Candidate {
  value: string;
  confidence: number;
  source: string;
  reason?: string;
  agent_name?: string;
  agent_id?: string;
  agent_reasoning?: string;
}

interface CandidatePopoverProps {
  candidate: Candidate;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function CandidatePopover({
  candidate,
  onAccept,
  onReject,
  onClose,
}: CandidatePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add delay to avoid immediate close when opening
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const confidencePercent = Math.round(candidate.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80 ? 'text-green-600' :
    confidencePercent >= 60 ? 'text-yellow-600' :
    'text-orange-600';

  const isAgentSuggestion = candidate.source === 'agent';

  return (
    <div
      ref={popoverRef}
      className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-in fade-in slide-in-from-top-1 duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
        {isAgentSuggestion ? (
          <Bot className="h-4 w-4 text-purple-600" />
        ) : (
          <Sparkles className="h-4 w-4 text-purple-600" />
        )}
        <h3 className="text-sm font-semibold text-gray-950">
          {isAgentSuggestion ? 'Agent Suggestion' : 'AI Suggestion'}
        </h3>
        {isAgentSuggestion && candidate.agent_name && (
          <span className="ml-auto text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
            {candidate.agent_name}
          </span>
        )}
      </div>

      {/* Candidate Value */}
      <div className="mb-3">
        <div className="text-xs font-medium text-gray-600 mb-1">Suggested Value</div>
        <div className="text-base font-medium text-gray-950 bg-purple-50 px-3 py-2 rounded border border-purple-200">
          {candidate.value}
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Confidence</span>
          <span className={`font-semibold ${confidenceColor}`}>
            {confidencePercent}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Source</span>
          <span className="font-medium text-gray-950">{candidate.source}</span>
        </div>
      </div>

      {/* Agent Reasoning (if provided) */}
      {isAgentSuggestion && candidate.agent_reasoning && (
        <div className="mb-4 p-3 bg-purple-50 rounded border border-purple-200">
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-900">Agent Reasoning</span>
          </div>
          <p className="text-xs text-gray-700">{candidate.agent_reasoning}</p>
        </div>
      )}

      {/* Reason (if provided for non-agent suggestions) */}
      {!isAgentSuggestion && candidate.reason && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-xs text-gray-700">
          <span className="font-medium">Note:</span> {candidate.reason}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onAccept();
            onClose();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Check className="h-4 w-4" />
          Accept
        </button>
        <button
          onClick={() => {
            onReject();
            onClose();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-gray-100 text-gray-950 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
      </div>
    </div>
  );
}
