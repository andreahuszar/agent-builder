'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList
} from 'recharts';
import { HelpCircle, TrendingUp, AlertTriangle, Calendar, CalendarDays } from 'lucide-react';
import { format, parseISO, isWeekend, addDays } from 'date-fns';
import { Card, CardContent } from '@/app/components/ui/card';

export type Due7dPoint = {
  dateISO: string;
  totalValueGBP: number;
  invoiceCount: number;
  readyToPayGBP?: number;
  needsApprovalGBP?: number;
  discountAvailableGBP?: number;
  isPaymentRunDay?: boolean;
};

interface DueNext7DaysSparklineProps {
  data?: Due7dPoint[];
  onOpenQueue?: () => void;
}

// Generate mock forecast data (next 7 days)
const generateMockData = (): Due7dPoint[] => {
  const today = new Date();
  const data: Due7dPoint[] = [];

  // Typical daily patterns
  const dailyPatterns = [
    { base: 45000, invoices: 15 },  // Today
    { base: 32000, invoices: 12 },  // Tomorrow
    { base: 68000, invoices: 23 },  // Day 3 - spike
    { base: 25000, invoices: 9 },   // Day 4
    { base: 42000, invoices: 16 },  // Day 5
    { base: 18000, invoices: 7 },   // Day 6 - weekend
    { base: 12000, invoices: 5 },   // Day 7 - weekend
  ];

  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const pattern = dailyPatterns[i];
    const randomVariation = (Math.random() - 0.5) * 0.2; // ±10% variation
    const value = Math.round(pattern.base * (1 + randomVariation));

    // Split between ready and needs approval
    const readyPercent = 0.6 + Math.random() * 0.3; // 60-90% ready
    const readyValue = Math.round(value * readyPercent);
    const needsApprovalValue = value - readyValue;

    // Some invoices have early payment discounts
    const discountValue = i < 3 ? Math.round(value * 0.02) : 0; // 2% discount if paid early

    data.push({
      dateISO: date.toISOString().split('T')[0],
      totalValueGBP: value,
      invoiceCount: pattern.invoices + Math.floor(Math.random() * 3),
      readyToPayGBP: readyValue,
      needsApprovalGBP: needsApprovalValue,
      discountAvailableGBP: discountValue,
      isPaymentRunDay: i === 2 || i === 4 // Scheduled pay runs
    });
  }

  return data;
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${Math.round(value / 1000)}k`;
  return `£${value}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;
  const date = parseISO(point.dateISO);
  const isToday = format(new Date(), 'yyyy-MM-dd') === point.dateISO;
  const isTomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd') === point.dateISO;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs min-w-[180px]">
      <div className="font-medium text-gray-950 mb-2">
        {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEEE, dd MMM')}
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-700">Total due:</span>
          <span className="font-semibold text-gray-950">{formatCurrency(point.totalValueGBP)}</span>
        </div>

        {point.readyToPayGBP !== undefined && (
          <div className="flex justify-between">
            <span className="text-gray-700">Ready to pay:</span>
            <span className="text-green-600">{formatCurrency(point.readyToPayGBP)}</span>
          </div>
        )}

        {point.needsApprovalGBP !== undefined && point.needsApprovalGBP > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-700">Needs approval:</span>
            <span className="text-orange-600">{formatCurrency(point.needsApprovalGBP)}</span>
          </div>
        )}

        {point.discountAvailableGBP && point.discountAvailableGBP > 0 && (
          <div className="flex justify-between border-t pt-1 mt-1">
            <span className="text-gray-700">Discount available:</span>
            <span className="text-purple-600 font-semibold">{formatCurrency(point.discountAvailableGBP)}</span>
          </div>
        )}

        <div className="flex justify-between pt-1 border-t">
          <span className="text-gray-700">Invoices:</span>
          <span className="font-medium text-gray-950">{point.invoiceCount}</span>
        </div>
      </div>

      {point.isPaymentRunDay && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-purple-600 font-semibold flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Payment run scheduled
          </span>
        </div>
      )}
    </div>
  );
};

