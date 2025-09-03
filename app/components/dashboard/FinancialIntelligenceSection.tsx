import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { DollarSign, TrendingUp, Clock, BarChart3, Bot, Brain, Sparkles, CheckCircle } from 'lucide-react'

interface FinancialIntelligenceSectionProps {
  data: any
  formatCurrency: (value: number) => string
  formatNumber: (value: number) => string
  COLORS: any
}

export function DiscountOptimizationSection({ data, formatCurrency, formatNumber, COLORS }: FinancialIntelligenceSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Discount Optimization</h3>
          <p className="text-sm text-gray-600">Strategic cash flow management and early payment discount analysis</p>
        </div>
        <Button variant="outline" size="sm">
          View Opportunities
        </Button>
      </div>
      
      {/* Discount Performance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Q1 Savings</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(1300000)}</p>
                <p className="text-xs text-gray-500 mt-1">From early payments</p>
              </div>
              <div className="p-1.5 rounded-full bg-green-100">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Available Discounts</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(450000)}</p>
                <p className="text-xs text-gray-500 mt-1">Potential savings</p>
              </div>
              <div className="p-1.5 rounded-full bg-blue-100">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Avg Discount Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">2.8%</p>
                <p className="text-xs text-gray-500 mt-1">Early payment terms</p>
              </div>
              <div className="p-1.5 rounded-full bg-purple-100">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Liquidity Impact</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">+15 days</p>
                <p className="text-xs text-gray-500 mt-1">Cash flow benefit</p>
              </div>
              <div className="p-1.5 rounded-full bg-amber-100">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discount vs Liquidity Analysis */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Discount Realization Trends</CardTitle>
            <CardDescription>Monthly savings from early payment discounts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart 
                data={[
                  { month: 'Oct', realized: 380000, available: 420000 },
                  { month: 'Nov', realized: 445000, available: 480000 },
                  { month: 'Dec', realized: 520000, available: 550000 },
                  { month: 'Jan', realized: 475000, available: 520000 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'realized' ? 'Savings Realized' : 'Available Savings']} />
                <Legend />
                <Bar dataKey="realized" fill={COLORS.success} radius={[2, 2, 0, 0]} name="Realized" />
                <Bar dataKey="available" fill={COLORS.info} opacity={0.6} radius={[2, 2, 0, 0]} name="Available" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Strategic Decision Support</CardTitle>
            <CardDescription>Optimize discount capture vs liquidity management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-800">Recommended Actions</span>
                <Badge className="bg-green-100 text-green-700 border-green-300">High Impact</Badge>
              </div>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Capture 15 discounts worth $234K (expires in 3 days)</li>
                <li>• Defer 8 payments to optimize cash flow (+$180K for 10 days)</li>
                <li>• Renegotiate terms with TopVendor Inc for better rates</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-lg font-bold text-blue-600">78%</p>
                <p className="text-xs text-blue-600">Discount Capture Rate</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-lg font-bold text-purple-600">12.4</p>
                <p className="text-xs text-purple-600">Days Cash on Hand</p>
              </div>
            </div>
            
            <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
              <Bot className="h-3 w-3 mr-1" />
              Generate Optimization Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export function LiquidityDecisionEngine({ data, formatCurrency, formatNumber, COLORS }: FinancialIntelligenceSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Liquidity vs Discount Decision Engine</h3>
          <p className="text-sm text-gray-600">Real-time decision support for optimal cash flow and discount strategies</p>
        </div>
        <Button variant="outline" size="sm">
          <Brain className="h-4 w-4 mr-2" />
          Run Analysis
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Decision Matrix */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Smart Decision Matrix</CardTitle>
            <CardDescription>AI-powered recommendations for each payment decision</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Decision Scenarios */}
              <div className="grid gap-3">
                <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">Take Discount - High Priority</span>
                      <Badge className="bg-green-100 text-green-700 border-green-300">Recommended</Badge>
                    </div>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(234000)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-green-600 font-medium">15 invoices</p>
                      <p className="text-green-500">Expires in 3 days</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-medium">2.5% discount rate</p>
                      <p className="text-green-500">High ROI opportunity</p>
                    </div>
                    <div>
                      <p className="text-green-600 font-medium">Low liquidity impact</p>
                      <p className="text-green-500">Cash buffer maintained</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-sm font-medium text-amber-800">Defer Payment - Medium Priority</span>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-300">Consider</Badge>
                    </div>
                    <span className="text-sm font-bold text-amber-600">{formatCurrency(180000)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-amber-600 font-medium">8 invoices</p>
                      <p className="text-amber-500">30-day terms</p>
                    </div>
                    <div>
                      <p className="text-amber-600 font-medium">1.8% discount rate</p>
                      <p className="text-amber-500">Moderate ROI</p>
                    </div>
                    <div>
                      <p className="text-amber-600 font-medium">Hold for liquidity</p>
                      <p className="text-amber-500">+10 days cash flow</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-800">Negotiate Terms - Strategic</span>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">Long-term</Badge>
                    </div>
                    <span className="text-sm font-bold text-blue-600">TopVendor Inc</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-blue-600 font-medium">12 invoices/month</p>
                      <p className="text-blue-500">High volume vendor</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">1.5% current rate</p>
                      <p className="text-blue-500">Improve to 2.8%</p>
                    </div>
                    <div>
                      <p className="text-blue-600 font-medium">Annual savings</p>
                      <p className="text-blue-500">{formatCurrency(156000)} potential</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Impact Summary */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(414000)}</p>
                    <p className="text-xs text-gray-600">Total Decision Value</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(11670)}</p>
                    <p className="text-xs text-green-600">Potential Savings</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">+7.2 days</p>
                    <p className="text-xs text-blue-600">Liquidity Benefit</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Decision Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Decision Dashboard</CardTitle>
            <CardDescription>Live optimization insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Cash Position */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Cash Position</span>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Healthy</Badge>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(3450000)}</p>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Available</span>
                <span>Min threshold: {formatCurrency(1200000)}</span>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '74%' }}></div>
              </div>
            </div>

            {/* Discount Opportunity Score */}
            <div className="p-3 rounded-lg bg-violet-50 border border-violet-200">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium text-violet-700">AI Opportunity Score</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-violet-600">87</span>
                <span className="text-sm text-violet-500 mb-1">/100</span>
              </div>
              <p className="text-xs text-violet-600 mt-1">High discount capture opportunity</p>
            </div>

            {/* Risk Assessment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Liquidity Risk</span>
                <span className="font-medium text-green-600">Low</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Market Volatility</span>
                <span className="font-medium text-amber-600">Medium</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Vendor Reliability</span>
                <span className="font-medium text-green-600">High</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-xs">
                Execute Recommended Actions
              </Button>
              <Button size="sm" variant="outline" className="w-full text-xs">
                Schedule Review
              </Button>
              <Button size="sm" variant="ghost" className="w-full text-xs text-violet-600">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Scenario Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

export function BudgetCashFlowSection({ data, formatCurrency, formatNumber, COLORS }: FinancialIntelligenceSectionProps) {
  const safeToFixed = (value: number, decimals: number = 1) => {
    if (value === null || value === undefined || isNaN(value)) return "0"
    return value.toFixed(decimals)
  }

  const safeNumber = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Budget & Cash Flow Management</h3>
          <p className="text-sm text-gray-600">Strategic financial planning with real-time budget performance and liquidity insights</p>
        </div>
        <Button variant="outline" size="sm">
          Financial Overview
        </Button>
      </div>

      {/* Budget Performance Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(850000)}</p>
                <p className="text-xs text-gray-500 mt-1">Annual allocation</p>
              </div>
              <div className="p-1.5 rounded-full bg-blue-100">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Spent</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(data.summary.total_amount)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  <span className="text-orange-600 font-medium">{safeToFixed((safeNumber(data.summary.total_amount) / 850000) * 100, 1)}%</span> of budget
                </p>
              </div>
              <div className="p-1.5 rounded-full bg-orange-100">
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Remaining</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(850000 - data.summary.total_amount)}</p>
                <p className="text-xs text-gray-500 mt-1">Available to spend</p>
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
                <p className="text-xs font-medium text-gray-600">Burn Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(data.summary.total_amount / (data.summary.date_range_days / 30))}</p>
                <p className="text-xs text-gray-500 mt-1">Per month avg</p>
              </div>
              <div className="p-1.5 rounded-full bg-purple-100">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Budget vs Actual Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Department Budget Performance</CardTitle>
            <CardDescription>Budget utilization by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={data.department_metrics.map((dept: any) => ({
                  ...dept,
                  budget: dept.total_amount * 1.2,
                  utilization: (dept.total_amount / (dept.total_amount * 1.2)) * 100
                }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="department" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `$${safeToFixed(safeNumber(value) / 1000, 0)}k`} />
                <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'total_amount' ? 'Actual Spend' : 'Budget']} />
                <Legend />
                <Bar dataKey="budget" fill="#e5e7eb" name="Budget" radius={[2, 2, 0, 0]} />
                <Bar dataKey="total_amount" fill={COLORS.primary} name="Actual" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Aging Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Invoice Aging</CardTitle>
            <CardDescription>Outstanding payment timeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: '0-30 days', count: data.payment_metrics.outstanding_invoices * 0.6, amount: data.payment_metrics.outstanding_amount * 0.6, color: 'bg-green-500' },
                { label: '31-60 days', count: data.payment_metrics.outstanding_invoices * 0.25, amount: data.payment_metrics.outstanding_amount * 0.25, color: 'bg-yellow-500' },
                { label: '61-90 days', count: data.payment_metrics.outstanding_invoices * 0.1, amount: data.payment_metrics.outstanding_amount * 0.1, color: 'bg-orange-500' },
                { label: '90+ days', count: data.payment_metrics.outstanding_invoices * 0.05, amount: data.payment_metrics.outstanding_amount * 0.05, color: 'bg-red-500' }
              ].map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{Math.round(item.count)} invoices</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${item.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${(item.amount / data.payment_metrics.outstanding_amount) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(item.amount)}</span>
                    <span>{safeToFixed((safeNumber(item.amount) / safeNumber(data.payment_metrics.outstanding_amount)) * 100, 1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Cash Flow Projection</CardTitle>
          <CardDescription>Predicted cash flow based on payment patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart 
              data={(() => {
                const projections = []
                const weeklyOutflow = data.summary.total_amount / (data.summary.date_range_days / 7)
                for (let i = 0; i < 12; i++) {
                  const date = new Date()
                  date.setDate(date.getDate() + (i * 7))
                  projections.push({
                    week: `Week ${i + 1}`,
                    outflow: weeklyOutflow * (0.8 + Math.random() * 0.4),
                    cumulative: weeklyOutflow * (i + 1)
                  })
                }
                return projections
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} tickFormatter={(value) => `$${safeToFixed(safeNumber(value) / 1000, 0)}k`} />
              <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'outflow' ? 'Weekly Outflow' : 'Cumulative']} />
              <Legend />
              <Line type="monotone" dataKey="outflow" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3 }} name="Weekly Outflow" />
              <Line type="monotone" dataKey="cumulative" stroke={COLORS.info} strokeWidth={2} dot={{ r: 3 }} name="Cumulative" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </section>
  )
}