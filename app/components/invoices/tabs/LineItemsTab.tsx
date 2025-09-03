'use client';

import React, { useState } from 'react';
import { AlertCircle, Check, X, Edit2, Save } from 'lucide-react';
import { EditableField } from '../editing/EditableField';

interface LineItem {
  id?: string;
  line_no: number;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  net_amount: number;
  line_total: number;
  po_line_id?: string;
  gr_line_id?: string;
  ses_line_id?: string;
  cost_center?: string;
  gl_account?: string;
  project_code?: string;
}

interface LineItemsTabProps {
  invoiceId: string;
  lines: LineItem[];
  currency: string;
  matchResults?: any[];
  selectedLineId?: string | null;
  onLineSelect?: (lineId: string | null) => void;
  onLinesUpdate?: (lines: LineItem[]) => void;
}

export function LineItemsTab({
  invoiceId,
  lines,
  currency,
  matchResults = [],
  selectedLineId,
  onLineSelect,
  onLinesUpdate,
}: LineItemsTabProps) {
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editedLines, setEditedLines] = useState<LineItem[]>(lines);

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const getMatchResultForLine = (lineId: string) => {
    return matchResults.find((mr) => mr.invoice_line_id === lineId);
  };

  const getVarianceChip = (variance: number | null, withinTolerance: boolean) => {
    if (variance === null || variance === undefined) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          N/A
        </span>
      );
    }

    const isNegative = variance < 0;
    const displayValue = Math.abs(variance).toFixed(2);

    if (withinTolerance) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3" />
          {isNegative ? '-' : '+'}{displayValue}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <X className="h-3 w-3" />
          {isNegative ? '-' : '+'}{displayValue}
        </span>
      );
    }
  };

  const handleEditLine = (lineId: string) => {
    setEditingLineId(lineId);
  };

  const handleSaveLine = async (lineId: string) => {
    // TODO: Call API to save the line
    setEditingLineId(null);
    onLinesUpdate?.(editedLines);
  };

  const handleCancelEdit = () => {
    setEditedLines(lines);
    setEditingLineId(null);
  };

  const updateLineField = (lineId: string, field: keyof LineItem, value: any) => {
    setEditedLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line
      )
    );
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Qty
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                UOM
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Net
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                PO Line
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                GR Qty
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                Variance
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                Explanation
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-800 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {lines.map((line) => {
              const matchResult = getMatchResultForLine(line.id || '');
              const isEditing = editingLineId === line.id;
              const editedLine = editedLines.find((l) => l.id === line.id) || line;
              const isSelected = selectedLineId === line.id;

              return (
                <tr
                  key={line.id || line.line_no}
                  className={`
                    hover:bg-gray-50 cursor-pointer transition-colors
                    ${isSelected ? 'bg-purple-50 ring-2 ring-purple-500 ring-inset' : ''}
                    ${isEditing ? 'bg-yellow-50' : ''}
                  `}
                  onClick={() => !isEditing && onLineSelect?.(line.id || null)}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-950">
                    {line.line_no}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-950">
                    {isEditing ? (
                      <EditableField
                        value={editedLine.description}
                        onChange={(value) => updateLineField(line.id!, 'description', value)}
                        type="text"
                        className="max-w-xs"
                      />
                    ) : (
                      <div className="max-w-xs truncate" title={line.description}>
                        {line.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {isEditing ? (
                      <EditableField
                        value={editedLine.qty}
                        onChange={(value) => updateLineField(line.id!, 'qty', value)}
                        type="number"
                        step={0.01}
                        className="w-20"
                      />
                    ) : (
                      line.qty
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-center">
                    {isEditing ? (
                      <EditableField
                        value={editedLine.uom}
                        onChange={(value) => updateLineField(line.id!, 'uom', value)}
                        type="text"
                        className="w-16"
                      />
                    ) : (
                      line.uom
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {isEditing ? (
                      <EditableField
                        value={editedLine.unit_price}
                        onChange={(value) => updateLineField(line.id!, 'unit_price', value)}
                        type="number"
                        step={0.01}
                        className="w-24"
                      />
                    ) : (
                      formatCurrency(line.unit_price)
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {formatCurrency(line.net_amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                    {formatCurrency(line.line_total)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-center">
                    {matchResult?.matched_po_line_id ? (
                      <span className="text-blue-600 font-medium">
                        {matchResult.po_line_no || 'Linked'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-950 text-right">
                    {matchResult?.gr_qty_received || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {matchResult ? (
                      getVarianceChip(matchResult.qty_variance, matchResult.within_tolerance)
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-950">
                    {matchResult?.explanation_code ? (
                      <span className="text-xs text-gray-600">
                        {matchResult.explanation_code}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {!isEditing ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLine(line.id!);
                        }}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveLine(line.id!);
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={6} className="px-4 py-3 text-right text-sm font-semibold text-gray-950">
                Total:
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-950">
                {formatCurrency(lines.reduce((sum, line) => sum + line.line_total, 0))}
              </td>
              <td colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Distribution Section (if editing) */}
      {editingLineId && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-semibold text-gray-950 mb-3">Line Distribution</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cost Center</label>
              <EditableField
                value={editedLines.find((l) => l.id === editingLineId)?.cost_center || ''}
                onChange={(value) => updateLineField(editingLineId, 'cost_center', value)}
                type="text"
                placeholder="e.g., IT-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">GL Account</label>
              <EditableField
                value={editedLines.find((l) => l.id === editingLineId)?.gl_account || ''}
                onChange={(value) => updateLineField(editingLineId, 'gl_account', value)}
                type="text"
                placeholder="e.g., 6100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Project Code</label>
              <EditableField
                value={editedLines.find((l) => l.id === editingLineId)?.project_code || ''}
                onChange={(value) => updateLineField(editingLineId, 'project_code', value)}
                type="text"
                placeholder="e.g., PROJ-2024-01"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}