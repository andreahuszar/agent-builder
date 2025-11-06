'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, FileText, DollarSign, Calendar, Building2,
  User, Hash, CreditCard, MessageSquare, Send,
  Check, XCircle, Clock, AlertTriangle, Package, Image, TrendingUp,
  File, Coins, BookOpen, Link2
} from 'lucide-react';
import { SLABreachBanner } from './SLABreachBanner';
import { SLATimelineVisualization } from './SLATimelineVisualization';
import { SLAStatusPanel } from './SLAStatusPanel';
import { UnifiedActivityTab } from '../invoices/tabs/UnifiedActivityTab';
import { BusinessImpactPanel } from './BusinessImpactPanel';
import { EscalationPreviewPanel } from './EscalationPreviewPanel';
import { DocumentPreview } from '../invoices/DocumentPreview';
import { ResizablePanel } from '../invoices/ResizablePanel';
import { VendorCommunication } from '@/types/invoice';

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

  // SLA tracking
  assigned_at?: string;
  sla_hours?: number;
  sla_deadline?: string;
  sla_status?: 'on_time' | 'at_risk' | 'breached' | 'severe_breach';
  hours_overdue?: number;

  // Vendor communications
  vendor_communications?: VendorCommunication[];

  // Business impact
  payment_terms?: string;
  late_payment_penalty?: {
    applicable: boolean;
    rate: string;
    estimated_amount: number;
  };
  vendor_relationship_risk?: 'low' | 'medium' | 'high';

  // Escalation
  escalation_level?: number;
  escalation_to?: {
    name: string;
    role: string;
    email: string;
  };
}

interface InvoiceDrawerProps {
  invoiceId: string;
  invoice?: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}

