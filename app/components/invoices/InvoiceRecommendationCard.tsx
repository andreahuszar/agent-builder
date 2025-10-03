'use client';

import React from 'react';
import { AlertTriangle, DollarSign, ChevronRight } from 'lucide-react';
import { InvoiceRecommendation } from '@/app/types/recommendations';
import { formatRecommendationValue } from '@/app/services/recommendationEngine';

interface InvoiceRecommendationCardProps {
  recommendation: InvoiceRecommendation;
  onSelect: (invoiceId: string) => void;
}

export function InvoiceRecommendationCard({
  recommendation,
  onSelect,
}: InvoiceRecommendationCardProps) {
  const { invoice, exceptions, suggestedActions, priority } = recommendation;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-900 text-xs font-bold">
              #{priority}
            </span>
            <h4 className="font-semibold text-gray-950">{invoice.invoice_number}</h4>
          </div>
          <p className="text-sm text-gray-700">{invoice.vendor_name_snapshot || '[Missing Vendor]'}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-lg font-bold text-gray-950">
            <DollarSign className="h-4 w-4" />
            <span>{formatRecommendationValue(invoice.total)}</span>
          </div>
        </div>
      </div>

      {/* Exceptions */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-semibold text-gray-700">
            {exceptions.length} Exception{exceptions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {exceptions.map((exception, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 text-red-700 border border-red-200"
            >
              {exception}
            </span>
          ))}
        </div>
      </div>

      {/* Suggested Actions */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-700 mb-1.5">Suggested actions:</p>
        <ul className="space-y-1">
          {suggestedActions.map((action, idx) => (
            <li key={idx} className="text-xs text-gray-700 flex items-start gap-1.5">
              <span className="text-purple-600 mt-0.5">•</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onSelect(invoice.id)}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
      >
        <span>View & Resolve</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
