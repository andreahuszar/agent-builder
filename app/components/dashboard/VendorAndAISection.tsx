import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { Building, TrendingUp, AlertCircle, CheckCircle, Brain, Bot, Zap, Sparkles } from 'lucide-react'

interface SectionProps {
  data: any
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
  COLORS: any
  roiInitiatives?: any[]
  setRoiInitiatives?: (initiatives: any[]) => void
}

export function VendorPerformanceSection({ data, formatCurrency, formatNumber, COLORS }: SectionProps) {
  return (
    <>
      {/* Vendor Performance Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Vendor Performance Matrix</CardTitle>
          <CardDescription>Invoice volume vs average processing time by vendor</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                dataKey="invoice_count" 
                name="Invoice Count" 
                stroke="#888" 
                fontSize={12}
                label={{ value: 'Invoice Volume', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                type="number" 
                dataKey="avg_processing_days" 
                name="Avg Processing Days" 
                stroke="#888" 
                fontSize={12}
                label={{ value: 'Avg Processing Days', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                        <p className="font-semibold text-sm">{data.vendor__name}</p>
                        <p className="text-xs text-gray-600">Invoices: {data.invoice_count}</p>
                        <p className="text-xs text-gray-600">Avg Days: {data.avg_processing_days}</p>
                        <p className="text-xs text-gray-600">Total: {formatCurrency(data.total_amount)}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Scatter 
                name="Vendors" 
                data={data.vendor_metrics.map((v: any) => ({
                  ...v,
                  avg_processing_days: 2 + Math.random() * 5 // Mock processing days
                }))} 
                fill={COLORS.primary}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vendor Reliability Matrix */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Vendor Reliability Score</CardTitle>
            <CardDescription>Performance metrics and compliance rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.vendor_metrics.slice(0, 5).map((vendor: any, index: number) => {
                const reliabilityScore = 85 + Math.random() * 15
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{vendor.vendor__name}</span>
                      <Badge 
                        className={
                          reliabilityScore > 95 ? "bg-green-100 text-green-700" :
                          reliabilityScore > 90 ? "bg-blue-100 text-blue-700" :
                          reliabilityScore > 85 ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }
                      >
                        {reliabilityScore.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          reliabilityScore > 95 ? 'bg-green-500' :
                          reliabilityScore > 90 ? 'bg-blue-500' :
                          reliabilityScore > 85 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${reliabilityScore}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{vendor.invoice_count} invoices</span>
                      <span>{formatCurrency(vendor.total_amount)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Payment Terms Optimization</CardTitle>
            <CardDescription>Recommended payment term adjustments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { vendor: 'Tech Solutions Inc', current: 'Net 30', recommended: '2/10 Net 30', savings: 24500 },
                { vendor: 'Office Supplies Co', current: 'Net 45', recommended: 'Net 30', savings: 12300 },
                { vendor: 'Marketing Agency', current: 'Net 60', recommended: '3/15 Net 45', savings: 18700 },
                { vendor: 'Consulting Group', current: 'Net 30', recommended: '2/10 Net 30', savings: 8900 }
              ].map((item, index) => (
                <div key={index} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.vendor}</span>
                    <Badge className="bg-green-100 text-green-700">
                      +{formatCurrency(item.savings)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600">Current: {item.current}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-blue-600 font-medium">Recommended: {item.recommended}</span>
                  </div>
                </div>
              ))}
              <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                <Bot className="h-3 w-3 mr-1" />
                Generate Negotiation Scripts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Vendor Performance Metrics</CardTitle>
          <CardDescription>Detailed vendor statistics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spend</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">On-Time %</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.vendor_metrics.slice(0, 8).map((vendor: any, idx: number) => {
                  const onTimeRate = 85 + Math.random() * 15
                  const trend = Math.random() > 0.5 ? 'up' : 'down'
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.vendor__name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatNumber(vendor.invoice_count)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(vendor.total_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(vendor.avg_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        <span className={onTimeRate > 90 ? "text-green-600" : "text-orange-600"}>
                          {onTimeRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <span className={trend === 'up' ? "text-green-600" : "text-red-600"}>
                          {trend === 'up' ? '↑' : '↓'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export function AIInsightsSection({ data, formatCurrency, formatNumber, COLORS, roiInitiatives = [], setRoiInitiatives = () => {} }: SectionProps) {
  const roi = {
    initiativeCount: roiInitiatives.filter(i => i.checked).length,
    totalSavings: roiInitiatives.filter(i => i.checked).reduce((sum, i) => sum + i.impact, 0),
    totalCost: roiInitiatives.filter(i => i.checked).reduce((sum, i) => sum + i.implementationCost, 0),
    netROI: roiInitiatives.filter(i => i.checked).reduce((sum, i) => sum + i.impact - i.implementationCost, 0),
    roiPercentage: roiInitiatives.filter(i => i.checked).length > 0 ? 
      ((roiInitiatives.filter(i => i.checked).reduce((sum, i) => sum + i.impact - i.implementationCost, 0) / 
        roiInitiatives.filter(i => i.checked).reduce((sum, i) => sum + i.implementationCost, 0)) * 100) : 0
  }

  return (
    <>
      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Detected Anomalies
          </CardTitle>
          <CardDescription>Real-time anomaly detection and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Unusual spike in Marketing department spending</p>
                <p className="text-xs text-gray-600 mt-1">45% increase compared to 3-month average</p>
              </div>
              <Button size="sm" className="text-xs bg-yellow-600 hover:bg-yellow-700">
                Investigate
              </Button>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Duplicate invoice detected</p>
                <p className="text-xs text-gray-600 mt-1">Invoice #INV-2024-1847 matches previous submission</p>
              </div>
              <Button size="sm" className="text-xs bg-orange-600 hover:bg-orange-700">
                Review
              </Button>
            </div>

            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Vendor compliance issue</p>
                <p className="text-xs text-gray-600 mt-1">Tech Solutions Inc missing required tax documentation</p>
              </div>
              <Button size="sm" className="text-xs bg-red-600 hover:bg-red-700">
                Action Required
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI Initiatives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-600" />
            ROI Optimization Initiatives
          </CardTitle>
          <CardDescription>AI-recommended process improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            {roiInitiatives.map((initiative) => (
              <div key={initiative.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={initiative.checked}
                  onChange={(e) => {
                    setRoiInitiatives(
                      roiInitiatives.map(init => 
                        init.id === initiative.id 
                          ? { ...init, checked: e.target.checked }
                          : init
                      )
                    )
                  }}
                  className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{initiative.name}</p>
                  <p className="text-xs text-gray-600 mt-1">{initiative.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-green-600 font-medium">
                      +{formatCurrency(initiative.impact)} impact
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatCurrency(initiative.implementationCost)} cost
                    </span>
                    <span className="text-xs text-gray-500">
                      {initiative.timeframe}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ROI Summary */}
          <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-600">Selected</p>
                <p className="text-lg font-bold text-gray-900">{roi.initiativeCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Savings</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(roi.totalSavings)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Cost</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(roi.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Net ROI</p>
                <p className="text-lg font-bold text-violet-600">{formatCurrency(roi.netROI)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">ROI %</p>
                <p className="text-lg font-bold text-violet-600">{roi.roiPercentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Predictive Analytics
          </CardTitle>
          <CardDescription>AI-powered forecasting and trend analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Next Month Forecast</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(2456000)}</p>
              <p className="text-xs text-gray-600 mt-1">Based on historical patterns</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Cash Flow Optimization</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(145000)}</p>
              <p className="text-xs text-gray-600 mt-1">Potential savings identified</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">Low</p>
              <p className="text-xs text-gray-600 mt-1">92% compliance rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spending Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Category Spending Insights</CardTitle>
          <CardDescription>AI analysis of spending patterns by category</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Technology', value: 35, color: COLORS.primary },
                  { name: 'Marketing', value: 25, color: COLORS.success },
                  { name: 'Operations', value: 20, color: COLORS.warning },
                  { name: 'HR', value: 12, color: COLORS.info },
                  { name: 'Other', value: 8, color: COLORS.neutral }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[COLORS.primary, COLORS.success, COLORS.warning, COLORS.info, COLORS.neutral].map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  )
}