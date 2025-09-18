'use client';

import { useState } from 'react';

interface DueSoonBucket {
  name: string;
  value: number;
  count: number;
  percentage: number;
  color: string;
  status: string;
  action: string;
  avgDaysUntilDue: number;
  topVendor: string;
}

interface InvoiceDueSoonChartProps {
  invoices: any[];
  onBucketClick?: (bucket: string) => void;
}

export default function InvoiceDueSoonChart({ invoices, onBucketClick }: InvoiceDueSoonChartProps) {
  const [hoveredDueSoonIndex, setHoveredDueSoonIndex] = useState<number | null>(null);

  // Calculate due soon buckets from invoice data
  const calculateDueSoonBuckets = (): DueSoonBucket[] => {
    const now = new Date();
    const buckets = {
      'today': { invoices: [] as any[], color: '#ef4444', status: 'Due Today', action: 'Process immediately' },
      '1-3': { invoices: [] as any[], color: '#f97316', status: 'Very Urgent', action: 'Prepare payment' },
      '4-7': { invoices: [] as any[], color: '#f59e0b', status: 'Urgent', action: 'Schedule payment' },
      '8-14': { invoices: [] as any[], color: '#10b981', status: 'Coming Due', action: 'Review and approve' },
      '15-30': { invoices: [] as any[], color: '#22c55e', status: 'Upcoming', action: 'Plan cash flow' }
    };

    // Categorize invoices into buckets
    invoices.forEach(invoice => {
      const dueDate = new Date(invoice.due_date);
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (invoice.status !== 'paid') {
        if (daysUntilDue === 0) {
          buckets['today'].invoices.push(invoice);
        } else if (daysUntilDue >= 1 && daysUntilDue <= 3) {
          buckets['1-3'].invoices.push(invoice);
        } else if (daysUntilDue >= 4 && daysUntilDue <= 7) {
          buckets['4-7'].invoices.push(invoice);
        } else if (daysUntilDue >= 8 && daysUntilDue <= 14) {
          buckets['8-14'].invoices.push(invoice);
        } else if (daysUntilDue >= 15 && daysUntilDue <= 30) {
          buckets['15-30'].invoices.push(invoice);
        }
      }
    });

    const totalValue = Object.values(buckets).reduce((sum, bucket) =>
      sum + bucket.invoices.reduce((s, inv) => s + inv.total, 0), 0
    );

    // Convert to display format
    return [
      {
        name: 'Today',
        value: buckets['today'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['today'].invoices.length,
        percentage: totalValue ? Math.round((buckets['today'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['today'].color,
        status: buckets['today'].status,
        action: buckets['today'].action,
        avgDaysUntilDue: 0,
        topVendor: buckets['today'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '1-3 days',
        value: buckets['1-3'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['1-3'].invoices.length,
        percentage: totalValue ? Math.round((buckets['1-3'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['1-3'].color,
        status: buckets['1-3'].status,
        action: buckets['1-3'].action,
        avgDaysUntilDue: 2,
        topVendor: buckets['1-3'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '4-7 days',
        value: buckets['4-7'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['4-7'].invoices.length,
        percentage: totalValue ? Math.round((buckets['4-7'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['4-7'].color,
        status: buckets['4-7'].status,
        action: buckets['4-7'].action,
        avgDaysUntilDue: 5,
        topVendor: buckets['4-7'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '8-14 days',
        value: buckets['8-14'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['8-14'].invoices.length,
        percentage: totalValue ? Math.round((buckets['8-14'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['8-14'].color,
        status: buckets['8-14'].status,
        action: buckets['8-14'].action,
        avgDaysUntilDue: 11,
        topVendor: buckets['8-14'].invoices[0]?.vendor_name_snapshot || 'N/A'
      },
      {
        name: '15-30 days',
        value: buckets['15-30'].invoices.reduce((sum, inv) => sum + inv.total, 0),
        count: buckets['15-30'].invoices.length,
        percentage: totalValue ? Math.round((buckets['15-30'].invoices.reduce((sum, inv) => sum + inv.total, 0) / totalValue) * 100) : 0,
        color: buckets['15-30'].color,
        status: buckets['15-30'].status,
        action: buckets['15-30'].action,
        avgDaysUntilDue: 22,
        topVendor: buckets['15-30'].invoices[0]?.vendor_name_snapshot || 'N/A'
      }
    ];
  };

  const dueSoonBuckets = calculateDueSoonBuckets();
  const totalUpcoming = dueSoonBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const maxValue = 150000; // Max scale for the chart

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-950">Due Soon Analysis</h3>
        <div className="text-right">
          <p className="text-xs text-gray-600">Total Upcoming</p>
          <p className="text-sm font-bold text-gray-950">£{totalUpcoming.toLocaleString()}</p>
        </div>
      </div>

      {/* Due Soon Bar Chart */}
      <div className="space-y-3">
        {dueSoonBuckets.map((bucket, index) => (
          <div
            key={index}
            className="group cursor-pointer relative"
            onClick={() => onBucketClick?.(bucket.name)}
            onMouseEnter={() => setHoveredDueSoonIndex(index)}
            onMouseLeave={() => setHoveredDueSoonIndex(null)}
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
            {hoveredDueSoonIndex === index && bucket.count > 0 && (
              <div className="absolute z-10 left-20 top-8 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs min-w-[200px] pointer-events-none">
                <div className="font-semibold text-gray-950 mb-2">{bucket.name}</div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      bucket.status === 'Due Today' ? 'text-red-600' :
                      bucket.status === 'Very Urgent' ? 'text-orange-600' :
                      bucket.status === 'Urgent' ? 'text-amber-600' :
                      bucket.status === 'Coming Due' ? 'text-emerald-600' :
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

                  {bucket.avgDaysUntilDue > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg. days until due:</span>
                      <span className="font-medium text-gray-950">{bucket.avgDaysUntilDue} days</span>
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