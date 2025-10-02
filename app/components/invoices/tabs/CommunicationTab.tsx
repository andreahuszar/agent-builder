'use client';

import React, { useState } from 'react';
import { Mail, MessageSquare, StickyNote, User } from 'lucide-react';

interface CommunicationTabProps {
  invoiceId: string;
  invoiceNumber?: string;
}

type CommunicationType = 'email' | 'comment' | 'note';

interface CommunicationItem {
  id: string;
  type: CommunicationType;
  timestamp: string;
  user: string;
  userInitials: string;
  // For emails
  subject?: string;
  from?: string;
  to?: string;
  // For all types
  content: string;
  // For notes
  isEditable?: boolean;
}

export function CommunicationTab({ invoiceId, invoiceNumber }: CommunicationTabProps) {
  const [userNote, setUserNote] = useState('');

  // Mock communication data
  const mockCommunications: CommunicationItem[] = [
    {
      id: '1',
      type: 'email',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      user: 'vendor@acmecorp.com',
      userInitials: 'AC',
      from: 'vendor@acmecorp.com',
      to: 'ap@xelix.com',
      subject: `RE: Invoice ${invoiceNumber} - Payment Inquiry`,
      content: 'Hi team, just following up on the payment status for this invoice. Please let me know if you need any additional documentation.',
    },
    {
      id: '2',
      type: 'comment',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      user: 'Sarah Chen',
      userInitials: 'SC',
      content: 'I verified the PO match and approved the variance. The price difference was due to the negotiated discount applied at invoice time.',
    },
    {
      id: '3',
      type: 'email',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      user: 'ap@xelix.com',
      userInitials: 'AP',
      from: 'ap@xelix.com',
      to: 'vendor@acmecorp.com',
      subject: `Invoice ${invoiceNumber} - Additional Information Required`,
      content: 'We received your invoice but noticed a discrepancy with the PO. Could you please provide the updated delivery receipt?',
    },
    {
      id: '4',
      type: 'note',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
      user: 'System',
      userInitials: 'SY',
      content: 'Invoice received via email and automatically extracted. Confidence score: 98%',
      isEditable: false,
    },
  ];

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitialsColor = (initials: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const renderEmailItem = (item: CommunicationItem) => (
    <div key={item.id} className="flex gap-3 pb-6">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
          <Mail className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-700 font-medium mb-1">
                <span className="font-semibold">From:</span> {item.from}
              </div>
              <div className="text-xs text-blue-700 mb-2">
                <span className="font-semibold">To:</span> {item.to}
              </div>
              <div className="text-sm font-semibold text-gray-950 mb-2">
                {item.subject}
              </div>
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(item.timestamp)}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );

  const renderCommentItem = (item: CommunicationItem) => (
    <div key={item.id} className="flex gap-3 pb-6">
      <div className="flex-shrink-0">
        <div className={`h-10 w-10 rounded-full ${getInitialsColor(item.userInitials)} flex items-center justify-center`}>
          <span className="text-sm font-medium text-white">{item.userInitials}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-semibold text-gray-950">{item.user}</span>
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(item.timestamp)}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNoteItem = (item: CommunicationItem) => (
    <div key={item.id} className="flex gap-3 pb-6">
      <div className="flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-yellow-500 flex items-center justify-center">
          <StickyNote className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-950">{item.user}</span>
            </div>
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimestamp(item.timestamp)}
            </div>
          </div>
          <div className="text-sm text-gray-700">
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* User Notes Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="h-5 w-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-gray-950">Your Notes</h3>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <textarea
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Add notes about this invoice (for now, mock only - not saved)..."
              className="w-full min-h-[100px] text-sm text-gray-700 bg-transparent border-none outline-none resize-none placeholder:text-gray-500"
            />
            <div className="flex justify-end mt-2">
              <button
                disabled
                className="px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-md opacity-50 cursor-not-allowed"
              >
                Save Note (Mock)
              </button>
            </div>
          </div>
        </div>

        {/* Communication Timeline */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-purple-600" />
            <h3 className="text-sm font-semibold text-gray-950">Communication History</h3>
          </div>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200"></div>

            {/* Communication items */}
            <div className="relative">
              {mockCommunications.map((item) => {
                if (item.type === 'email') return renderEmailItem(item);
                if (item.type === 'comment') return renderCommentItem(item);
                if (item.type === 'note') return renderNoteItem(item);
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Empty state if no communications */}
        {mockCommunications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No communication history yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
