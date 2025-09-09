'use client';

import React, { useEffect, useState } from 'react';
import { Package, Calendar, User, Truck, FileCheck, ChevronDown, Barcode, MapPin } from 'lucide-react';

interface GRLine {
  id: string;
  line_no: number;
  po_line_id: string;
  po_line_no?: number;
  description?: string;
  qty_received: number;
  qty_rejected?: number;
  qty_accepted?: number;
  uom: string;
  location?: string;
}

interface GRHeader {
  id: string;
  gr_number: string;
  po_id: string;
  po_number?: string;
  receipt_date: string;
  received_by_user_name?: string;
  status: string;
  reference?: string;
  warehouse_location?: string;
  delivery_note?: string;
  lines: GRLine[];
}

interface GRDocumentPreviewProps {
  poId?: string;
  poNumber?: string;
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
}

export function GRDocumentPreview({ 
  poId,
  poNumber,
  selectedLineId, 
  onLineSelect 
}: GRDocumentPreviewProps) {
  const [document, setDocument] = useState<GRHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (poId) {
      fetchDocument(poId);
    }
  }, [poId]);

  const fetchDocument = async (poId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/goods-receipts/by-po/${poId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setDocument(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching GR data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading Goods Receipt...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No Goods Receipt found</p>
          <p className="text-sm text-gray-400 mt-2">Receipt will appear here when goods are received</p>
        </div>
      </div>
    );
  }

  const totalReceived = document.lines.reduce((sum, line) => sum + line.qty_received, 0);
  const totalRejected = document.lines.reduce((sum, line) => sum + (line.qty_rejected || 0), 0);
  const totalAccepted = totalReceived - totalRejected;

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="min-h-full p-4">
        <div className="max-w-4xl mx-auto">
          {/* Paper-like container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-6 w-6 text-green-600" />
                    <h1 className="text-2xl font-bold text-gray-950">Goods Receipt</h1>
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{document.gr_number}</p>
                </div>
                
                <div className="text-right">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {document.status === 'posted' ? 'Posted' : 'Draft'}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{formatDate(document.receipt_date)}</p>
                </div>
              </div>
            </div>

            {/* Receipt Information */}
            <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Receipt Details</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Receipt Date</p>
                        <p className="text-sm font-medium text-gray-950">{formatDate(document.receipt_date)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Received By</p>
                        <p className="text-sm font-medium text-gray-950">{document.received_by_user_name || 'Warehouse Staff'}</p>
                      </div>
                    </div>

                    {document.reference && (
                      <div className="flex items-start gap-2">
                        <Truck className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Delivery Reference</p>
                          <p className="text-sm font-medium text-gray-950">{document.reference}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Purchase Order</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <FileCheck className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">PO Number</p>
                        <p className="text-sm font-medium text-purple-600">{poNumber || document.po_number || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Warehouse Location</p>
                        <p className="text-sm font-medium text-gray-950">{document.warehouse_location || 'WH-MAIN-01'}</p>
                      </div>
                    </div>

                    {document.delivery_note && (
                      <div className="flex items-start gap-2">
                        <Barcode className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500">Delivery Note</p>
                          <p className="text-sm font-medium text-gray-950">{document.delivery_note}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="px-8 py-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Received Items</h3>
              
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase">Line</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase">Received</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase">Rejected</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase">Accepted</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase">Location</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {document.lines.map((line) => {
                      const acceptedQty = line.qty_received - (line.qty_rejected || 0);
                      const isSelected = selectedLineId === line.id;
                      
                      return (
                        <tr
                          key={line.id}
                          className={`
                            hover:bg-gray-50 cursor-pointer transition-colors
                            ${isSelected ? 'bg-purple-50' : ''}
                          `}
                          onClick={() => onLineSelect?.(line.id)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-950">{line.line_no}</td>
                          <td className="px-4 py-3 text-sm text-gray-950">{line.description || 'Item'}</td>
                          <td className="px-4 py-3 text-sm text-gray-950 text-right">{line.qty_received}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={line.qty_rejected && line.qty_rejected > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                              {line.qty_rejected || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className="font-medium text-green-600">{acceptedQty}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-950 text-center">{line.uom}</td>
                          <td className="px-4 py-3 text-sm text-gray-950">{line.location || 'Main'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Received:</span>
                    <span className="font-medium text-gray-950">{totalReceived} units</span>
                  </div>
                  {totalRejected > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Rejected:</span>
                      <span className="font-medium text-red-600">-{totalRejected} units</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-300">
                    <span className="font-semibold text-gray-800">Total Accepted:</span>
                    <span className="font-bold text-green-600">{totalAccepted} units</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-gray-200 bg-gray-100 rounded-b-lg">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Document ID: {document.id}</span>
                <span>Goods Receipt Document</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}