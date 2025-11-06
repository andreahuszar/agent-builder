'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MessageSquare, Mail, Upload, Edit, Check, X,
  RefreshCw, Link, FileCheck, Clock, Send, User, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';

// Unified timeline item type
interface TimelineItem {
  id: string;
  type: 'system_event' | 'user_comment' | 'email';
  timestamp: string;
  user: string;
  userInitials?: string;

  // For system events
  eventType?: string; // created, uploaded, matched, edited, etc.

  // For emails
  from?: string;
  to?: string;
  subject?: string;
  ticketRef?: string;

  // Common
  message: string;
  payload?: any;
}

interface UnifiedActivityTabProps {
  invoiceId: string;
  invoiceNumber?: string;
  onCommentsCountChange?: (count: number) => void;
}

export function UnifiedActivityTab({ invoiceId, invoiceNumber, onCommentsCountChange }: UnifiedActivityTabProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'comments' | 'email' | 'system'>('all');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Count ONLY real user comments (not system events or emails)
  const realCommentsCount = useMemo(() =>
    timelineItems.filter(item => item.type === 'user_comment').length,
    [timelineItems]
  );

  // Filter timeline items based on selected filter
  const filteredTimelineItems = useMemo(() => {
    switch (filter) {
      case 'comments':
        return timelineItems.filter(item => item.type === 'user_comment');
      case 'email':
        return timelineItems.filter(item => item.type === 'email');
      case 'system':
        return timelineItems.filter(item => item.type === 'system_event');
      default:
        return timelineItems;
    }
  }, [timelineItems, filter]);

  // Calculate counts for each filter type
  const filterCounts = useMemo(() => {
    return {
      all: timelineItems.length,
      comments: timelineItems.filter(item => item.type === 'user_comment').length,
      email: timelineItems.filter(item => item.type === 'email').length,
      system: timelineItems.filter(item => item.type === 'system_event').length,
    };
  }, [timelineItems]);

  // Get filter label with count
  const getFilterLabel = (filterType: typeof filter) => {
    const labels = {
      all: 'All Activities',
      comments: 'Comments',
      email: 'Email',
      system: 'System',
    };
    const count = filterCounts[filterType];
    return `${labels[filterType]} (${count})`;
  };

  // Notify parent component when comments count changes
  useEffect(() => {
    if (onCommentsCountChange) {
      onCommentsCountChange(realCommentsCount);
    }
  }, [realCommentsCount, onCommentsCountChange]);

  useEffect(() => {
    setIsInitialLoad(true); // Reset on invoice change
    fetchUnifiedTimeline();
  }, [invoiceId]);

  // Scroll to bottom when data loads or new comment is added
  useEffect(() => {
    if (bottomRef.current && timelineItems.length > 0) {
      // Instant scroll on initial load, smooth scroll for new comments
      bottomRef.current.scrollIntoView({ behavior: isInitialLoad ? 'auto' : 'smooth' });
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [timelineItems.length, isInitialLoad]);

  const fetchUnifiedTimeline = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement actual API calls when endpoints are ready
      // For now, use mock data merged from Activity + Communication
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockTimeline = getMockTimelineData();
      setTimelineItems(mockTimeline);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMockTimelineData = (): TimelineItem[] => {
    // Special timeline for severe SLA breach invoice (sla-severe-1)
    if (invoiceId === 'sla-severe-1') {
      const events: TimelineItem[] = [
        // 1. System Event: Invoice created (8 days ago)
        {
          id: 'sys-1',
          type: 'system_event',
          eventType: 'created',
          user: 'System',
          timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'System created the invoice from uploaded document',
        },
        // 2. System Event: Document uploaded (8 days ago, 1 min later)
        {
          id: 'sys-2',
          type: 'system_event',
          eventType: 'uploaded',
          user: 'AP Team',
          timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
          message: 'AP Team uploaded the invoice document',
        },
        // 3. System Event: Assigned to Caroline Walsh (5 days ago) ← SLA starts
        {
          id: 'sys-3',
          type: 'system_event',
          eventType: 'assigned',
          user: 'System',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          message: 'System assigned invoice to Caroline Walsh for approval (SLA: 48 hours)',
        },
        // 4. Email FROM vendor: Initial inquiry (4 days ago)
        {
          id: 'email-1',
          type: 'email',
          user: 'accounts@industrialeq.com',
          userInitials: 'IE',
          from: 'accounts@industrialeq.com',
          to: 'ap@xelix.com',
          subject: 'Payment Inquiry - Invoice SLA-2025-0003',
          message: `Dear AP Team,\n\nWe wanted to follow up on invoice SLA-2025-0003 dated ${new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toLocaleDateString()} for $29,700.00.\n\nCould you please confirm receipt and provide an expected payment date?\n\nBest regards,\nAccounts Receivable\nIndustrial Equipment Corp`,
          timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
        // 5. Email TO vendor: AP response (3.5 days ago)
        {
          id: 'email-2',
          type: 'email',
          user: 'ap@xelix.com',
          userInitials: 'AP',
          from: 'ap@xelix.com',
          to: 'accounts@industrialeq.com',
          subject: 'RE: Payment Inquiry - Invoice SLA-2025-0003',
          message: 'Thank you for your inquiry. We have received invoice SLA-2025-0003 and it is currently being reviewed by our approvals team. We will update you on the payment timeline shortly.',
          timestamp: new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
        // 6. Email FROM vendor: Follow-up getting urgent (3 days ago)
        {
          id: 'email-3',
          type: 'email',
          user: 'accounts@industrialeq.com',
          userInitials: 'IE',
          from: 'accounts@industrialeq.com',
          to: 'ap@xelix.com',
          subject: 'Follow-up: Payment Status - Invoice SLA-2025-0003',
          message: 'We have not yet received a response with a specific payment timeline. Please advise on the payment schedule for invoice SLA-2025-0003 ($29,700.00). This invoice is approaching the payment due date and we need to update our cash flow forecasts.',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
        // 7. Internal Comment: Caroline notes concern (2.5 days ago)
        {
          id: 'comment-1',
          type: 'user_comment',
          user: 'Caroline Walsh',
          userInitials: 'CW',
          message: 'I need to verify the equipment delivery dates with Operations before approving. This is a non-PO invoice and I want to confirm all items were received as specified. Reaching out to warehouse manager.',
          timestamp: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        // 8. Email TO vendor: AP apologizing for delay (2 days ago)
        {
          id: 'email-4',
          type: 'email',
          user: 'ap@xelix.com',
          userInitials: 'AP',
          from: 'ap@xelix.com',
          to: 'accounts@industrialeq.com',
          subject: 'RE: Follow-up: Payment Status - Invoice SLA-2025-0003',
          message: 'We apologize for the delay. The invoice is in final approval review. We are working to process this as quickly as possible and will provide you with a payment date within 24-48 hours.',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
        // 9. Email FROM vendor: URGENT - mentioning penalties (1.5 days ago)
        {
          id: 'email-5',
          type: 'email',
          user: 'accounts@industrialeq.com',
          userInitials: 'IE',
          from: 'accounts@industrialeq.com',
          to: 'ap@xelix.com',
          subject: 'URGENT: Overdue Payment - Invoice SLA-2025-0003',
          message: 'This is our third attempt to contact you regarding invoice SLA-2025-0003 for $29,700.00. The payment is now significantly overdue.\n\nPlease note that late payment penalties may apply per our contract terms (1.5% per month). We require immediate attention to this matter to maintain our business relationship.\n\nExpected penalty if not resolved: $371.25',
          timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
        // 10. Email FROM vendor: FINAL NOTICE - CFO escalation (4 hours ago)
        {
          id: 'email-6',
          type: 'email',
          user: 'robert.chen@industrialeq.com',
          userInitials: 'RC',
          from: 'robert.chen@industrialeq.com',
          to: 'ap@xelix.com',
          subject: 'FINAL NOTICE: Escalation to Management - Invoice SLA-2025-0003',
          message: 'Dear Sir/Madam,\n\nDue to continued non-response regarding invoice SLA-2025-0003 ($29,700.00), this matter is being escalated to our senior management and your procurement team.\n\nLate payment penalties totaling $371.25 are now applicable per our contract terms. We expect immediate resolution within 24 hours to avoid further escalation.\n\nOur CFO will be contacting your Finance Manager directly if this remains unresolved.\n\nRobert Chen\nCFO, Industrial Equipment Corp',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          ticketRef: 'TICKET-891234',
        },
      ];

      return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    // Default/generic timeline for other invoices
    const events: TimelineItem[] = [
      // System events from ActivityTab
      {
        id: 'sys-1',
        type: 'system_event',
        eventType: 'created',
        user: 'John Smith',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'John Smith created the invoice',
      },
      {
        id: 'sys-2',
        type: 'system_event',
        eventType: 'uploaded',
        user: 'John Smith',
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
        message: 'John Smith uploaded the invoice document',
      },
      {
        id: 'sys-3',
        type: 'system_event',
        eventType: 'matched',
        user: 'System',
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'System matched invoice - partially_matched',
        payload: { match_status: 'partially_matched' },
      },
      // Email from CommunicationTab
      {
        id: 'email-1',
        type: 'email',
        user: 'vendor@acmecorp.com',
        userInitials: 'AC',
        from: 'vendor@acmecorp.com',
        to: 'ap@xelix.com',
        subject: `RE: Invoice ${invoiceNumber} - Additional Documentation`,
        message: 'Attached is the updated delivery receipt you requested. Please let me know if you need anything else.',
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        ticketRef: 'TICKET-389688',
      },
      {
        id: 'sys-4',
        type: 'system_event',
        eventType: 'edited',
        user: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Sarah Johnson edited due_date, payment_terms',
        payload: { fields_changed: ['due_date', 'payment_terms'] },
      },
      // User comments from CommunicationTab
      {
        id: 'comment-1',
        type: 'user_comment',
        user: 'Sarah Chen',
        userInitials: 'SC',
        message: 'I verified the PO match and approved the variance. The price difference was due to the negotiated discount applied at invoice time.',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'sys-5',
        type: 'system_event',
        eventType: 'rerun_matching',
        user: 'Sarah Johnson',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        message: 'Sarah Johnson triggered matching re-run',
      },
      {
        id: 'sys-6',
        type: 'system_event',
        eventType: 'matched',
        user: 'System',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
        message: 'System matched invoice - matched',
        payload: { match_status: 'matched' },
      },
      {
        id: 'comment-2',
        type: 'user_comment',
        user: 'Maria Garcia',
        userInitials: 'MG',
        message: 'Great work team! This is ready for posting.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      // Email response
      {
        id: 'email-2',
        type: 'email',
        user: 'ap@xelix.com',
        userInitials: 'AP',
        from: 'ap@xelix.com',
        to: 'vendor@acmecorp.com',
        subject: `Invoice ${invoiceNumber} - Payment Scheduled`,
        message: 'Thank you for the additional documentation. Payment has been scheduled for next week.',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        ticketRef: 'TICKET-389688',
      },
      {
        id: 'sys-7',
        type: 'system_event',
        eventType: 'approved',
        user: 'Mike Chen',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        message: 'Mike Chen approved the invoice',
      },
    ];

    // Sort by timestamp (oldest first, newest last at bottom)
    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
      case 'uploaded':
        return Upload;
      case 'edited':
      case 'updated':
        return Edit;
      case 'approved':
        return Check;
      case 'rejected':
        return X;
      case 'matched':
      case 'rerun_matching':
        return RefreshCw;
      case 'linked_po':
        return Link;
      case 'posted':
        return FileCheck;
      default:
        return Clock;
    }
  };

  const getUserColor = (initials: string) => {
    const colors = [
      '#db2777', // pink-600 - darker pink
      '#be185d', // pink-700 - even darker pink
      '#9f1239', // pink-800 - darkest pink
      '#ec4899', // pink-500 - medium pink
      '#d946ef', // fuchsia-500 - fuchsia
      '#c026d3', // fuchsia-600 - darker fuchsia
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const comment: TimelineItem = {
      id: `comment-${Date.now()}`,
      type: 'user_comment',
      user: 'You',
      userInitials: 'YO',
      message: newComment.trim(),
      timestamp: new Date().toISOString(),
    };

    setTimelineItems([...timelineItems, comment]);
    setNewComment('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const renderSystemEvent = (item: TimelineItem) => {
    const Icon = getEventIcon(item.eventType || '');

    return (
      <div key={item.id} className="relative pb-6">
        {/* Timeline connector */}
        <span className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />

        <div className="relative flex space-x-3">
          {/* Icon */}
          <div>
            <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white">
              <Icon className="h-4 w-4 text-gray-600" />
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1.5">
            {/* Name and timestamp at top */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-950">{item.user}</span>
              <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
            </div>
            {/* Message bubble - gray, no border */}
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-950">{item.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserComment = (item: TimelineItem) => {
    return (
      <div key={item.id} className="relative pb-6">
        {/* Timeline connector */}
        <span className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />

        <div className="relative flex space-x-3">
          {/* Avatar */}
          <div>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: getUserColor(item.userInitials || 'U') }}
            >
              <span className="text-xs font-medium text-white">{item.userInitials || 'U'}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1.5">
            {/* Name and timestamp at top */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-950">{item.user}</span>
              <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
            </div>
            {/* Message bubble - blue for internal comments */}
            <div className="bg-blue-50 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-950 whitespace-pre-wrap">{item.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmail = (item: TimelineItem) => {
    return (
      <div key={item.id} className="relative pb-6">
        {/* Timeline connector */}
        <span className="absolute left-4 top-10 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />

        <div className="relative flex space-x-3">
          {/* Icon - ALL PURPLE, no blue */}
          <div>
            <span className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center ring-8 ring-white">
              <Mail className="h-4 w-4 text-purple-700" />
            </span>
          </div>

          {/* Content - ALL PURPLE, no border */}
          <div className="flex-1 min-w-0 pt-1.5">
            {/* From/To and timestamp at top */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs text-gray-950">
                <span className="font-semibold">From:</span> <span className="text-purple-700">{item.from}</span>
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-950">
                <span className="font-semibold">To:</span> <span className="text-purple-700">{item.to}</span>
              </span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</span>
              {item.ticketRef && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <button
                    onClick={() => console.log('Open ticket:', item.ticketRef)}
                    className="text-xs text-purple-700 hover:underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 rounded px-1"
                  >
                    {item.ticketRef}
                  </button>
                </>
              )}
            </div>
            {/* Email bubble - purple, no border */}
            <div className="bg-purple-100 rounded-lg px-4 py-3">
              {item.subject && (
                <div className="text-sm font-semibold text-gray-950 mb-2">
                  {item.subject}
                </div>
              )}
              <p className="text-sm text-gray-950">{item.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimelineItem = (item: TimelineItem, index: number) => {
    const isLast = index === timelineItems.length - 1;

    // Remove connector line from last item
    const itemElement = (() => {
      switch (item.type) {
        case 'system_event':
          return renderSystemEvent(item);
        case 'user_comment':
          return renderUserComment(item);
        case 'email':
          return renderEmail(item);
        default:
          return null;
      }
    })();

    // If it's the last item, remove the timeline connector
    if (isLast && itemElement) {
      return React.cloneElement(itemElement as React.ReactElement, {
        key: item.id,
        className: (itemElement as React.ReactElement).props.className?.replace('pb-6', 'pb-0'),
        children: React.Children.map((itemElement as React.ReactElement).props.children, (child: any) => {
          if (child?.props?.className?.includes('absolute left-4')) {
            return null; // Remove timeline connector
          }
          return child;
        })
      });
    }

    return itemElement;
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center px-4 py-2 border-b border-gray-200 bg-gray-50">
          <MessageSquare className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider ml-2">
            ACTIVITY
          </h3>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Filter Dropdown */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider ml-2">
              ACTIVITY
            </h3>
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-950 bg-white rounded-md border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
                {getFilterLabel(filter)}
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setFilter('all')}
                className={`cursor-pointer ${filter === 'all' ? 'bg-purple-50 text-purple-900 font-medium' : ''}`}
              >
                {getFilterLabel('all')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter('comments')}
                className={`cursor-pointer ${filter === 'comments' ? 'bg-purple-50 text-purple-900 font-medium' : ''}`}
              >
                {getFilterLabel('comments')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter('email')}
                className={`cursor-pointer ${filter === 'email' ? 'bg-purple-50 text-purple-900 font-medium' : ''}`}
              >
                {getFilterLabel('email')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter('system')}
                className={`cursor-pointer ${filter === 'system' ? 'bg-purple-50 text-purple-900 font-medium' : ''}`}
              >
                {getFilterLabel('system')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Timeline Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filteredTimelineItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm text-gray-600">
              {filter === 'all' ? 'No activity yet' : `No ${filter} to display`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {filter === 'all' ? 'Be the first to add a comment' : 'Try changing the filter'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {filteredTimelineItems.map((item, index) => renderTimelineItem(item, index))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Chat Input - Fixed Bottom */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex-shrink-0">
        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (Cmd/Ctrl + Enter to send)"
            className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-950 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <button
            onClick={handleSendComment}
            disabled={!newComment.trim()}
            className="flex-shrink-0 px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2"
            aria-label="Send comment"
          >
            <Send className="h-4 w-4" />
            <span className="text-sm font-medium">Send</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Cmd/Ctrl + Enter to send
        </p>
      </div>
    </div>
  );
}
