"use client"

import './dashboard.css'
import { useEffect, useState } from "react"
import { DollarSign, FileText, AlertCircle, CheckCircle, TrendingUp, Brain, Users, Building, BarChart3, Sparkles, Clock, Bot, Zap, X, Pin, RefreshCw } from "lucide-react"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import InvoiceStatusGroups from './InvoiceStatusGroups'
import { generateDashboardData, roiInitiatives as initialRoiInitiatives, DashboardData } from './synthetic-data'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { DiscountOptimizationSection, LiquidityDecisionEngine, BudgetCashFlowSection } from './FinancialIntelligenceSection'
import { ProcessingTimeBreakdown, SLAPerformanceSection, InvoiceMatchingAnalytics } from './PerformanceAnalyticsSection'
import { VendorPerformanceSection, AIInsightsSection } from './VendorAndAISection'

// Modern fintech color palette matching original
const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  neutral: '#6b7280'
}

const STATUS_COLORS = {
  draft: COLORS.neutral,
  processing: COLORS.info,
  review: COLORS.warning,
  pending_approval: COLORS.warning,
  in_approval: COLORS.purple,
  approved: COLORS.success,
  escalated: COLORS.danger,
  paid: COLORS.teal,
  cancelled: COLORS.neutral
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState("30")
  const [currency, setCurrency] = useState("all")
  const [error, setError] = useState<string | null>(null)
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<string>("vendor-analysis")
  const [activeTab, setActiveTab] = useState<string>("operations")
  const [roiInitiatives, setRoiInitiatives] = useState(initialRoiInitiatives)
  
  // Load dashboard data
  useEffect(() => {
    console.log('useEffect triggered, dateRange:', dateRange)
    loadDashboardData()
  }, [dateRange])

  const loadDashboardData = async () => {
    console.log('Loading dashboard data...')
    setLoading(true)
    setError(null)
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const dashboardData = generateDashboardData(dateRange)
      console.log('Dashboard data generated:', dashboardData)
      setData(dashboardData)
    } catch (err) {
      setError("Failed to load dashboard data")
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
      console.log('Loading complete')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  // Calculate ROI metrics
  const calculateROI = () => {
    const selectedInitiatives = roiInitiatives.filter(init => init.checked)
    const totalSavings = selectedInitiatives.reduce((sum, init) => sum + init.impact, 0)
    const totalCost = selectedInitiatives.reduce((sum, init) => sum + init.implementationCost, 0)
    const netROI = totalSavings - totalCost
    const roiPercentage = totalCost > 0 ? ((netROI / totalCost) * 100) : 0
    
    return {
      totalSavings,
      totalCost,
      netROI,
      roiPercentage,
      initiativeCount: selectedInitiatives.length
    }
  }

  const roi = calculateROI()

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Error loading dashboard</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const filteredData = data // In real app, would filter by currency/date range

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice Processing Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and analyze your accounts payable operations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn(
                "p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors",
                refreshing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="dashboard-tabs !h-auto !p-0 !bg-transparent border-b border-gray-200 !rounded-none w-full !justify-start mb-6 !inline-flex">
            <TabsTrigger 
              value="operations" 
              className="!rounded-none relative !border-0 data-[state=active]:!bg-transparent data-[state=active]:!text-violet-600 data-[state=active]:!shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-violet-600 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Operations Overview
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="!rounded-none relative !border-0 data-[state=active]:!bg-transparent data-[state=active]:!text-violet-600 data-[state=active]:!shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-violet-600 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Intelligence
            </TabsTrigger>
            <TabsTrigger 
              value="performance" 
              className="!rounded-none relative !border-0 data-[state=active]:!bg-transparent data-[state=active]:!text-violet-600 data-[state=active]:!shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-violet-600 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="vendors" 
              className="!rounded-none relative !border-0 data-[state=active]:!bg-transparent data-[state=active]:!text-violet-600 data-[state=active]:!shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-violet-600 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            >
              <Building className="h-4 w-4 mr-2" />
              Vendor Analytics
            </TabsTrigger>
            <TabsTrigger 
              value="ai-insights" 
              className="!rounded-none relative !border-0 data-[state=active]:!bg-transparent data-[state=active]:!text-violet-600 data-[state=active]:!shadow-none data-[state=active]:after:absolute data-[state=active]:after:bottom-[-1px] data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-violet-600 px-4 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Insights
            </TabsTrigger>
          </TabsList>

          {/* Operations Overview Tab */}
          <TabsContent value="operations" className="space-y-8">
              {/* Invoice Status Overview Section */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Invoice Status Overview</h3>
                    <p className="text-sm text-gray-600">Monitor and manage invoices by their current workflow status</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View All Invoices
                  </Button>
                </div>
                <InvoiceStatusGroups 
                  data={filteredData.grouped_status_metrics}
                  formatCurrency={formatCurrency}
                  formatNumber={formatNumber}
                  onGroupClick={(group) => {
                    console.log('Group clicked:', group)
                  }}
                />
              </section>

              {/* Key Performance Indicators Section */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Processing Metrics</h3>
                  <p className="text-sm text-gray-600">Essential metrics and financial summaries for your AP operations</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Total Invoices</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.summary.total_invoices)}</p>
                        <p className="text-xs text-gray-500 mt-1">Last {data.summary.date_range_days} days</p>
                      </div>
                      <div className="p-2 rounded-full bg-violet-100">
                        <FileText className="h-5 w-5 text-violet-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.summary.total_amount)}</p>
                        <p className="text-xs text-gray-500 mt-1">Processing volume</p>
                      </div>
                      <div className="p-2 rounded-full bg-green-100">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Pending Approval</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.processing_metrics.pending_approval)}</p>
                        <p className="text-xs text-gray-500 mt-1">Requires action</p>
                      </div>
                      <div className="p-2 rounded-full bg-yellow-100">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Escalated</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.processing_metrics.escalated)}</p>
                        <p className="text-xs text-gray-500 mt-1">High priority</p>
                      </div>
                      <div className="p-2 rounded-full bg-red-100">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Invoice Trends Chart */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Processing Volume Trends</h3>
                  <p className="text-sm text-gray-600">Daily invoice processing volume and amounts</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.invoice_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(value)}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        dot={false}
                        name="Amount"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke={COLORS.success} 
                        strokeWidth={2}
                        dot={false}
                        name="Count"
                        yAxisId="right"
                      />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {/* Status Distribution */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Status Distribution</h3>
                  <p className="text-sm text-gray-600">Invoice breakdown by current status</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.status_distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="status" 
                          tick={{ fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: any) => formatNumber(value as number)} />
                        <Bar 
                          dataKey="count" 
                          fill={COLORS.primary} 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={data.status_distribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry: any) => `${entry.status}: ${entry.count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {data.status_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index % Object.values(STATUS_COLORS).length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              {/* Unallocated Expenses Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Unallocated Expenses</h3>
                    <p className="text-sm text-gray-600">Track unplanned expenses and amounts requiring reconciliation</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Reconcile Items
                  </Button>
                </div>
                
                {/* Unallocated Expense Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Unplanned Delivery</p>
                          <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(34500)}</p>
                          <p className="text-xs text-gray-500 mt-1">Costs & customs duty</p>
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
                          <p className="text-xs font-medium text-gray-600">Unallocated GL</p>
                          <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(28700)}</p>
                          <p className="text-xs text-gray-500 mt-1">Missing GL codes</p>
                        </div>
                        <div className="p-1.5 rounded-full bg-red-100">
                          <FileText className="h-4 w-4 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Tolerance Impact</p>
                          <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatCurrency(15200)}</p>
                          <p className="text-xs text-gray-500 mt-1">3% tolerance rule</p>
                        </div>
                        <div className="p-1.5 rounded-full bg-blue-100">
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-600">Journal Entries</p>
                          <p className="text-2xl font-bold text-gray-900 mt-0.5">24</p>
                          <p className="text-xs text-gray-500 mt-1">Required this month</p>
                        </div>
                        <div className="p-1.5 rounded-full bg-purple-100">
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Unallocated Analysis */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Unallocated Expense Breakdown</CardTitle>
                      <CardDescription>Category-wise analysis of unplanned expenses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Delivery & Freight</p>
                              <p className="text-xs text-gray-500">Unexpected shipping costs</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-orange-600">{formatCurrency(22100)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Customs & Duty</p>
                              <p className="text-xs text-gray-500">Import duties and taxes</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-red-600">{formatCurrency(12400)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Unallocated Items</p>
                              <p className="text-xs text-gray-500">No matching PO items</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-blue-600">{formatCurrency(28700)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <div>
                              <p className="text-sm font-medium">Tolerance Adjustments</p>
                              <p className="text-xs text-gray-500">Within 3% tolerance band</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-purple-600">{formatCurrency(15200)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Total Unallocated</span>
                          <span className="text-lg font-bold text-gray-900">{formatCurrency(78400)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Monthly Reconciliation</CardTitle>
                      <CardDescription>Items requiring manual journal entries</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-amber-800">Pending Actions</span>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-300">Urgent</Badge>
                          </div>
                          <ul className="text-xs text-amber-700 space-y-1">
                            <li>• 12 invoices need GL code assignment</li>
                            <li>• 8 customs entries awaiting approval</li>
                            <li>• 4 freight charges require allocation</li>
                          </ul>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-lg font-bold text-green-600">89%</p>
                            <p className="text-xs text-green-600">Month-end Ready</p>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-lg font-bold text-blue-600">-18%</p>
                            <p className="text-xs text-blue-600">vs Last Month</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Auto-allocation rate</span>
                            <span className="font-medium">67%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-violet-400 h-2 rounded-full" style={{ width: '67%' }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700">
                        <Bot className="h-3 w-3 mr-1" />
                        Auto-Allocate GL Codes
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Recent Activity */}
              <Card className="transition-all duration-200 border">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                  <CardDescription>Latest invoice processing updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Recent Activity Items */}
                    {data.recent_activity && data.recent_activity.length > 0 ? (
                      <div className="space-y-2">
                        {data.recent_activity.slice(0, 4).map((invoice: any) => (
                          <div key={invoice.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS] || COLORS.neutral }} />
                              <div>
                                <p className="text-sm font-medium">{invoice.invoice_number}</p>
                                <p className="text-xs text-muted-foreground">{invoice.vendor_name} • {new Date(invoice.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatCurrency(invoice.total_due)}</p>
                              <p className="text-xs text-muted-foreground capitalize">{invoice.status.replace('_', ' ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs mt-1">Invoice updates will appear here</p>
                      </div>
                    )}
                    
                    {data.recent_activity && data.recent_activity.length > 0 && (
                      <div className="pt-2 border-t border-gray-100 mt-3">
                        <button 
                          className="w-full py-2 text-sm text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors"
                          onClick={() => window.location.href = '/'}
                        >
                          View all recent activity
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          {/* Financial Intelligence Tab */}
          <TabsContent value="financial" className="space-y-8">
              <DiscountOptimizationSection 
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />
              
              <LiquidityDecisionEngine
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />
              
              <BudgetCashFlowSection
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />
          </TabsContent>

          {/* Performance Analytics Tab */}
          <TabsContent value="performance" className="space-y-8">
              {/* Performance KPIs */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Avg Processing Time</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">2.3 days</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="text-green-600 font-medium">↓ 15%</span> from last month
                        </p>
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
                        <p className="text-xs font-medium text-gray-600">SLA Compliance</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">94.2%</p>
                        <p className="text-xs text-gray-500 mt-1">Above 90% target</p>
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
                        <p className="text-xs font-medium text-gray-600">Active Users</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">12</p>
                        <p className="text-xs text-gray-500 mt-1">Processing invoices</p>
                      </div>
                      <div className="p-1.5 rounded-full bg-purple-100">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600">Exception Rate</p>
                        <p className="text-2xl font-bold text-gray-900 mt-0.5">5.8%</p>
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="text-red-600 font-medium">↑ 2%</span> vs target
                        </p>
                      </div>
                      <div className="p-1.5 rounded-full bg-orange-100">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <SLAPerformanceSection
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />

              <ProcessingTimeBreakdown
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />

              <InvoiceMatchingAnalytics
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />
          </TabsContent>

          {/* Vendor Analytics Tab */}
          <TabsContent value="vendors" className="space-y-8">
              <VendorPerformanceSection
                data={data} 
                formatCurrency={formatCurrency} 
                formatNumber={formatNumber}
                COLORS={COLORS}
              />

              {/* Vendor Metrics Table */}
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Vendor Performance Metrics</h3>
                  <p className="text-sm text-gray-600">Detailed vendor statistics</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Invoices</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spend</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.vendor_metrics.slice(0, 8).map((vendor, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.vendor__name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatNumber(vendor.invoice_count)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(vendor.total_amount)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(vendor.avg_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights" className="space-y-6">
              <section className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
                  <p className="text-sm text-gray-600">Intelligent recommendations and anomaly detection</p>
                </div>
                
                {/* Anomaly Detection */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Detected Anomalies
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Unusual spike in Marketing department spending</p>
                        <p className="text-xs text-gray-600 mt-1">45% increase compared to 3-month average</p>
                      </div>
                      <button className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                        Investigate
                      </button>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Duplicate invoice detected</p>
                        <p className="text-xs text-gray-600 mt-1">Invoice #INV-2024-1847 matches previous submission</p>
                      </div>
                      <button className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700">
                        Review
                      </button>
                    </div>
                  </div>
                </div>

                {/* ROI Initiatives */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-violet-600" />
                    ROI Optimization Initiatives
                  </h4>
                  
                  <div className="space-y-3 mb-6">
                    {roiInitiatives.map((initiative) => (
                      <div key={initiative.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={initiative.checked}
                          onChange={(e) => {
                            setRoiInitiatives(prev => 
                              prev.map(init => 
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
                        <p className="text-lg font-bold text-violet-600">{formatPercent(roi.roiPercentage)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Predictive Analytics */}
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Predictive Analytics
                  </h4>
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
                </div>
              </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}