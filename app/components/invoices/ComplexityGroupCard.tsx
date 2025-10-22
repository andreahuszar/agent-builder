'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { ComplexityGroup } from '@/app/types/recommendations';
import { formatRecommendationValue } from '@/app/services/recommendationEngine';

interface ComplexityGroupCardProps {
  group: ComplexityGroup;
  onSelectInvoice: (invoiceId: string) => void;
  onShowInTable: (invoiceIds: string[]) => void;
}

export function ComplexityGroupCard({
  group,
  onSelectInvoice,
  onShowInTable,
}: ComplexityGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSeverityColor = () => {
    switch (group.level) {
      case '1-exception':
        return 'bg-green-50 border-green-200 text-green-700';
      case '2-exceptions':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case '3-exceptions':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      case '4-plus-exceptions':
        return 'bg-red-50 border-red-200 text-red-700';
    }
  };

  const handleShowInTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    const invoiceIds = group.invoices.map(inv => inv.id);
    onShowInTable(invoiceIds);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - Collapsible */}
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={`px-3 py-1.5 rounded-md border font-semibold text-sm ${getSeverityColor()}`}>
              {group.count}
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-950">{group.label}</h4>
              <p className="text-xs text-gray-700 mt-0.5">{group.description}</p>
            </div>
          </div>
          <div className="text-gray-500">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </div>
        </button>
        <div className="p-4 pl-0">
          <button
            onClick={handleShowInTable}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Filter className="h-3.5 w-3.5" />
            Show in table
          </button>
        </div>
      </div>

      {/* Expanded Content - Invoice List */}
      {isExpanded && group.invoices.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-3 space-y-2">
            {group.invoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => onSelectInvoice(invoice.id)}
                className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-950">
                    {invoice.invoice_number}
                  </div>
                  <div className="text-xs text-gray-700 mt-0.5">
                    {invoice.vendor_name_snapshot || '[Missing Vendor]'}
                  </div>
                  {invoice.issues && invoice.issues.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {invoice.issues.map((issue, idx) => (
                        <span
                          key={idx}
                          className="inline-block px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right ml-3">
                  <div className="font-semibold text-sm text-gray-950">
                    {formatRecommendationValue(invoice.total)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
