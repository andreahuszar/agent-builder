'use client';

import React, { useState } from 'react';
import { Check, X, AlertCircle, RefreshCw, Link, FileCheck } from 'lucide-react';

interface StatusChipsProps {
  invoiceId: string;
  invoiceStatus?: string;
  matchStatus?: string;
  hasPO?: boolean;
  hasGR?: boolean;
  hasSES?: boolean;
  onRerunMatching?: () => Promise<void>;
}

export function StatusChips({
  invoiceId,
  invoiceStatus = 'draft',
  matchStatus = 'not_matched',
  hasPO = false,
  hasGR = false,
  hasSES = false,
  onRerunMatching,
}: StatusChipsProps) {
  const [isRerunning, setIsRerunning] = useState(false);

  const handleRerunMatching = async () => {
    if (!onRerunMatching) return;
    
    setIsRerunning(true);
    try {
      await onRerunMatching();
    } finally {
      setIsRerunning(false);
    }
  };

  const getInvoiceStatusChip = () => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      posted: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileCheck },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: X },
      paid: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Check },
    };

    const config = statusConfig[invoiceStatus as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>{invoiceStatus.charAt(0).toUpperCase() + invoiceStatus.slice(1)}</span>
      </div>
    );
  };

  const getMatchStatusChip = () => {
    const statusConfig = {
      not_matched: { bg: 'bg-gray-100', text: 'text-gray-800', icon: AlertCircle },
      matched: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
      partially_matched: { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertCircle },
      exception: { bg: 'bg-red-100', text: 'text-red-800', icon: X },
    };

    const config = statusConfig[matchStatus as keyof typeof statusConfig] || statusConfig.not_matched;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="h-3.5 w-3.5" />
        <span>
          {matchStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      </div>
    );
  };

  const getLinkChip = (linked: boolean, label: string, icon: React.ReactNode) => {
    return (
      <div className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${linked 
          ? 'bg-blue-100 text-blue-800' 
          : 'bg-gray-100 text-gray-500'
        }
      `}>
        {icon}
        <span>{label}</span>
        {linked ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <X className="h-3.5 w-3.5 opacity-50" />
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Invoice Status */}
      {getInvoiceStatusChip()}

      {/* Match Status */}
      {getMatchStatusChip()}

      {/* PO Linked */}
      {getLinkChip(hasPO, 'PO', <Link className="h-3.5 w-3.5" />)}

      {/* GR/SES Linked */}
      {(hasGR || hasSES) && getLinkChip(hasGR || hasSES, hasGR ? 'GR' : 'SES', <FileCheck className="h-3.5 w-3.5" />)}

      {/* Re-run Matching Button */}
      {onRerunMatching && (
        <button
          onClick={handleRerunMatching}
          disabled={isRerunning}
          className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium
            border transition-all
            ${isRerunning
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
            }
          `}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRerunning ? 'animate-spin' : ''}`} />
          <span>{isRerunning ? 'Running...' : 'Re-run Matching'}</span>
        </button>
      )}
    </div>
  );
}