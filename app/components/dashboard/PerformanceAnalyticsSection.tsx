import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Clock, CheckCircle, Users, AlertCircle, Bot } from 'lucide-react'

interface AnalyticsSectionProps {
  data: any
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
  COLORS: any
}

export function ProcessingTimeBreakdown({ data, formatCurrency, formatNumber, COLORS }: AnalyticsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Processing Time Breakdown</CardTitle>
        <CardDescription>Average time spent in each approval stage</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart 
            data={[
              { stage: 'Extraction & Validation', hours: 0.5, percentage: 12 },
              { stage: 'Initial Review', hours: 2.1, percentage: 35 },
              { stage: 'Manager Approval', hours: 1.8, percentage: 30 },
              { stage: 'Finance Approval', hours: 1.0, percentage: 17 },
              { stage: 'Final Processing', hours: 0.4, percentage: 6 }
            ]}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="stage" 
              stroke="#888" 
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `${value}h`} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              formatter={(value: number, name: string) => [`${value} hours (${(value * 100 / 6).toFixed(0)}% of total time)`, 'Avg Time']}
            />
            <Bar dataKey="hours" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function SLAPerformanceSection({ data, formatCurrency, formatNumber, COLORS }: AnalyticsSectionProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* SLA Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">SLA Performance Trends</CardTitle>
          <CardDescription>Daily SLA compliance rates</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart 
              data={(() => {
                // Generate SLA performance data for last 14 days
                const slaData = []
                for (let i = 13; i >= 0; i--) {
                  const date = new Date()
                  date.setDate(date.getDate() - i)
                  slaData.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    compliance: 85 + Math.random() * 15, // 85-100% range
                    target: 90
                  })
                }
                return slaData
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} domain={[80, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'compliance' ? 'SLA Compliance' : 'Target']}
              />
              <Line type="monotone" dataKey="target" stroke="#e5e7eb" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target (90%)" />
              <Line type="monotone" dataKey="compliance" stroke={COLORS.success} strokeWidth={3} dot={{ r: 4 }} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      {/* Team Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Team Workload Distribution</CardTitle>
          <CardDescription>Current assignments per team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Sarah Chen', department: 'AP Manager', workload: 85, pending: 12, color: 'bg-violet-500' },
              { name: 'Michael Johnson', department: 'AP Specialist', workload: 92, pending: 15, color: 'bg-blue-500' },
              { name: 'Anna Rodriguez', department: 'AP Clerk', workload: 68, pending: 8, color: 'bg-green-500' },
              { name: 'David Kim', department: 'Senior AP', workload: 78, pending: 10, color: 'bg-amber-500' },
              { name: 'Lisa Park', department: 'AP Analyst', workload: 45, pending: 5, color: 'bg-purple-500' }
            ].map((member, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${member.color}`}>
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{member.name}</span>
                      <p className="text-xs text-muted-foreground">{member.department}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{member.pending} pending</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      member.workload > 90 ? 'bg-red-500' : 
                      member.workload > 75 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${member.workload}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{member.workload}% capacity</span>
                  <span className={
                    member.workload > 90 ? 'text-red-600' : 
                    member.workload > 75 ? 'text-amber-600' : 'text-green-600'
                  }>
                    {member.workload > 90 ? 'Overloaded' : member.workload > 75 ? 'Busy' : 'Available'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function InvoiceMatchingAnalytics({ data, formatCurrency, formatNumber, COLORS }: AnalyticsSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Invoice Matching Analytics</h3>
          <p className="text-sm text-gray-600">Track invoice-to-PO-to-GRN matching accuracy and delta trends</p>
        </div>
        <Button variant="outline" size="sm">
          View Details
        </Button>
      </div>
      
      {/* Matching Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Matching Accuracy</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">92.4%</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-green-600 font-medium">↑ 3.2%</span> from last month
                </p>
              </div>
              <div className="p-1.5 rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Delta Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(45600)}</p>
                <p className="text-xs text-gray-500 mt-1">Requiring reconciliation</p>
              </div>
              <div className="p-1.5 rounded-full bg-orange-100">
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Avg Resolution Time</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">1.8 days</p>
                <p className="text-xs text-gray-500 mt-1">For delta reconciliation</p>
              </div>
              <div className="p-1.5 rounded-full bg-blue-100">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Auto-Matched</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">78%</p>
                <p className="text-xs text-gray-500 mt-1">Without manual review</p>
              </div>
              <div className="p-1.5 rounded-full bg-purple-100">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delta Analysis Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Matching Delta Trends by Currency</CardTitle>
            <CardDescription>Invoice-to-PO-to-GRN matching discrepancies over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={[
                  { month: 'Sep', USD: 12000, GBP: 8500, EUR: 5200, CAD: 3100 },
                  { month: 'Oct', USD: 10500, GBP: 7200, EUR: 4800, CAD: 2800 },
                  { month: 'Nov', USD: 8900, GBP: 6100, EUR: 4200, CAD: 2400 },
                  { month: 'Dec', USD: 7600, GBP: 5400, EUR: 3800, CAD: 2100 },
                  { month: 'Jan', USD: 6800, GBP: 4900, EUR: 3500, CAD: 1900 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="USD" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="GBP" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="EUR" stroke={COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="CAD" stroke={COLORS.info} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Common Delta Reasons</CardTitle>
            <CardDescription>Root causes for invoice-PO mismatches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { reason: 'Price Variance', count: 145, percentage: 35, impact: 18500, color: 'bg-red-500' },
                { reason: 'Quantity Mismatch', count: 98, percentage: 24, impact: 12300, color: 'bg-orange-500' },
                { reason: 'Tax Differences', count: 72, percentage: 18, impact: 8900, color: 'bg-yellow-500' },
                { reason: 'Missing Line Items', count: 56, percentage: 14, impact: 4200, color: 'bg-blue-500' },
                { reason: 'Currency Exchange', count: 38, percentage: 9, impact: 1700, color: 'bg-purple-500' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-sm font-medium">{item.reason}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.count} cases</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.percentage}% of total</span>
                    <span className="font-medium">{formatCurrency(item.impact)} impact</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}