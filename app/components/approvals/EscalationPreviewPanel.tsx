import React, { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';

interface EscalationPreviewPanelProps {
  invoiceNumber: string;
  vendorName: string;
  total: number;
  currency: string;
  dueDate: string;
  escalationTo: {
    name: string;
    role: string;
    email: string;
  };
  hoursOverdue: number;
  assignedTo: string;
}

/**
 * EscalationPreviewPanel - Shows escalation email preview with copy functionality
 *
 * Preview only approach - shows email template and allows copying to clipboard
 */
export function EscalationPreviewPanel({
  invoiceNumber,
  vendorName,
  total,
  currency,
  dueDate,
  escalationTo,
  hoursOverdue,
  assignedTo
}: EscalationPreviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const daysOverdue = Math.floor(hoursOverdue / 24);

  const emailSubject = `URGENT: Invoice Approval Required - SLA Breach (${invoiceNumber})`;

  const emailBody = `Dear ${escalationTo.name},

This email is to escalate invoice ${invoiceNumber} which has exceeded its approval SLA by ${hoursOverdue} hours (${daysOverdue} days).

INVOICE DETAILS:
• Invoice Number: ${invoiceNumber}
• Vendor: ${vendorName}
• Amount: ${formatCurrency(total)}
• Due Date: ${formatDate(dueDate)}
• Currently Assigned To: ${assignedTo}
• Hours Overdue: ${hoursOverdue} hours

BUSINESS IMPACT:
• Late payment penalties are accruing
• Vendor relationship is at risk
• Payment terms may be affected

This invoice requires immediate attention to avoid further financial and relationship penalties.

Please review and approve at your earliest convenience, or provide guidance on next steps.

Best regards,
Xelix AP System
Automated Escalation`;

  const handleCopy = async () => {
    const fullEmail = `Subject: ${emailSubject}\n\n${emailBody}`;
    try {
      await navigator.clipboard.writeText(fullEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-950">Escalation Required</h4>

      {/* Next Step - Purple with CTA */}
      <div className="border border-purple-200 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-purple-50 px-4 py-3">
          <div>
            <h5 className="text-sm font-bold text-purple-900 mb-1">Next Step</h5>
            <p className="text-sm text-gray-950">
              Escalate to: <span className="font-medium">{escalationTo.name}</span>
            </p>
            <p className="text-xs text-gray-950 mt-1">
              {escalationTo.role} • {escalationTo.email}
            </p>
            <p className="text-xs text-gray-950 mt-2">
              Reason: SLA breach &gt; {daysOverdue} days
            </p>
            <div className="flex justify-start mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors text-sm font-medium"
              >
                <Mail className="h-4 w-4" />
                Draft Email
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Email Preview - Expanded */}
      {isExpanded && (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="p-4 bg-white space-y-3">
            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Subject:</label>
              <p className="text-sm text-gray-950 font-medium">{emailSubject}</p>
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Message:</label>
              <div className="bg-gray-50 rounded p-3 text-sm text-gray-950 whitespace-pre-line font-mono text-xs leading-relaxed max-h-64 overflow-y-auto">
                {emailBody}
              </div>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="text-sm font-medium">Copy Email</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
