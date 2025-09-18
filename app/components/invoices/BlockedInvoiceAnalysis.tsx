'use client';

import { useState } from 'react';

interface ExceptionCategory {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
  severity: string;
  action: string;
  avgResolutionDays: number;
  topVendor: string;
}

interface BlockedInvoiceAnalysisProps {
  invoices: any[];
  onCategoryClick?: (category: string) => void;
}

export default function BlockedInvoiceAnalysis({ invoices, onCategoryClick }: BlockedInvoiceAnalysisProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Calculate exception categories from invoice data
  const calculateExceptionCategories = (): ExceptionCategory[] => {
    // Filter only blocked invoices
    const blockedInvoices = invoices.filter(inv =>
      inv.status === 'requires_review' || inv.status === 'needs_review'
    );

    if (blockedInvoices.length === 0) {
      // Return empty data structure
      return [
        { name: 'PO/Invoice Mismatch', value: 0, count: 0, percentage: 0, color: '#dc2626', severity: 'High', action: 'Review pricing', avgResolutionDays: 3, topVendor: 'N/A' },
        { name: 'Missing GR', value: 0, count: 0, percentage: 0, color: '#ea580c', severity: 'High', action: 'Confirm receipt', avgResolutionDays: 2, topVendor: 'N/A' },
        { name: 'Quantity Variance', value: 0, count: 0, percentage: 0, color: '#f97316', severity: 'Medium', action: 'Verify quantities', avgResolutionDays: 2, topVendor: 'N/A' },
        { name: 'Missing Approval', value: 0, count: 0, percentage: 0, color: '#f59e0b', severity: 'Medium', action: 'Route for approval', avgResolutionDays: 4, topVendor: 'N/A' },
        { name: 'Duplicate Suspected', value: 0, count: 0, percentage: 0, color: '#eab308', severity: 'Low', action: 'Check for duplicates', avgResolutionDays: 1, topVendor: 'N/A' },
        { name: 'Vendor Issues', value: 0, count: 0, percentage: 0, color: '#84cc16', severity: 'Low', action: 'Verify vendor', avgResolutionDays: 5, topVendor: 'N/A' }
      ];
    }

    // Mock distribution of exception types
    // In a real system, this would be derived from actual exception codes/reasons in the data
    const totalBlocked = blockedInvoices.length;
    const totalValue = blockedInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Simulate exception distribution
    const categories = [
      {
        name: 'PO/Invoice Mismatch',
        ratio: 0.35, // 35% of blocked
        color: '#dc2626', // Red
        severity: 'High',
        action: 'Review pricing',
        avgResolutionDays: 3
      },
      {
        name: 'Missing GR',
        ratio: 0.25, // 25%
        color: '#ea580c', // Dark orange
        severity: 'High',
        action: 'Confirm receipt',
        avgResolutionDays: 2
      },
      {
        name: 'Quantity Variance',
        ratio: 0.15, // 15%
        color: '#f97316', // Orange
        severity: 'Medium',
        action: 'Verify quantities',
        avgResolutionDays: 2
      },
      {
        name: 'Missing Approval',
        ratio: 0.10, // 10%
        color: '#f59e0b', // Amber
        severity: 'Medium',
        action: 'Route for approval',
        avgResolutionDays: 4
      },
      {
        name: 'Duplicate Suspected',
        ratio: 0.08, // 8%
        color: '#eab308', // Yellow
        severity: 'Low',
        action: 'Check for duplicates',
        avgResolutionDays: 1
      },
      {
        name: 'Vendor Issues',
        ratio: 0.07, // 7%
        color: '#84cc16', // Lime
        severity: 'Low',
        action: 'Verify vendor',
        avgResolutionDays: 5
      }
    ];

    // Create category data with actual values
    return categories.map((cat, index) => {
      const categoryInvoices = blockedInvoices.slice(
        Math.floor(totalBlocked * categories.slice(0, index).reduce((sum, c) => sum + c.ratio, 0)),
        Math.floor(totalBlocked * categories.slice(0, index + 1).reduce((sum, c) => sum + c.ratio, 0))
      );

      const categoryValue = categoryInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const categoryCount = Math.floor(totalBlocked * cat.ratio);

      return {
        name: cat.name,
        value: categoryValue || Math.floor(totalValue * cat.ratio),
        count: categoryCount,
        percentage: Math.round(cat.ratio * 100),
        color: cat.color,
        severity: cat.severity,
        action: cat.action,
        avgResolutionDays: cat.avgResolutionDays,
        topVendor: categoryInvoices[0]?.vendor_name_snapshot || 'Various'
      };
    });
  };

  const exceptionCategories = calculateExceptionCategories();
  const totalBlockedValue = exceptionCategories.reduce((sum, cat) => sum + cat.value, 0);
  const maxValue = Math.max(...exceptionCategories.map(cat => cat.value)) * 1.2 || 100000; // Add 20% padding for visual

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-950">Exception Breakdown</h3>
        <div className="text-right">
          <p className="text-xs text-gray-600">Total Blocked</p>
          <p className="text-sm font-bold text-gray-950">£{totalBlockedValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Exception Category Bar Chart */}
      <div className="space-y-3">
        {exceptionCategories.map((category, index) => (
          <div
            key={index}
            className="group cursor-pointer relative"
            onClick={() => onCategoryClick?.(category.name)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-32 text-xs font-medium text-gray-700 text-right">
                {category.name}
              </div>
              <div className="flex-1 relative">
                <div className="w-full bg-gray-50 rounded-md h-7 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300 group-hover:opacity-80 flex items-center justify-between px-2 relative"
                    style={{
                      width: category.value > 0 ? `${Math.max(5, (category.value / maxValue) * 100)}%` : '0%',
                      backgroundColor: category.color
                    }}
                  >
                    {category.value > 0 && (
                      <span className="text-xs font-medium text-white">
                        £{(category.value / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-12 text-xs text-gray-600 text-right group-hover:text-gray-900 transition-colors">
                {category.count} inv
              </div>
            </div>

            {/* Tooltip */}
            {hoveredIndex === index && category.count > 0 && (
              <div className="absolute z-10 left-32 top-8 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs min-w-[240px] pointer-events-none">
                <div className="font-semibold text-gray-950 mb-2">{category.name}</div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Severity:</span>
                    <span className={`font-medium ${
                      category.severity === 'High' ? 'text-red-600' :
                      category.severity === 'Medium' ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>{category.severity}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-semibold text-gray-950">£{category.value.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Count:</span>
                    <span className="font-medium text-gray-950">{category.count}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">% of Blocked:</span>
                    <span className="font-medium text-gray-950">{category.percentage}%</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Resolution:</span>
                    <span className="font-medium text-gray-950">{category.avgResolutionDays} days</span>
                  </div>

                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-gray-600">Top Vendor:</span>
                    <span className="font-medium text-gray-800">{category.topVendor}</span>
                  </div>

                  <div className="pt-1 border-t">
                    <span className="text-gray-600">Action: </span>
                    <span className="font-semibold text-purple-600">{category.action}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show message if no blocked invoices */}
      {exceptionCategories.every(cat => cat.count === 0) && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-700 font-medium">No blocked invoices</p>
          <p className="text-xs text-green-600 mt-1">All invoices are processing normally</p>
        </div>
      )}
    </div>
  );
}