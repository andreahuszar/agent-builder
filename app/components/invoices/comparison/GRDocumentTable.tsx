'use client';

import React, { useEffect, useState } from 'react';
import { Package, Calendar, User, Truck, FileCheck, ChevronDown } from 'lucide-react';

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

interface SESLine {
  id: string;
  po_line_id: string;
  po_line_no?: number;
  description?: string;
  qty_serviced: number;
  uom: string;
  period_start?: string;
  period_end?: string;
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
  lines: GRLine[];
}

interface SESHeader {
  id: string;
  ses_number?: string;
  po_id: string;
  po_number?: string;
  service_period_start: string;
  service_period_end: string;
  approved_by_user_name?: string;
  status: string;
  lines: SESLine[];
}

type DocumentType = 'GR' | 'SES';

interface GRDocumentTableProps {
  poId?: string;
  documentType?: DocumentType;
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
}

export function GRDocumentTable({ 
  poId, 
  documentType = 'GR',
  selectedLineId, 
  onLineSelect 
}: GRDocumentTableProps) {
  const [documents, setDocuments] = useState<(GRHeader | SESHeader)[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<GRHeader | SESHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    if (poId) {
      fetchDocuments(poId);
    }
  }, [poId, documentType]);

  const fetchDocuments = async (poId: string) => {
    setIsLoading(true);
    try {
      const endpoint = documentType === 'GR' 
        ? `/api/goods-receipts/by-po/${poId}`
        : `/api/service-entries/by-po/${poId}`;
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
        if (data.length > 0) {
          setSelectedDocId(data[0].id);
          setSelectedDoc(data[0]);
        }
      }
    } catch (error) {
      console.error(`Error fetching ${documentType} data:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'posted': 'bg-green-100 text-green-800',
      'reversed': 'bg-red-100 text-red-800',
      'approved': 'bg-blue-100 text-blue-800',
      'draft': 'bg-yellow-100 text-yellow-800',
    };
    
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const isGR = (doc: any): doc is GRHeader => {
    return 'gr_number' in doc;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading {documentType === 'GR' ? 'Goods Receipts' : 'Service Entries'}...</p>
        </div>
      </div>
    );
  }

  if (!selectedDoc) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No {documentType === 'GR' ? 'Goods Receipts' : 'Service Entries'} found</p>
          <p className="text-sm text-gray-400 mt-2">Receipts will appear here when goods are received</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Document Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {documentType === 'GR' ? (
              <Package className="h-5 w-5 text-gray-400" />
            ) : (
              <FileCheck className="h-5 w-5 text-gray-400" />
            )}
            <h2 className="text-lg font-semibold text-gray-950">
              {documentType === 'GR' ? 'Goods Receipt' : 'Service Entry'}
            </h2>
            
            {/* Document Selector if multiple */}
            {documents.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowSelector(!showSelector)}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm font-mono text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100"
                >
                  {isGR(selectedDoc) ? selectedDoc.gr_number : `SES-${selectedDoc.id.slice(0, 8)}`}
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showSelector && (
                  <div className="absolute z-10 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                    {documents.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => {
                          setSelectedDocId(doc.id);
                          setSelectedDoc(doc);
                          setShowSelector(false);
                        }}
                        className={`
                          w-full text-left px-3 py-2 text-sm hover:bg-gray-50
                          ${selectedDocId === doc.id ? 'bg-purple-50' : ''}
                        `}
                      >
                        {isGR(doc) ? doc.gr_number : `SES-${doc.id.slice(0, 8)}`}
                        <span className="text-xs text-gray-500 ml-2">
                          {isGR(doc) ? formatDate(doc.receipt_date) : formatDate(doc.service_period_start)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {getStatusBadge(selectedDoc.status)}
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          {isGR(selectedDoc) ? (
            <>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(selectedDoc.receipt_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>{selectedDoc.received_by_user_name || 'System'}</span>
              </div>
              {selectedDoc.reference && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Truck className="h-4 w-4" />
                  <span>{selectedDoc.reference}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(selectedDoc.service_period_start)} - {formatDate(selectedDoc.service_period_end)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="h-4 w-4" />
                <span>{selectedDoc.approved_by_user_name || 'System'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Document Lines Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Line
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                PO Line
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                {documentType === 'GR' ? 'Received' : 'Serviced'}
              </th>
              {documentType === 'GR' && (
                <>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Rejected
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                    Accepted
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                UOM
              </th>
              {documentType === 'GR' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                  Location
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {isGR(selectedDoc) ? (
              selectedDoc.lines.map((line) => {
                const isSelected = selectedLineId === line.id;
                const acceptedQty = line.qty_received - (line.qty_rejected || 0);
                
                return (
                  <tr
                    key={line.id}
                    className={`
                      hover:bg-gray-50 cursor-pointer transition-colors
                      ${isSelected ? 'bg-purple-50 ring-2 ring-purple-500 ring-inset' : ''}
                    `}
                    onClick={() => onLineSelect?.(line.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-950">
                      {line.line_no}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {line.po_line_no || 'Line ' + line.po_line_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-950">
                      {line.description || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                      {line.qty_received}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className={line.qty_rejected && line.qty_rejected > 0 ? 'text-red-600' : 'text-gray-400'}>
                        {line.qty_rejected || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <span className="font-medium text-green-600">
                        {acceptedQty}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-center">
                      {line.uom}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-950">
                      {line.location || 'Main Warehouse'}
                    </td>
                  </tr>
                );
              })
            ) : (
              selectedDoc.lines.map((line, idx) => {
                const isSelected = selectedLineId === line.id;
                
                return (
                  <tr
                    key={line.id}
                    className={`
                      hover:bg-gray-50 cursor-pointer transition-colors
                      ${isSelected ? 'bg-purple-50 ring-2 ring-purple-500 ring-inset' : ''}
                    `}
                    onClick={() => onLineSelect?.(line.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-950">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {line.po_line_no || 'Line ' + line.po_line_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-950">
                      {line.description || 'Service Entry'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                      {line.qty_serviced}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-center">
                      {line.uom}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}