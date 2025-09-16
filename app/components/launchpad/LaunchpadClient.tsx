"use client"

import { useEffect, useState } from "react"
import { Clock, CheckCircle, Users, AlertCircle, RefreshCw } from "lucide-react"
import { generateDashboardData, DashboardData } from '../dashboard/synthetic-data'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/app/components/ui/card'
import { ProcessingTimeBreakdown, SLAPerformanceSection, InvoiceMatchingAnalytics } from '../dashboard/PerformanceAnalyticsSection'

// Modern fintech color palette
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

export default function LaunchpadClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState("30")
  const [error, setError] = useState<string | null>(null)

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500))

    try {
      const dashboardData = generateDashboardData(dateRange)
      setData(dashboardData)
    } catch (err) {
      setError("Failed to load performance data")
      console.error('Error loading launchpad:', err)
    } finally {
      setLoading(false)
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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Error loading launchpad</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Launchpad</h1>
            <p className="text-gray-600 mt-1">Your central hub for quick actions and insights</p>
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

        {/* SLA Performance Section */}
        <SLAPerformanceSection
          data={data}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          COLORS={COLORS}
        />

        {/* Processing Time Breakdown */}
        <ProcessingTimeBreakdown
          data={data}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          COLORS={COLORS}
        />

        {/* Invoice Matching Analytics */}
        <InvoiceMatchingAnalytics
          data={data}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          COLORS={COLORS}
        />
      </div>
    </div>
  )
}