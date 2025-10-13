'use client';

import React, { useEffect, useState } from 'react';
import { FileText, Calendar, Building, Package } from 'lucide-react';

interface POLine {
  id: string;
  line_no: number;
  description: string;
  item_description?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
  qty_received_to_date?: number;
  qty_invoiced_to_date?: number;
  qty_remaining_to_receive?: number;
  qty_remaining_to_invoice?: number;
  status: string;
}

interface POHeader {
  id: string;
  po_number: string;
  vendor_name: string;
  order_date: string;
  currency: string;
  status: string;
  lines: POLine[];
  subtotal: number;
  total: number;
}

interface PODocumentTableProps {
  poNumber?: string;
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
}

export function PODocumentTable({ poNumber, selectedLineId, onLineSelect }: PODocumentTableProps) {
  const [poData, setPOData] = useState<POHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (poNumber) {
      fetchPOData(poNumber);
    }
  }, [poNumber]);

  const fetchPOData = async (poNum: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/purchase-orders/by-number/${poNum}`);
      if (response.ok) {
        const data = await response.json();
        setPOData(data);
      }
    } catch (error) {
      console.error('Error fetching PO data:', error);
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

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'open': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800',
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No Purchase Order linked</p>
          <p className="text-sm text-gray-400 mt-2">Link a PO to enable comparison view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* PO Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-950">Purchase Order</h2>
            <span className="text-lg font-mono text-purple-600">{poData.po_number}</span>
          </div>
          {getStatusBadge(poData.status)}
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Building className="h-4 w-4" />
            <span>{poData.vendor_name}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(poData.order_date)}</span>
          </div>
          <div className="text-right">
            <span className="font-semibold text-gray-950">
              {formatCurrency(poData.total, poData.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* PO Lines Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Line
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Ordered
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                UOM
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Received
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Invoiced
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Line Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {poData.lines.map((line) => {
              const isSelected = selectedLineId === line.id;
              const lineTotal = line.qty_ordered * line.unit_price;
              
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
                  <td className="px-4 py-3 text-sm text-gray-950">
                    <div>
                      {line.item_description && (
                        <p className="font-medium">{line.item_description}</p>
                      )}
                      <p className={line.item_description ? 'text-gray-500' : ''}>
                        {line.description}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {line.qty_ordered}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-center">
                    {line.uom}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {formatCurrency(line.unit_price, poData.currency)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <div>
                      <span className="text-gray-950">{line.qty_received_to_date || 0}</span>
                      {line.qty_remaining_to_receive && line.qty_remaining_to_receive > 0 && (
                        <p className="text-xs text-gray-500">
                          {line.qty_remaining_to_receive} remaining
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                    <div>
                      <span className="text-gray-950">{line.qty_invoiced_to_date || 0}</span>
                      {line.qty_remaining_to_invoice && line.qty_remaining_to_invoice > 0 && (
                        <p className="text-xs text-gray-500">
                          {line.qty_remaining_to_invoice} remaining
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {formatCurrency(lineTotal, poData.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={7} className="px-4 py-3 text-right text-sm font-semibold text-gray-950">
                PO Total:
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-950">
                {formatCurrency(poData.total, poData.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}