export function InvoiceDrawer({
  invoiceId,
  invoice,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: InvoiceDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'escalation' | 'details' | 'line-items' | 'activity'>('preview');
  const [isSLAPanelCollapsed, setIsSLAPanelCollapsed] = useState(true);

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Trigger visibility animation when drawer opens
  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchInvoiceDetails();
      fetchComments();
      // Trigger animation after brief delay
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen, invoiceId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      // Reset tab to preview after animation completes
      setActiveTab('preview');
    }, 200);
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

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render at all when closed to avoid blocking interactions
  if (!isOpen && !isVisible) return null;

  if (!invoice) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Drawer with slide transition - no backdrop */}
      <div
        data-drawer="approvals-invoice"
        className={`absolute right-0 top-0 h-full w-[650px] bg-white shadow-2xl transform transition-transform duration-200 ease-in-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
                <h2 className="text-lg font-semibold text-gray-950">
                  {invoice.invoice_number}
                </h2>
              </div>
              {['pending_approval', 'requires_review', 'processing', 'validating', 'draft', 'pending', 'submitted'].includes(invoice.status) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const reason = prompt('Please provide a reason for rejection:');
                      if (reason) {
                        onReject(invoice.id, reason);
                      }
                    }}
                    className="box-border inline-flex items-center justify-center px-3 py-1.5 bg-white text-purple-900 text-sm font-medium rounded-md border border-purple-900 hover:bg-purple-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => onApprove(invoice.id)}
                    className="box-border inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-900 text-white text-sm font-medium rounded-md border border-transparent hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'text-purple-700 border-purple-700'
                    : 'text-gray-700 border-transparent hover:text-gray-900'
                }`}
              >
                <Image className="h-4 w-4" />
                Preview
              </button>
              {(invoice.sla_status === 'breached' || invoice.sla_status === 'severe_breach') && (
                <button
                  onClick={() => setActiveTab('escalation')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'escalation'
                      ? 'text-purple-700 border-purple-700'
                      : 'text-red-700 border-transparent hover:text-red-900'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Escalation
                </button>
              )}
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'text-purple-700 border-purple-700'
                    : 'text-gray-700 border-transparent hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('line-items')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'line-items'
                    ? 'text-purple-700 border-purple-700'
                    : 'text-gray-700 border-transparent hover:text-gray-900'
                }`}
              >
                <Package className="h-4 w-4" />
                Line Items
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'activity'
                    ? 'text-purple-700 border-purple-700'
                    : 'text-gray-700 border-transparent hover:text-gray-900'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Activity
                {invoice.vendor_communications && invoice.vendor_communications.length > 0 && (
                  <span className="text-xs">({invoice.vendor_communications.length})</span>
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'preview' && (
              (() => {
                const hasSLA = invoice.assigned_at && invoice.sla_hours;
                const documentPreview = (
                  <DocumentPreview
                    key={`doc-preview-${invoiceId}`}
                    invoiceId={invoiceId}
                    hasAttachment={false}
                    invoiceData={invoice}
                    matchResults={[]}
                    poComparisonData={null}
                    hideLineItems={true}
                  />
                );

                // If no SLA data, show only document preview
                if (!hasSLA) {
                  return <div className="h-full">{documentPreview}</div>;
                }

                // If collapsed, show document with fixed SLA bar at bottom
                if (isSLAPanelCollapsed) {
                  return (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 overflow-hidden">{documentPreview}</div>
                      <div className="flex-shrink-0" style={{ height: '49px' }}>
                        <SLAStatusPanel
                          invoiceId={invoiceId}
                          invoiceData={invoice}
                          isCollapsed={true}
                          onToggleCollapse={() => setIsSLAPanelCollapsed(false)}
                          onNavigateToTab={(tabName) => setActiveTab(tabName as any)}
                        />
                      </div>
                    </div>
                  );
                }

                // If expanded, use ResizablePanel
                return (
                  <ResizablePanel
                    defaultSizes={[55, 45]}
                    minSizes={[40, 30]}
                    maxSizes={[70, 60]}
                    direction="vertical"
                    storageKey={`approvals-invoice-preview-${invoiceId}`}
                    className="h-full"
                  >
                    <div className="h-full">{documentPreview}</div>
                    <div className="h-full">
                      <SLAStatusPanel
                        invoiceId={invoiceId}
                        invoiceData={invoice}
                        isCollapsed={false}
                        onToggleCollapse={() => setIsSLAPanelCollapsed(true)}
                        onNavigateToTab={(tabName) => setActiveTab(tabName as any)}
                      />
                    </div>
                  </ResizablePanel>
                );
              })()
            )}

            {activeTab === 'details' && (
              <div className="h-full overflow-y-auto">
                <div className="space-y-0">
                  {/* Vendor Information */}
                  <div className="border-t border-gray-200">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Vendor Information</h3>
                    </div>
                    <div className="px-6 pt-4 pb-6 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Vendor Name</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{invoice.vendor_name_snapshot}</div>
                        </div>
                        {invoice.vendor_tax_id_snapshot && (
                          <div>
                            <label className="text-xs font-medium text-gray-600">Tax ID</label>
                            <div className="text-sm font-medium text-gray-950 mt-1">{invoice.vendor_tax_id_snapshot}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Invoice Information */}
                  <div className="border-t border-gray-200">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                      <File className="h-4 w-4 text-purple-600" />
                      <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Invoice Information</h3>
                    </div>
                    <div className="px-6 pt-4 pb-6 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Invoice Number</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{invoice.invoice_number}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Invoice Date</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{formatDate(invoice.invoice_date)}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Due Date</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{formatDate(invoice.due_date)}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Vendor</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{invoice.vendor_name_snapshot}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="border-t border-gray-200">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                      <Coins className="h-4 w-4 text-purple-600" />
                      <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Financial Details</h3>
                    </div>
                    <div className="px-6 pt-4 pb-6 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Subtotal</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {formatCurrency(invoice.subtotal || 0, invoice.currency)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Currency</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{invoice.currency}</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Tax Rate (%)</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {invoice.tax_total && invoice.subtotal
                              ? ((invoice.tax_total / invoice.subtotal) * 100).toFixed(1) + '%'
                              : '-'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Shipping/Freight</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">-</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Tax Amount</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {formatCurrency(invoice.tax_total || 0, invoice.currency)}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Discount</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">-</div>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-semibold text-gray-950">Invoice Total</label>
                          <div className="text-lg font-bold text-gray-950">
                            {formatCurrency(invoice.total, invoice.currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accounting Classification */}
                  <div className="border-t border-gray-200">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                      <BookOpen className="h-4 w-4 text-purple-600" />
                      <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Accounting Classification</h3>
                    </div>
                    <div className="px-6 pt-4 pb-6 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Ledger Account</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">Accounts Payable</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Cost Center</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {invoice.department || 'General & Administrative'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">GL Code</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">GL-5000</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Department</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {invoice.department || 'US Inc'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="border-t border-gray-200">
                    <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                      <CreditCard className="h-4 w-4 text-purple-600" />
                      <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Payment Information</h3>
                    </div>
                    <div className="px-6 pt-4 pb-6 bg-white">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Payment Method</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">Bank Transfer</div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Payment Terms</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">
                            {invoice.payment_terms || 'Net 30 days'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Due Date</label>
                          <div className="text-sm font-medium text-gray-950 mt-1">{formatDate(invoice.due_date)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assignment */}
                  {invoice.assigned_to_name && (
                    <div className="border-t border-gray-200">
                      <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 border-b border-gray-200">
                        <User className="h-4 w-4 text-purple-600" />
                        <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Assignment</h3>
                      </div>
                      <div className="px-6 pt-4 pb-6 bg-white">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600">Assigned To</label>
                            <div className="text-sm font-medium text-gray-950 mt-1">{invoice.assigned_to_name}</div>
                          </div>
                          {invoice.department && (
                            <div>
                              <label className="text-xs font-medium text-gray-600">Department</label>
                              <div className="text-sm font-medium text-gray-950 mt-1">{invoice.department}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'line-items' && (
              <div className="h-full overflow-y-auto">
                {invoice.lines && invoice.lines.length > 0 ? (
                  <div>
                    {/* Line Items Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-purple-600" />
                        <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">Line Items</h3>
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          {invoice.lines.length} {invoice.lines.length === 1 ? 'item' : 'items'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          <Check className="h-3 w-3" />
                          Valid
                        </span>
                      </div>
                    </div>

                    {/* Table Header */}
                    <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700">
                        <div className="col-span-1">#</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-1 text-center">Qty</div>
                        <div className="col-span-1 text-center">UOM</div>
                        <div className="col-span-2 text-right">Unit Price</div>
                        <div className="col-span-2 text-right">Total</div>
                        <div className="col-span-1 text-center">Status</div>
                      </div>
                    </div>

                    {/* Table Rows */}
                    <div>
                      {invoice.lines.map((line: any, index: number) => (
                        <div
                          key={index}
                          className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="grid grid-cols-12 gap-2 items-center">
                            <div className="col-span-1 text-sm font-medium text-gray-950">
                              {line.line_no}
                            </div>
                            <div className="col-span-4 text-sm text-gray-950">
                              {line.description}
                            </div>
                            <div className="col-span-1 text-sm text-center text-gray-950">
                              {line.qty}
                            </div>
                            <div className="col-span-1 text-sm text-center text-gray-950">
                              {line.uom}
                            </div>
                            <div className="col-span-2 text-sm text-right text-gray-950">
                              {formatCurrency(line.unit_price, invoice.currency)}
                            </div>
                            <div className="col-span-2 text-sm text-right font-medium text-gray-950">
                              {formatCurrency(line.line_total, invoice.currency)}
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                    <Package className="h-12 w-12 mb-3" />
                    <p className="text-sm">No line items found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <UnifiedActivityTab
                invoiceId={invoiceId}
                invoiceNumber={invoice?.invoice_number}
              />
            )}

            {activeTab === 'escalation' && (
              <div className="h-full p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Current Status Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-950">Current Status</h4>
                    <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="space-y-3">
                        {/* Assigned To */}
                        {invoice.assigned_to_name && (
                          <div className="flex items-start gap-3">
                            <User className="h-4 w-4 text-gray-600 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm text-gray-950 font-medium">
                                Assigned to: {invoice.assigned_to_name}
                              </div>
                              {invoice.assigned_at && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {new Date(invoice.assigned_at).toLocaleString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })} ({(() => {
                                    const now = new Date();
                                    const assigned = new Date(invoice.assigned_at);
                                    const diffMs = now.getTime() - assigned.getTime();
                                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                    return diffDays > 0 ? `${diffDays} day${diffDays !== 1 ? 's' : ''} ago` : `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                                  })()})
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SLA Status */}
                        {invoice.sla_status && (
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-gray-600" />
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-950">SLA Status:</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                invoice.sla_status === 'severe_breach' ? 'bg-red-100 text-red-700' :
                                invoice.sla_status === 'breached' ? 'bg-orange-100 text-orange-700' :
                                invoice.sla_status === 'at_risk' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {invoice.sla_status === 'severe_breach' ? 'Severely Breached' :
                                 invoice.sla_status === 'breached' ? 'Breached' :
                                 invoice.sla_status === 'at_risk' ? 'At Risk' :
                                 'On Time'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Escalation Path */}
                        {invoice.assigned_to_name && invoice.escalation_to && (
                          <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-gray-600" />
                            <div className="text-sm text-gray-950">
                              Escalation Path: <span className="font-medium">{invoice.assigned_to_name}</span> → <span className="font-medium">{invoice.escalation_to.name}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Business Impact Panel */}
                  {(invoice.late_payment_penalty || invoice.vendor_relationship_risk || invoice.payment_terms) && (
                    <BusinessImpactPanel
                      latePaymentPenalty={invoice.late_payment_penalty}
                      vendorRelationshipRisk={invoice.vendor_relationship_risk}
                      paymentTerms={invoice.payment_terms}
                      total={invoice.total}
                      currency={invoice.currency}
                    />
                  )}

                  {/* Escalation Preview Panel */}
                  {invoice.escalation_to && invoice.assigned_at && invoice.sla_hours && invoice.hours_overdue && (
                    <EscalationPreviewPanel
                      invoiceNumber={invoice.invoice_number}
                      vendorName={invoice.vendor_name_snapshot}
                      total={invoice.total}
                      currency={invoice.currency}
                      dueDate={invoice.due_date}
                      escalationTo={invoice.escalation_to}
                      hoursOverdue={invoice.hours_overdue}
                      assignedTo={invoice.assigned_to_name || 'Unassigned'}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}