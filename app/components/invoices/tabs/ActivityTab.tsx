'use client';

import React, { useEffect, useState } from 'react';
import { Clock, User, Edit, Check, X, RefreshCw, Upload, Link, FileCheck } from 'lucide-react';

interface AuditEvent {
  id: string;
  event_type: string;
  by_user_id?: string;
  by_user_name?: string;
  at: string;
  payload_json?: any;
}

interface ActivityTabProps {
  invoiceId: string;
}

export function ActivityTab({ invoiceId }: ActivityTabProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAuditEvents();
  }, [invoiceId]);

  const fetchAuditEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
      case 'uploaded':
        return <Upload className="h-4 w-4" />;
      case 'edited':
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'approved':
        return <Check className="h-4 w-4" />;
      case 'rejected':
        return <X className="h-4 w-4" />;
      case 'matched':
      case 'rerun_matching':
        return <RefreshCw className="h-4 w-4" />;
      case 'linked_po':
        return <Link className="h-4 w-4" />;
      case 'posted':
        return <FileCheck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
      case 'uploaded':
        return 'bg-blue-100 text-blue-800';
      case 'edited':
      case 'updated':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'matched':
      case 'rerun_matching':
        return 'bg-purple-100 text-purple-800';
      case 'posted':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventDescription = (event: AuditEvent) => {
    const user = event.by_user_name || 'System';
    
    switch (event.event_type) {
      case 'created':
        return `${user} created the invoice`;
      case 'uploaded':
        return `${user} uploaded the invoice document`;
      case 'edited':
        const fields = event.payload_json?.fields_changed?.join(', ') || 'details';
        return `${user} edited ${fields}`;
      case 'approved':
        return `${user} approved the invoice`;
      case 'rejected':
        const reason = event.payload_json?.reason || '';
        return `${user} rejected the invoice${reason ? `: ${reason}` : ''}`;
      case 'matched':
        const matchStatus = event.payload_json?.match_status || 'processed';
        return `System matched invoice - ${matchStatus}`;
      case 'rerun_matching':
        return `${user} triggered matching re-run`;
      case 'linked_po':
        const poNumber = event.payload_json?.po_number || '';
        return `${user} linked PO ${poNumber}`;
      case 'posted':
        return `${user} posted invoice to ERP`;
      case 'status_change':
        const fromStatus = event.payload_json?.from || 'unknown';
        const toStatus = event.payload_json?.to || 'unknown';
        return `Status changed from ${fromStatus} to ${toStatus}`;
      default:
        return `${user} performed ${event.event_type.replace('_', ' ')}`;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Mock data for demonstration
  const mockEvents: AuditEvent[] = [
    {
      id: '1',
      event_type: 'created',
      by_user_name: 'John Smith',
      at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      payload_json: {},
    },
    {
      id: '2',
      event_type: 'uploaded',
      by_user_name: 'John Smith',
      at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
      payload_json: {},
    },
    {
      id: '3',
      event_type: 'matched',
      by_user_name: 'System',
      at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      payload_json: { match_status: 'partially_matched' },
    },
    {
      id: '4',
      event_type: 'edited',
      by_user_name: 'Sarah Johnson',
      at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      payload_json: { fields_changed: ['due_date', 'payment_terms'] },
    },
    {
      id: '5',
      event_type: 'rerun_matching',
      by_user_name: 'Sarah Johnson',
      at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      payload_json: {},
    },
    {
      id: '6',
      event_type: 'matched',
      by_user_name: 'System',
      at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 60000).toISOString(),
      payload_json: { match_status: 'matched' },
    },
    {
      id: '7',
      event_type: 'approved',
      by_user_name: 'Mike Chen',
      at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      payload_json: {},
    },
  ];

  const displayEvents = events.length > 0 ? events : mockEvents;

  return (
    <div className="h-full overflow-y-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-950">Activity Timeline</h3>
        <button
          onClick={fetchAuditEvents}
          className="text-sm text-purple-600 hover:text-purple-700"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Timeline */}
      <div className="flow-root">
        <ul className="-mb-8">
          {displayEvents.map((event, eventIdx) => (
            <li key={event.id}>
              <div className="relative pb-8">
                {eventIdx !== displayEvents.length - 1 ? (
                  <span
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span
                      className={`
                        h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                        ${getEventColor(event.event_type)}
                      `}
                    >
                      {getEventIcon(event.event_type)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-sm text-gray-950">
                        {formatEventDescription(event)}
                      </p>
                      {event.payload_json?.details && (
                        <p className="mt-1 text-xs text-gray-500">
                          {event.payload_json.details}
                        </p>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                      {formatDate(event.at)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {displayEvents.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No activity recorded yet</p>
        </div>
      )}
    </div>
  );
}