'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, DollarSign, Calendar, Building2,
  User, Hash, CreditCard, MessageSquare, Send,
  Check, XCircle, Clock, AlertTriangle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  vendor_name_snapshot: string;
  invoice_date: string;
  due_date: string;
  currency: string;
  total: number;
  subtotal?: number;
  tax_total?: number;
  status: string;
  match_status: string;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  department?: string;
  po_numbers_cached?: string[];
  vendor_tax_id_snapshot?: string;
  vendor_address_snapshot?: any;
  terms_text?: string;
}

interface InvoiceDrawerProps {
  invoiceId: string;
  invoice?: Invoice;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function InvoiceDrawer({
  invoiceId,
  invoice,
  onClose,
  onApprove,
  onReject,
}: InvoiceDrawerProps) {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails();
      fetchComments();
    }
  }, [invoiceId]);

  const fetchInvoiceDetails = async () => {
    // Fetch additional invoice details if needed
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.slice(0, 5)); // Show last 5 activities
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    // Add comment logic here
    setNewComment('');
    fetchComments();
  };

  const formatCurrency = (amount: number, currency: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'posted':
        return <Check className="h-5 w-5 text-green-600" />;
      case 'rejected':
      case 'void':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'on_hold':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'paid':
        return <Check className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'posted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'void':
        return 'bg-red-100 text-red-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!invoice) return null;

  // Use portal to render at body level
  if (typeof window === 'undefined') return null;
  
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-[600px] bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Invoice #{invoice.invoice_number}
                </h2>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {getStatusIcon(invoice.status)}
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'text-purple-600 border-purple-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Activity ({comments.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Vendor Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Vendor:</span>
                      <span className="text-sm font-medium text-gray-900">{invoice.vendor_name_snapshot}</span>
                    </div>
                    {invoice.vendor_tax_id_snapshot && (
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Tax ID:</span>
                        <span className="text-sm font-medium text-gray-900">{invoice.vendor_tax_id_snapshot}</span>
                      </div>
                    )}
                    {invoice.vendor_address_snapshot && (
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm text-gray-600">Address:</span>
                        <span className="text-sm text-gray-900">
                          {typeof invoice.vendor_address_snapshot === 'string' 
                            ? invoice.vendor_address_snapshot 
                            : JSON.stringify(invoice.vendor_address_snapshot)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Invoice Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Invoice Number:</span>
                      <span className="text-sm font-medium text-gray-900">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Invoice Date:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(invoice.invoice_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Due Date:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(invoice.due_date)}</span>
                    </div>
                    {invoice.po_numbers_cached && invoice.po_numbers_cached.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">PO Numbers:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {invoice.po_numbers_cached.join(', ')}
                        </span>
                      </div>
                    )}
                    {invoice.department && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Department:</span>
                        <span className="text-sm font-medium text-gray-900">{invoice.department}</span>
                      </div>
                    )}
                    {invoice.assigned_to_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Assigned To:</span>
                        <span className="text-sm font-medium text-gray-900">{invoice.assigned_to_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Financial Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    {invoice.subtotal !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.subtotal, invoice.currency)}
                        </span>
                      </div>
                    )}
                    {invoice.tax_total !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Tax:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.tax_total, invoice.currency)}
                        </span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-purple-600">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Status */}
                {invoice.match_status && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Matching Status</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.match_status === 'matched' ? 'bg-green-100 text-green-800' :
                        invoice.match_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.match_status.charAt(0).toUpperCase() + invoice.match_status.slice(1)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Terms */}
                {invoice.terms_text && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Terms</h3>
                    <p className="text-sm text-gray-600">{invoice.terms_text}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                {/* Comment Input */}
                <div className="border rounded-lg p-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full resize-none border-0 outline-none text-sm"
                    rows={3}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="space-y-3">
                  {comments.length > 0 ? (
                    comments.map((comment, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.by_user_name || 'System'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {comment.event_type.replace(/_/g, ' ').toLowerCase()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No activity yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              {['pending', 'submitted', 'draft'].includes(invoice.status) && (
                <>
                  <button
                    onClick={() => onApprove(invoice.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="h-4 w-4" />
                    Approve Invoice
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for rejection:');
                      if (reason) {
                        onReject(invoice.id, reason);
                      }
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Invoice
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}