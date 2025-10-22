'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { X, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Invoice = {
  id: string;
  invoice_number?: string;
  vendor_name_snapshot?: string;
  total?: number;
  issues?: string[];
};

type Suggestion = {
  id: string;
  title: string;
  description: string;
  count: number;
  value: number;
  actions: { id: string; label: string }[];
};

export function QuickFixesModal({
  open,
  onClose,
  invoices,
}: {
  open: boolean;
  onClose: () => void;
  invoices: Invoice[];
}) {
  const suggestions = useMemo<Suggestion[]>(() => {
    const sum = (pred: (inv: Invoice) => boolean) =>
      invoices.filter(pred).reduce((acc, inv) => acc + Number(inv.total || 0), 0);

    const hasIssue = (inv: Invoice, keys: string[]) =>
      (inv.issues || []).some((i) => keys.includes(i));

    const items: Suggestion[] = [
      {
        id: 'missing-gr',
        title: 'Link Missing GRs',
        description:
          'Some invoices require goods receipts. Link existing GRs or request receiving to post them.',
        count: invoices.filter((inv) => hasIssue(inv, ['Missing GR'])).length,
        value: sum((inv) => hasIssue(inv, ['Missing GR'])),
        actions: [
          { id: 'request-gr', label: 'Request GR from receiver' },
          { id: 'link-recent-gr', label: 'Link recent GRs' },
        ],
      },
      {
        id: 'quantity-variance',
        title: 'Resolve Quantity Variances',
        description:
          'Quantities on invoice differ from PO/GR. Review UoM conversions or split across lines.',
        count: invoices.filter((inv) => hasIssue(inv, ['Quantity Variance', 'Quantity Mismatch'])).length,
        value: sum((inv) => hasIssue(inv, ['Quantity Variance', 'Quantity Mismatch'])),
        actions: [
          { id: 'apply-uom', label: 'Apply UoM conversion' },
          { id: 'split-lines', label: 'Suggest line split' },
        ],
      },
      {
        id: 'amount-mismatch',
        title: 'Fix Amount/Price Mismatches',
        description:
          'Unit price or totals differ from PO. Propose variance justification or request corrected doc.',
        count: invoices.filter((inv) => hasIssue(inv, ['Amount Mismatch', 'Unit Price Mismatch', 'Price Tolerance'])).length,
        value: sum((inv) => hasIssue(inv, ['Amount Mismatch', 'Unit Price Mismatch', 'Price Tolerance'])),
        actions: [
          { id: 'request-correction', label: 'Request corrected invoice' },
          { id: 'tolerance-override', label: 'Propose tolerance override' },
        ],
      },
      {
        id: 'line-mismatch',
        title: 'Smart Line Matching',
        description:
          'Re-run matching with semantic description matching and suggest best-fit PO lines.',
        count: invoices.filter((inv) => hasIssue(inv, ['Line Items Mismatch', 'Line Mismatch'])).length,
        value: sum((inv) => hasIssue(inv, ['Line Items Mismatch', 'Line Mismatch'])),
        actions: [
          { id: 'smart-match', label: 'Run smart line-matching' },
          { id: 'open-po-compare', label: 'Open PO comparison' },
        ],
      },
      {
        id: 'tax-currency',
        title: 'Tax/Currency Discrepancies',
        description:
          'Align tax codes or currency rates and re-check totals to clear small discrepancies.',
        count: invoices.filter((inv) => hasIssue(inv, ['Tax Discrepancy', 'Currency Issue', 'Tax Rate Mismatch'])).length,
        value: sum((inv) => hasIssue(inv, ['Tax Discrepancy', 'Currency Issue', 'Tax Rate Mismatch'])),
        actions: [
          { id: 'apply-tax-code', label: 'Apply configured tax code' },
          { id: 'recalc-currency', label: 'Recalculate with FX rate' },
        ],
      },
    ].filter((s) => s.count > 0);

    return items;
  }, [invoices]);

  const [selected, setSelected] = useState<string | null>(null);
  const selectedPredicate = useMemo(() => {
    return (inv: Invoice) => {
      const has = (keys: string[]) => (inv.issues || []).some((i) => keys.includes(i));
      switch (selected) {
        case 'missing-gr':
          return has(['Missing GR']);
        case 'quantity-variance':
          return has(['Quantity Variance', 'Quantity Mismatch']);
        case 'amount-mismatch':
          return has(['Amount Mismatch', 'Unit Price Mismatch', 'Price Tolerance']);
        case 'line-mismatch':
          return has(['Line Items Mismatch', 'Line Mismatch']);
        case 'tax-currency':
          return has(['Tax Discrepancy', 'Currency Issue', 'Tax Rate Mismatch']);
        default:
          return true;
      }
    };
  }, [selected]);

  useEffect(() => {
    if (open) {
      setSelected(suggestions[0]?.id || null);
    }
  }, [open, suggestions]);

  if (!open) return null;

  const selectedItem = suggestions.find((s) => s.id === selected) || null;

  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const handleAction = (actionId: string) => {
    console.log('[QuickFixes] Action clicked:', actionId, 'on', selectedItem);
  };

  return (
    <div className="fixed inset-0 z-[10050]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Global close button (top-right) */}
      <button
        onClick={onClose}
        aria-label="Close quick fixes"
        className="absolute top-3 right-3 z-[10060] p-2 rounded-md bg-white/90 hover:bg-white shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
      >
        <X className="h-4 w-4 text-gray-700" />
      </button>
      <div className="absolute inset-0 bg-white flex">
        {/* Left: Suggestions list */}
        <div className="w-full max-w-md border-r border-gray-200 p-4 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Wrench className="h-4 w-4 text-purple-700" />
            <h2 className="text-base font-semibold text-gray-950">Quick Fixes</h2>
          </div>
          <p className="text-xs text-gray-600 mb-3">Automation suggestions to clear mismatches faster.</p>

          <div className="space-y-2">
            {suggestions.length === 0 && (
              <div className="text-sm text-gray-600">No quick fixes found for current invoices.</div>
            )}
            {suggestions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={cn(
                  'w-full text-left border rounded-md p-3 transition-colors',
                  selected === s.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-950">{s.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{s.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-950">{s.count} invoices</div>
                    <div className="text-xs text-gray-600">{formatValue(s.value)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Details + actions */}
        {/* Middle: Details + actions */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedItem ? (
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-950">{selectedItem.title}</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">{selectedItem.description}</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="text-xs text-gray-600">Affected</div>
                  <div className="text-base font-semibold text-gray-950">{selectedItem.count} invoices</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="text-xs text-gray-600">Blocked value</div>
                  <div className="text-base font-semibold text-gray-950">{formatValue(selectedItem.value)}</div>
                </div>
                <div className="rounded-md border border-gray-200 p-3">
                  <div className="text-xs text-gray-600">Est. win</div>
                  <div className="text-base font-semibold text-gray-950">{formatValue(selectedItem.value * 0.9)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-gray-950 mb-2">Quick Actions</div>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.actions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleAction(a.id)}
                      className="px-3 py-1.5 text-sm bg-purple-900 text-white rounded-md hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      {a.label}
                    </button>
                  ))}
                  {/* Secondary action: Show invoices in table */}
                  <button
                    onClick={() => handleAction('show-in-table')}
                    className="px-3 py-1.5 text-sm bg-white text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Show invoices in table
                  </button>
                </div>
                <div className="mt-6 flex items-center gap-1 text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  These actions do not post changes yet — they surface the best next steps.
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">Select a quick fix on the left.</div>
          )}
        </div>

        {/* Right: Simplified invoice list for the selected suggestion */}
        <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto">
          <div className="text-sm font-semibold text-gray-950 mb-2">Invoices in scope</div>
          <div className="space-y-2">
            {invoices.filter(selectedPredicate).map((inv) => (
              <div key={inv.id} className="border border-gray-200 rounded-md p-2">
                <div className="text-xs text-gray-600">{inv.invoice_number || inv.id}</div>
                <div className="text-sm font-medium text-gray-950 truncate">{inv.vendor_name_snapshot || 'Unknown Vendor'}</div>
                <div className="text-xs text-gray-600">${Number(inv.total || 0).toLocaleString()}</div>
              </div>
            ))}
            {invoices.filter(selectedPredicate).length === 0 && (
              <div className="text-sm text-gray-600">Nothing to show.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
