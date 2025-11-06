'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, User, MessageSquare } from 'lucide-react';
import { SLAStatusBadge } from './SLAStatusBadge';
import { formatTimePending } from '@/app/services/slaService';

interface SLAStatusPanelProps {
  invoiceId: string;
  invoiceData: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateToTab?: (tabName: string) => void;
}

export function SLAStatusPanel({
  invoiceId,
  invoiceData,
  isCollapsed,
  onToggleCollapse,
  onNavigateToTab,
}: SLAStatusPanelProps) {
  const hasSLA = invoiceData?.assigned_at && invoiceData?.sla_hours;
  const slaStatus = invoiceData?.sla_status || 'on_time';

  // Get status color
  const getStatusColor = () => {
    switch (slaStatus) {
      case 'on_time':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' };
      case 'at_risk':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' };
      case 'breached':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-600' };
      case 'severe_breach':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-600' };
    }
  };

  const colors = getStatusColor();

  // Get icon based on status
  const getStatusIcon = () => {
    switch (slaStatus) {
      case 'on_time':
        return <CheckCircle className={`h-4 w-4 ${colors.icon}`} />;
      case 'at_risk':
        return <Clock className={`h-4 w-4 ${colors.icon}`} />;
      case 'breached':
      case 'severe_breach':
        return <AlertTriangle className={`h-4 w-4 ${colors.icon}`} />;
      default:
        return <Clock className={`h-4 w-4 ${colors.icon}`} />;
    }
  };

  const getStatusLabel = () => {
    switch (slaStatus) {
      case 'on_time':
        return 'On Time';
      case 'at_risk':
        return 'At Risk';
      case 'breached':
        return 'Breached';
      case 'severe_breach':
        return 'Severely Breached';
      default:
        return 'Unknown';
    }
  };

  if (!hasSLA) {
    return null;
  }

  // Collapsed view - thin bar
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={`h-full w-full border-t ${colors.bg} flex items-center justify-between px-4 py-2 hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${colors.text}`}>
            SLA Status: {getStatusLabel()}
          </span>
          {invoiceData.assigned_at && (
            <span className={`text-xs ${colors.text}`}>
              {formatTimePending(invoiceData.assigned_at)}
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-xs ${colors.text}`}>
          <span>Expand</span>
          <ChevronUp className="h-3 w-3" />
        </div>
      </button>
    );
  }

  // Expanded view - full panel
  return (
    <div className="h-full border-t bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className={`flex-shrink-0 px-4 py-3 border-b ${colors.border} ${colors.bg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <h3 className={`text-sm font-semibold ${colors.text}`}>
              SLA Status: {getStatusLabel()}
            </h3>
          </div>
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-1 px-2 py-1 text-xs text-purple-700 hover:text-purple-900 rounded transition-colors"
            aria-label="Collapse SLA panel"
          >
            <span>Collapse</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Content - Card Style Dashboard */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-3">
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          {/* Info Grid */}
          <div className="p-4 bg-white space-y-4">
            {/* Two Column Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Overdue */}
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  OVERDUE
                </div>
                <div className="text-sm font-bold text-gray-950">
                  {invoiceData.assigned_at ? formatTimePending(invoiceData.assigned_at) : 'N/A'}
                </div>
                {invoiceData.sla_deadline && (
                  <div className="text-xs text-gray-600 mt-1">
                    Since {new Date(invoiceData.sla_deadline).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                )}
              </div>

              {/* Right: Assigned To */}
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  ASSIGNED TO
                </div>
                <div className="text-sm font-bold text-gray-950">
                  Caroline Walsh
                </div>
                {invoiceData.assigned_at && (
                  <div className="text-xs text-gray-600 mt-1">
                    {formatTimePending(invoiceData.assigned_at)} ago
                  </div>
                )}
              </div>
            </div>

            {/* Last Activity */}
            {invoiceData.vendor_communications && invoiceData.vendor_communications.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  LAST ACTIVITY
                </div>
                <div className="text-sm font-bold text-gray-950 inline">
                  {(() => {
                    const emails = invoiceData.vendor_communications.filter((c: any) => c.type === 'email').length;
                    const comments = invoiceData.vendor_communications.filter((c: any) => c.type === 'comment' || c.type === 'user_comment').length;
                    const parts = [];
                    if (emails > 0) parts.push(`${emails} email${emails !== 1 ? 's' : ''}`);
                    if (comments > 0) parts.push(`${comments} comment${comments !== 1 ? 's' : ''}`);

                    // Get last communication timestamp
                    const sorted = [...invoiceData.vendor_communications].sort((a: any, b: any) =>
                      new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime()
                    );
                    const lastComm = sorted[0];
                    const lastTime = lastComm ? new Date(lastComm.timestamp || lastComm.created_at) : null;
                    const timeAgo = lastTime ? formatTimePending(lastTime.toISOString()) : null;

                    const countText = parts.join(', ') || `${invoiceData.vendor_communications.length} message${invoiceData.vendor_communications.length !== 1 ? 's' : ''}`;
                    return timeAgo ? `${countText} • ${timeAgo} ago` : countText;
                  })()}
                </div>
                {' • '}
                <button
                  onClick={() => onNavigateToTab?.('activity')}
                  className="text-sm text-purple-700 hover:text-purple-900 underline transition-colors inline"
                >
                  View Activity
                </button>
              </div>
            )}
          </div>

          {/* CTA Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
            {/* Primary: Escalate Now - only for breached/severe_breach */}
            {(slaStatus === 'breached' || slaStatus === 'severe_breach') && (
              <button
                onClick={() => onNavigateToTab?.('escalation')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors text-sm font-medium"
              >
                <AlertTriangle className="h-4 w-4" />
                Escalate Now &gt;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
