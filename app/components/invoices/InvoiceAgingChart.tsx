'use client';

import { useState } from 'react';

interface AgingBucket {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
  status: string;
  action: string;
  avgDaysOverdue: number;
  topVendor: string;
}

interface InvoiceAgingChartProps {
  invoices: any[];
  onBucketClick?: (bucket: string) => void;
}

export default function InvoiceAgingChart({ invoices, onBucketClick }: InvoiceAgingChartProps) {
  const [hoveredAgingIndex, setHoveredAgingIndex] = useState<number | null>(null);

  // Calculate aging buckets from invoice data
  const calculateAgingBuckets = (): AgingBucket[] => {
    const now = new Date();
    const buckets = {
      '90+': { invoices: [] as any[], days: 90, color: '#ef4444', status: 'Critical', action: 'Escalate immediately' },
      '61-90': { invoices: [] as any[], days: 61, color: '#f97316', status: 'High Priority', action: 'Chase for payment' },
      '31-60': { invoices: [] as any[], days: 31, color: '#f59e0b', status: 'Medium Priority', action: 'Send reminder' },
      '1-30': { invoices: [] as any[], days: 1, color: '#10b981', status: 'Normal', action: 'Monitor' }
    };

    // Categorize invoices into buckets
    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (invoice.status !== 'paid' && daysOverdue > 0) {
        if (daysOverdue > 90) {
          buckets['90+'].invoices.push(invoice);
        } else if (daysOverdue >= 61) {
          buckets['61-90'].invoices.push(invoice);
        } else if (daysOverdue >= 31) {
          buckets['31-60'].invoices.push(invoice);
        } else if (daysOverdue >= 1) {
          buckets['1-30'].invoices.push(invoice);
        }
      }
    });

    const totalValue = Object.values(buckets).reduce((sum, bucket) =>
      sum + bucket.invoices.reduce((s, inv) => s + inv.total, 0), 0
    );

    // Convert to display format (reversed order)
    return [
      {
        name: '1-30 days',
        value: buckets['1-30'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['1-30'].invoices.length,
        percentage: totalValue ? Math.round((buckets['1-30'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['1-30'].color,
        status: buckets['1-30'].status,
        action: buckets['1-30'].action,
        avgDaysOverdue: 15,
        topVendor: buckets['1-30'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '31-60 days',
        value: buckets['31-60'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['31-60'].invoices.length,
        percentage: totalValue ? Math.round((buckets['31-60'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['31-60'].color,
        status: buckets['31-60'].status,
        action: buckets['31-60'].action,
        avgDaysOverdue: 45,
        topVendor: buckets['31-60'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '61-90 days',
        value: buckets['61-90'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['61-90'].invoices.length,
        percentage: totalValue ? Math.round((buckets['61-90'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['61-90'].color,
        status: buckets['61-90'].status,
        action: buckets['61-90'].action,
        avgDaysOverdue: 75,
        topVendor: buckets['61-90'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '90+ days',
        value: buckets['90+'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['90+'].invoices.length,
        percentage: totalValue ? Math.round((buckets['90+'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['90+'].color,
        status: buckets['90+'].status,
        action: buckets['90+'].action,
        avgDaysOverdue: 120,
        topVendor: buckets['90+'].invoices[0]?.vendor_name_snapshot || 'N/A'
      }
    ];
  };

  const agingBuckets = calculateAgingBuckets();
  const totalOutstanding = agingBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const maxValue = 150000; // Max scale for the chart

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-950">Overdue Invoices</h3>
        <div className="text-right">
          <p className="text-xs text-gray-600">Total Outstanding</p>
          <p className="text-sm font-bold text-gray-950">£{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {/* Custom Aging Bar Chart */}
      <div className="space-y-3">
        {agingBuckets.map((bucket, index) => (
          <div
            key={index}
            className="group cursor-pointer relative"
            onClick={() => onBucketClick?.(bucket.name)}
            onMouseEnter={() => setHoveredAgingIndex(index)}
            onMouseLeave={() => setHoveredAgingIndex(null)}
          >
            <div className="flex items-center gap-3">
              <div className="w-20 text-xs font-medium text-gray-700 text-right">
                {bucket.name}
              </div>
              <div className="flex-1 relative">
                <div className="w-full bg-gray-50 rounded-md h-7 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all duration-300 group-hover:opacity-80 flex items-center justify-between px-2 relative"
                    style={{
                      width: `${Math.max(5, (bucket.value / maxValue) * 100)}%`,
                      backgroundColor: bucket.color
                    }}
                  >
                    {bucket.value > 0 && (
                      <span className="text-xs font-medium text-white">
                        £{(bucket.value / 1000).toFixed(0)}k
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="w-12 text-xs text-gray-600 text-right group-hover:text-gray-900 transition-colors">
                {bucket.count} inv
              </div>
            </div>

            {/* Tooltip */}
            {hoveredAgingIndex === index && bucket.count > 0 && (
              <div className="absolute z-10 left-20 top-8 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs min-w-[200px] pointer-events-none">
                <div className="font-semibold text-gray-950 mb-2">{bucket.name}</div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      bucket.status === 'Critical' ? 'text-red-600' :
                      bucket.status === 'High Priority' ? 'text-orange-600' :
                      bucket.status === 'Medium Priority' ? 'text-amber-600' :
                      bucket.status === 'Normal' ? 'text-emerald-600' :
                      'text-green-600'
                    }`}>{bucket.status}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-gray-950">£{bucket.value.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoices:</span>
                    <span className="font-medium text-gray-950">{bucket.count}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">% of Total:</span>
                    <span className="font-medium text-gray-950">{bucket.percentage}%</span>
                  </div>

                  {bucket.avgDaysOverdue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. days:</span>
                      <span className="font-medium text-gray-950">{bucket.avgDaysOverdue} days</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-gray-600">Top vendor:</span>
                    <span className="font-medium text-gray-800">{bucket.topVendor}</span>
                  </div>

                  <div className="pt-1 border-t">
                    <span className="text-gray-600">Action: </span>
                    <span className="font-semibold text-purple-600">{bucket.action}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex items-center mt-2">
        <div className="w-20"></div>
        <div className="flex-1 relative">
          <div className="flex justify-between text-[10px] text-gray-500 px-0">
            <span>£0</span>
            <span>£50k</span>
            <span>£100k</span>
            <span>£150k</span>
          </div>
        </div>
        <div className="w-12"></div>
      </div>
    </div>
  );
}