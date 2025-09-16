"use client"

import { useEffect, useState } from "react"
import {
  Clock,
  CheckCircle,
  Users,
  AlertCircle,
  RefreshCw,
  Calendar,
  TrendingUp,
  Target,
  DollarSign,
  AlertTriangle,
  FileText,
  Coins,
  ArrowRight
} from "lucide-react"
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

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const greeting = getGreeting()

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8">
      {/* Header with Controls */}
      <div className="mb-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">{greeting}, Caroline</h1>
            <p className="text-sm text-gray-950">Here's your invoice processing overview for today</p>
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
      </div>


      {/* Payment Priority */}
      <div className="mb-6">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-5 w-5 text-purple-900" />
              <h2 className="text-base font-semibold text-gray-950">Payment Priority</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Due Today */}
              <button
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Calendar className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Due Today</p>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-orange-500 rounded">23</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-950">£45,680</p>
                  <ArrowRight className="h-4 w-4 text-purple-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity mr-1" />
                </div>
              </button>

              {/* Discount Expiring */}
              <button
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Target className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Discount Expiring</p>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-gray-500 rounded">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-950">£12,340</p>
                  <ArrowRight className="h-4 w-4 text-purple-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity mr-1" />
                </div>
              </button>

              {/* Overdue */}
              <button
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <AlertTriangle className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-950 uppercase tracking-wide">Overdue</p>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-red-500 rounded">8</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-950">£28,950</p>
                  <ArrowRight className="h-4 w-4 text-purple-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity mr-1" />
                </div>
              </button>

              {/* On Hold */}
              <button
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:-translate-y-px hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Clock className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-950 uppercase tracking-wide">On Hold</p>
                  </div>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-purple-900 rounded">15</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-950">£67,200</p>
                  <ArrowRight className="h-4 w-4 text-purple-900 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity mr-1" />
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* SLA Performance Section */}
      <div className="mt-6">
        <SLAPerformanceSection
          data={data}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          COLORS={COLORS}
        />
      </div>

      {/* Processing Time Breakdown */}
      <div className="mt-6">
        <ProcessingTimeBreakdown
          data={data}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          COLORS={COLORS}
        />
      </div>

      {/* Invoice Matching Analytics */}
      <div className="mt-6">
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