export default function DueNext7DaysSparkline({
  data,
  onOpenQueue = () => {}
}: DueNext7DaysSparklineProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Use mock data if none provided
  const chartData = useMemo(() => {
    return data || generateMockData();
  }, [data]);

  // Calculate totals and insights
  const totalNext7Days = chartData.reduce((sum, p) => sum + p.totalValueGBP, 0);
  const totalInvoices = chartData.reduce((sum, p) => sum + p.invoiceCount, 0);
  const totalDiscounts = chartData.reduce((sum, p) => sum + (p.discountAvailableGBP || 0), 0);
  const needsApprovalTotal = chartData.reduce((sum, p) => sum + (p.needsApprovalGBP || 0), 0);

  // Find peak day
  const peakDay = chartData.reduce((max, p) => p.totalValueGBP > max.totalValueGBP ? p : max, chartData[0]);
  const peakDayIndex = chartData.findIndex(p => p.dateISO === peakDay.dateISO);

  // Format data for bar chart with day labels
  const barChartData = chartData.map((point, index) => {
    const date = parseISO(point.dateISO);
    const isToday = index === 0;
    const isTomorrow = index === 1;
    const isWeekendDay = isWeekend(date);

    return {
      ...point,
      day: format(date, 'EEE'), // Always show actual day name
      dayNum: format(date, 'd'),
      isWeekend: isWeekendDay,
      isToday,
      isPeak: index === peakDayIndex,
      topLabel: index === peakDayIndex
        ? `${formatCurrency(point.totalValueGBP)} Peak\n(${point.invoiceCount} inv)`
        : `${formatCurrency(point.totalValueGBP)}\n(${point.invoiceCount} inv)`
    };
  });

  return (
    <div className="mb-6">
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-purple-900" />
              <h2 className="text-base font-semibold text-gray-950">Payment Due Forecast</h2>

              <div className="relative ml-2">
                <button
                  type="button"
                  className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(!showInfo);
                  }}
                  aria-label="Information about this metric"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
                </button>

                {showInfo && (
                  <div className="absolute left-0 top-6 z-50 w-72 bg-white border border-gray-200 rounded-lg shadow-xl p-3">
                    <p className="text-xs text-gray-700 mb-2">
                      Shows invoices due each day for the next 7 days. Plan payment runs for high-value days and ensure approvals are complete.
                    </p>
                    {totalDiscounts > 0 && (
                      <p className="text-xs text-purple-600 font-semibold mb-2">
                        💡 {formatCurrency(totalDiscounts)} in early payment discounts available
                      </p>
                    )}
                    <button
                      type="button"
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      onClick={() => onOpenQueue()}
                    >
                      Open queue →
                    </button>
                  </div>
                )}
              </div>

            </div>

            <div className="flex items-center gap-3">
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs text-gray-700">7-day total</span>
                  <p className="text-sm font-bold text-gray-950">{formatCurrency(totalNext7Days)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-700">Invoices</span>
                  <p className="text-sm font-bold text-gray-950">{totalInvoices}</p>
                </div>
              </div>
            </div>
          </div>

          <div
            className="w-full group cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
            onClick={onOpenQueue}
            onKeyDown={(e) => e.key === 'Enter' && onOpenQueue()}
            aria-label="Invoice payment forecast for next 7 days - click to open queue"
            tabIndex={0}
            role="button"
          >
            <div className="h-44 hover:bg-purple-50 transition-colors rounded px-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 35, right: 5, left: 30, bottom: 5 }}
              >
                {/* Horizontal grid lines */}
                <ReferenceLine y={0} stroke="#f3f4f6" strokeWidth={1} />
                <ReferenceLine y={25000} stroke="#f3f4f6" strokeWidth={1} />
                <ReferenceLine y={75000} stroke="#f3f4f6" strokeWidth={1} />

                {/* Dotted line for 50k threshold */}
                <ReferenceLine
                  y={50000}
                  stroke="#e5e7eb"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />

                {/* Today vertical line */}
                <ReferenceLine
                  x={barChartData[0]?.day}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  label={{ value: "Today", position: "top", style: { fontSize: 8, fill: '#6b7280' } }}
                />

                {/* Main bars */}
                <Bar
                  dataKey="totalValueGBP"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={32}
                >
                  {barChartData.map((entry, index) => {
                    // Color coding by value ranges
                    let fillColor = '#e9d5ff'; // Default light purple (low value)

                    if (entry.isPeak) {
                      fillColor = '#dc2626'; // Red for peak day
                    } else if (entry.isWeekend) {
                      fillColor = '#9ca3af'; // Gray for weekends
                    } else if (entry.totalValueGBP > 50000) {
                      fillColor = '#7c3aed'; // Dark purple for high value
                    } else if (entry.totalValueGBP > 30000) {
                      fillColor = '#a78bfa'; // Medium purple
                    }

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fillColor}
                      />
                    );
                  })}
                </Bar>

                {/* Value and invoice count labels on top of bars */}
                <LabelList
                  dataKey="topLabel"
                  position="top"
                  content={(props: any) => {
                    const { x, y, width, value } = props;
                    if (!value) return null;
                    const [amount, count] = value.split('\n');
                    return (
                      <g>
                        <text
                          x={x + width / 2}
                          y={y - 15}
                          fill="#111827"
                          fontSize={9}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {amount}
                        </text>
                        <text
                          x={x + width / 2}
                          y={y - 5}
                          fill="#6b7280"
                          fontSize={8}
                          textAnchor="middle"
                        >
                          {count}
                        </text>
                      </g>
                    );
                  }}
                />

                <XAxis
                  dataKey="day"
                  axisLine={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                  tickLine={false}
                  tick={(props: any) => {
                    const { x, y, payload, index } = props;
                    const isToday = index === 0; // First item is today
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={16}
                        textAnchor="middle"
                        fill="#374151"
                        fontSize={10}
                        fontWeight={isToday ? 'bold' : 'normal'}
                      >
                        {payload.value}
                      </text>
                    );
                  }}
                  interval={0}
                />
                <YAxis
                  domain={[0, 'dataMax + 10000']}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 25000, 50000, 75000]}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const formattedValue = payload.value === 0 ? '£0' :
                                         payload.value >= 1000 ? `£${payload.value / 1000}k` :
                                         `£${payload.value}`;
                    return (
                      <text
                        x={x}
                        y={y}
                        textAnchor="end"
                        fill="#6b7280"
                        fontSize={9}
                      >
                        {formattedValue}
                      </text>
                    );
                  }}
                  label={{
                    value: 'Amount Due',
                    angle: -90,
                    position: 'insideLeft',
                    offset: -10,
                    style: { fontSize: 10, fill: '#6b7280', textAnchor: 'middle' }
                  }}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  offset={10}
                />
              </BarChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Color Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 px-1">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-red-600"></div>
              <span className="text-[10px] text-gray-600">Peak</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-purple-600"></div>
              <span className="text-[10px] text-gray-600">High value (&gt;£50k)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-purple-400"></div>
              <span className="text-[10px] text-gray-600">Medium (£30-50k)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-purple-200"></div>
              <span className="text-[10px] text-gray-600">Low (&lt;£30k)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-gray-400"></div>
              <span className="text-[10px] text-gray-600">Weekend</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}