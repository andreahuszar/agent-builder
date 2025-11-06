import React, { useState } from 'react';
import { Mail, Phone, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { VendorCommunication } from '@/types/invoice';

interface VendorCommunicationHubProps {
  communications: VendorCommunication[];
}

/**
 * VendorCommunicationHub - Tabbed interface for vendor communications
 *
 * Shows evidence of vendor chasing organized by type:
 * - Emails: Email communications with escalating urgency
 * - Calls: Phone call log with notes
 * - Notes: Internal notes about vendor relationship
 */
export function VendorCommunicationHub({
  communications
}: VendorCommunicationHubProps) {
  const [activeTab, setActiveTab] = useState<'emails' | 'calls' | 'notes'>('emails');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const emails = communications.filter(c => c.type === 'email');
  const calls = communications.filter(c => c.type === 'phone');
  const notes = communications.filter(c => c.type === 'note');

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'polite':
        return 'text-gray-600 bg-gray-100';
      case 'urgent':
        return 'text-amber-700 bg-amber-100';
      case 'escalated':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const tabs = [
    { id: 'emails' as const, label: 'Emails', icon: Mail, count: emails.length },
    { id: 'calls' as const, label: 'Calls', icon: Phone, count: calls.length },
    { id: 'notes' as const, label: 'Notes', icon: FileText, count: notes.length },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-950">Vendor Communications</h4>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center px-1 py-3 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`-ml-0.5 mr-2 h-4 w-4 ${
                activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
              }`} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* Emails Tab */}
        {activeTab === 'emails' && (
          <div className="space-y-3">
            {emails.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No email communications</p>
            ) : (
              emails.map((email) => {
                const isExpanded = expandedItems.has(email.id);
                return (
                  <div
                    key={email.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                  >
                    <button
                      onClick={() => toggleExpanded(email.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-950 line-clamp-1">
                              {email.subject}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getToneColor(email.tone)}`}>
                              {email.tone}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{email.from}</span>
                            <span>•</span>
                            <span>{formatTimestamp(email.timestamp)}</span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                    </button>
                    {isExpanded && email.preview && (
                      <div className="px-4 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {email.preview}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <div className="space-y-3">
            {calls.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No phone communications</p>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className="border border-gray-200 rounded-lg p-3 shadow-sm hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-950">{call.from}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getToneColor(call.tone)}`}>
                          {call.tone}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                        <span>{formatTimestamp(call.timestamp)}</span>
                        {call.duration && (
                          <>
                            <span>•</span>
                            <span>{call.duration} min</span>
                          </>
                        )}
                      </div>
                      {call.notes && (
                        <p className="text-sm text-gray-700">{call.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No internal notes</p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="border border-gray-200 rounded-lg p-3 shadow-sm hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-2">
                        {formatTimestamp(note.timestamp)}
                      </div>
                      {note.notes && (
                        <p className="text-sm text-gray-700">{note.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
