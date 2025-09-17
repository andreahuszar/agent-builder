"use client"

import { useEffect, useState } from "react"
import {
  Clock,
  CheckCircle,
  Users,
  AlertCircle,
  RefreshCw,
  Calendar,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  AlertTriangle,
  FileText,
  Coins,
  ArrowRight,
  Building2,
  Truck,
  UserCheck,
  Send,
  Minus,
  FileUp,
  Search,
  Download,
  Star,
  Zap,
  Info,
  LayoutDashboard,
  Columns3
} from "lucide-react"
import { generateDashboardData, DashboardData } from '../dashboard/synthetic-data'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/app/components/ui/card'
import DueNext7DaysSparkline from './DueNext7DaysSparkline'
import KanbanBoard from './KanbanBoard'
import LightningActions from './LightningActions'

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
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [hoveredAgingIndex, setHoveredAgingIndex] = useState<number | null>(null)
  const [hoveredVendorIndex, setHoveredVendorIndex] = useState<number | null>(null)
  const [activeView, setActiveView] = useState<'dashboard' | 'kanban' | 'lightning'>('dashboard')

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [dateRange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
      // Direct shortcuts when palette is closed
      if (!showCommandPalette) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
          e.preventDefault()
          console.log('Upload invoice')
        }
        if ((e.metaKey || e.ctrlKey) && e.key === '/') {
          e.preventDefault()
          console.log('Quick search')
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
          e.preventDefault()
          console.log('Export reports')
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
          e.preventDefault()
          console.log('Approve pending')
        }
      }
      // Close palette on Escape
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCommandPalette])

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
      {/* Command Palette Modal */}
      {showCommandPalette && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowCommandPalette(false)}
          />

          {/* Palette */}
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-white rounded-lg shadow-2xl border border-gray-300 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-950">Command Palette</h3>
                <span className="text-xs text-gray-500">Press Esc to close</span>
              </div>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Type a command or search..."
                autoFocus
              />
            </div>

            <div className="p-2 max-h-96 overflow-y-auto">
              <div className="text-xs font-medium text-gray-600 px-2 py-1 mb-1">Quick Actions</div>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Upload invoice')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Upload Invoice</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘U</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Quick search')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Quick Search</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘/</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Export reports')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Export Reports</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘E</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Approve pending')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Approve Pending</span>
                  <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                    5
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘A</span>
              </button>

              <div className="text-xs font-medium text-gray-600 px-2 py-1 mb-1 mt-3">More Actions</div>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Create payment run')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Create Payment Run</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘P</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('View remittance')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">View Remittance Advice</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘R</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Refresh dashboard')
                  handleRefresh()
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Refresh Dashboard</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘⇧R</span>
              </button>

              <div className="text-xs font-medium text-gray-600 px-2 py-1 mb-1 mt-3">Navigation</div>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  setActiveSection('invoices')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">Go to Invoices</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘I</span>
              </button>

              <button
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 rounded-md transition-colors group"
                onClick={() => {
                  console.log('Go to settings')
                  setShowCommandPalette(false)
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-800">View Exceptions</span>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">⌘X</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Quick Actions Bar */}
      <div className="mb-6">
        <Card className="border border-gray-200">
          <CardContent className="p-1.5">
            <div className="flex items-center gap-1 h-7">
              <span className="text-xs font-medium text-gray-600 px-2">Quick Actions:</span>

              <div className="flex items-center gap-1 flex-1">
                {/* Upload Invoice */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-purple-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  onClick={() => console.log('Upload invoice')}
                  title="Upload Invoice (⌘U)"
                >
                  <FileUp className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-800">Upload</span>
                </button>

                <div className="h-4 w-px bg-gray-200" />

                {/* Quick Search */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-purple-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  onClick={() => console.log('Quick search')}
                  title="Quick Search (⌘/)"
                >
                  <Search className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-800">Search</span>
                </button>

                <div className="h-4 w-px bg-gray-200" />

                {/* Export Reports */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-purple-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  onClick={() => console.log('Export reports')}
                  title="Export Reports (⌘E)"
                >
                  <Download className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-800">Export</span>
                </button>

                <div className="h-4 w-px bg-gray-200" />

                {/* Approve Pending */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-purple-50 transition-colors group focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 relative"
                  onClick={() => console.log('Approve pending')}
                  title="Approve Pending (⌘A)"
                >
                  <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-gray-800">Approve</span>
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                    5
                  </span>
                </button>
              </div>

              <div className="ml-auto px-2 flex items-center">
                <button
                  type="button"
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  onClick={() => setShowCommandPalette(true)}
                >
                  ⌘K for more
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

            {/* View Switcher */}
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border transition-all",
                  "rounded-l-md",
                  activeView === 'dashboard'
                    ? "bg-purple-900 text-white border-purple-900 z-10"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
                title="Dashboard View"
              >
                <LayoutDashboard className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('kanban')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-t border-b transition-all",
                  "-ml-px",
                  activeView === 'kanban'
                    ? "bg-purple-900 text-white border-purple-900 z-10"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
                title="Kanban View"
              >
                <Columns3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('lightning')}
                className={cn(
                  "px-3 py-2 text-sm font-medium border transition-all",
                  "rounded-r-md -ml-px",
                  activeView === 'lightning'
                    ? "bg-purple-900 text-white border-purple-900 z-10"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
                title="Lightning View"
              >
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <>
          {/* Payment Priority */}
          <div className="mb-6 mt-6">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Coins className="h-4 w-4 text-purple-900" />
              <h2 className="text-base font-semibold text-gray-950">Payment Priority</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {/* Due Today */}
              <button
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Calendar className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">Due Today</p>
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
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Target className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">Discount Expiring</p>
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
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <AlertTriangle className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">Overdue</p>
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
                className="relative bg-white rounded-lg px-2.5 py-2 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                tabIndex={0}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-purple-100 group-hover:bg-purple-200 transition-colors">
                      <Clock className="h-3 w-3 text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800">On Hold</p>
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

      {/* Due Next 7 Days Sparkline */}
      <DueNext7DaysSparkline
        onOpenQueue={() => {
          // Navigate to invoices filtered by due date
          console.log('Opening queue for invoices due in next 7 days');
        }}
      />

      {/* Exception Analysis - Full Width */}
      <div className="mb-6">
        <Card className="border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <h2 className="text-base font-semibold text-gray-950">Exception Analysis</h2>
                </div>
                <button
                  type="button"
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  onClick={() => setActiveSection('invoices')}
                >
                  View all
                </button>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    reason: 'Missing PO',
                    value: 125890,
                    count: 34,
                    aging: '3-5 days',
                    action: 'Request PO from buyer',
                    effort: 'medium',
                    trend: 'up',
                    trendValue: '+12%',
                    vendor: 'Acme Corp',
                    sparkline: '0,12 6,10 12,11 18,7 24,5 32,2'
                  },
                  {
                    reason: 'No GR',
                    value: 67230,
                    count: 28,
                    aging: '5-7 days',
                    action: 'Chase receiving team',
                    effort: 'high',
                    trend: 'up',
                    trendValue: '+8%',
                    vendor: 'BuildCo',
                    sparkline: '0,14 8,13 16,10 24,8 32,4'
                  },
                  {
                    reason: 'Price Tolerance Breach',
                    value: 89340,
                    count: 21,
                    aging: '2-3 days',
                    action: 'Approve variance',
                    effort: 'low',
                    trend: 'down',
                    trendValue: '-5%',
                    vendor: 'TechSupply Ltd',
                    sparkline: '0,4 8,5 16,7 24,11 32,13'
                  },
                  {
                    reason: 'Missing Tax Code',
                    value: 34560,
                    count: 15,
                    aging: '1-2 days',
                    action: 'Check in the system',
                    effort: 'low',
                    trend: 'stable',
                    trendValue: '0%',
                    vendor: 'Global Parts',
                    sparkline: '0,8 8,9 16,7 24,8 32,8'
                  },
                  {
                    reason: 'Duplicate',
                    value: 45670,
                    count: 12,
                    aging: '1-2 days',
                    action: 'Verify & reject',
                    effort: 'low',
                    trend: 'down',
                    trendValue: '-15%',
                    vendor: 'Office Plus',
                    sparkline: '0,2 8,6 16,8 24,10 32,14'
                  },
                  {
                    reason: 'Invalid Vendor',
                    value: 23400,
                    count: 8,
                    aging: '7+ days',
                    action: 'Update master data',
                    effort: 'high',
                    trend: 'up',
                    trendValue: '+3%',
                    vendor: 'New Supplier X',
                    sparkline: '0,10 8,9 16,8 24,6 32,5'
                  },
                ].sort((a, b) => {
                  // Sort by urgency: high effort + increasing trend + older aging first
                  const urgencyScore = (item: any) => {
                    let score = 0;
                    if (item.effort === 'high') score += 3;
                    else if (item.effort === 'medium') score += 2;
                    else score += 1;

                    if (item.trend === 'up') score += 2;
                    else if (item.trend === 'stable') score += 1;

                    if (item.aging.includes('7+')) score += 3;
                    else if (item.aging.includes('5-7')) score += 2;
                    else if (item.aging.includes('3-5')) score += 1;

                    return score;
                  };
                  return urgencyScore(b) - urgencyScore(a);
                }).slice(0, 5).map((item) => (
                  <button
                    key={item.reason}
                    className="relative bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                    onClick={() => setActiveSection('invoices')}
                    tabIndex={0}
                  >
                    <div className="flex flex-col gap-0.5">
                      {/* Header with title and count */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 text-xs font-medium ${
                            item.count > 20 ? 'text-red-600 bg-red-50 group-hover:bg-red-100' : 'text-gray-950 bg-purple-100 group-hover:bg-purple-200'
                          } rounded transition-colors`}>
                            {item.count}
                          </span>
                          <p className="text-sm flex-1">
                            <span className="font-semibold text-gray-800">{item.reason}</span>
                            <span className="text-xs text-gray-600 ml-1.5">• {item.action}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Trend sparkline */}
                          <div className="flex flex-col items-end">
                            <svg width="32" height="16" className="overflow-visible">
                              <polyline
                                points={item.sparkline}
                                fill="none"
                                stroke={
                                  item.trend === 'up' ? '#ef4444' :
                                  item.trend === 'down' ? '#10b981' :
                                  '#9ca3af'
                                }
                                strokeWidth="1.5"
                              />
                              {/* End point dot */}
                              {(() => {
                                const lastPoint = item.sparkline.split(' ').pop()?.split(',');
                                if (lastPoint) {
                                  return (
                                    <circle
                                      cx={lastPoint[0]}
                                      cy={lastPoint[1]}
                                      r="1.5"
                                      fill={
                                        item.trend === 'up' ? '#ef4444' :
                                        item.trend === 'down' ? '#10b981' :
                                        '#9ca3af'
                                      }
                                    />
                                  );
                                }
                              })()}
                            </svg>
                            <span className={`text-[9px] font-medium ${
                              item.trend === 'up' ? 'text-red-500' :
                              item.trend === 'down' ? 'text-green-500' :
                              'text-gray-400'
                            }`}>
                              {item.trendValue}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Value */}
                      <div>
                        <p className="text-lg font-bold text-gray-950">£{item.value.toLocaleString()}</p>
                      </div>

                      {/* Vendor and aging with button */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-gray-600">Top vendor:</span>
                          <span className="text-gray-800 font-medium truncate" title={item.vendor}>
                            {item.vendor}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-gray-600">Aging:</span>
                          <span className={`font-medium ${
                            item.aging.includes('7+') ? 'text-red-600' : 'text-gray-800'
                          }`}>
                            {item.aging}
                          </span>
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSection('invoices');
                          }}
                          className="flex items-center gap-0.5 text-xs font-medium text-purple-600 hover:text-purple-700 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity cursor-pointer"
                        >
                          <span>Open Queue</span>
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
        </Card>
      </div>

      {/* Blocked By Section - Full Width */}
      <div className="mb-6">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-purple-900" />
              <h2 className="text-base font-semibold text-gray-950">Invoices Blocked By</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {/* Approvers */}
                <div
                  className="relative bg-white rounded-lg px-3 py-3 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-950">Approvers</p>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-sm font-medium text-gray-950 bg-gray-100 rounded">23</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Median wait:</span>
                      <span className="font-medium text-gray-950">3.2 days</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Top blocker:</span>
                      <span className="font-medium text-gray-950">Sarah Mitchell (8)</span>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded transition-colors group-hover:bg-purple-200">
                    <Send className="h-3 w-3" />
                    Send Digest
                  </button>
                </div>

                {/* Vendors */}
                <div
                  className="relative bg-white rounded-lg px-3 py-3 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-950">Vendors</p>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-sm font-medium text-gray-950 bg-gray-100 rounded">12</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Median wait:</span>
                      <span className="font-medium text-gray-950">5.1 days</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Top blocker:</span>
                      <span className="font-medium text-gray-950">Acme Corp Ltd (4)</span>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded transition-colors group-hover:bg-purple-200">
                    <Send className="h-3 w-3" />
                    Chase Response
                  </button>
                </div>

                {/* Receiving */}
                <div
                  className="relative bg-white rounded-lg px-3 py-3 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-950">Receiving</p>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-sm font-medium text-gray-950 bg-gray-100 rounded">18</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Median wait:</span>
                      <span className="font-medium text-gray-950">2.8 days</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Top blocker:</span>
                      <span className="font-medium text-gray-950">Goods In Team (7)</span>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded transition-colors group-hover:bg-purple-200">
                    <Send className="h-3 w-3" />
                    Request GR
                  </button>
                </div>

                {/* AP Internal */}
                <div
                  className="relative bg-white rounded-lg px-3 py-3 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  tabIndex={0}
                  role="button"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-semibold text-gray-950">AP Internal</p>
                    </div>
                    <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-sm font-medium text-gray-950 bg-gray-100 rounded">9</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Median wait:</span>
                      <span className="font-medium text-gray-950">1.5 days</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">Top blocker:</span>
                      <span className="font-medium text-gray-950">Data Entry (5)</span>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded transition-colors group-hover:bg-purple-200">
                    <Send className="h-3 w-3" />
                    Reassign Tasks
                  </button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Aging Analysis */}
      <div className="mb-6">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-950">Invoice Aging Analysis</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Total Outstanding</p>
                <p className="text-sm font-bold text-gray-950">£349,690</p>
              </div>
            </div>

            {/* Custom Aging Bar Chart */}
            <div className="space-y-3">
              {[
                  {
                    name: '30+ days',
                    value: 23442,
                    count: 12,
                    percentage: 7,
                    color: '#ef4444', // red-500
                    status: 'Critical',
                    action: 'Escalate immediately',
                    avgDaysOverdue: 45,
                    topVendor: 'TechCorp Ltd'
                  },
                  {
                    name: '15-30 days',
                    value: 45670,
                    count: 18,
                    percentage: 13,
                    color: '#f97316', // orange-500
                    status: 'High Priority',
                    action: 'Chase for payment',
                    avgDaysOverdue: 22,
                    topVendor: 'BuildCo'
                  },
                  {
                    name: '8-14 days',
                    value: 67890,
                    count: 28,
                    percentage: 19,
                    color: '#f59e0b', // amber-500
                    status: 'Medium Priority',
                    action: 'Send reminder',
                    avgDaysOverdue: 11,
                    topVendor: 'SupplyCo'
                  },
                  {
                    name: '4-7 days',
                    value: 89230,
                    count: 32,
                    percentage: 26,
                    color: '#10b981', // emerald-500
                    status: 'Normal',
                    action: 'Monitor',
                    avgDaysOverdue: 5,
                    topVendor: 'GlobalParts'
                  },
                  {
                    name: 'Current (0-3d)',
                    value: 123458,
                    count: 45,
                    percentage: 35,
                    color: '#22c55e', // green-500
                    status: 'On Track',
                    action: 'Standard processing',
                    avgDaysOverdue: 0,
                    topVendor: 'Acme Corp'
                  }
                ].map((bucket, index) => (
                  <div
                    key={index}
                    className="group cursor-pointer relative"
                    onClick={() => console.log(`View ${bucket.name} invoices`)}
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
                              width: `${(bucket.value / 150000) * 100}%`,
                              backgroundColor: bucket.color
                            }}
                          >
                            <span className="text-xs font-medium text-white">
                              £{(bucket.value / 1000).toFixed(0)}k
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 text-xs text-gray-600 text-right group-hover:text-gray-900 transition-colors">
                        {bucket.count} inv
                      </div>
                    </div>

                    {/* Tooltip */}
                    {hoveredAgingIndex === index && (
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

            {/* Action Links */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-4 text-xs">
                <button
                  className="text-red-600 hover:text-red-700 font-medium"
                  onClick={() => console.log('View overdue')}
                >
                  12 critical overdue →
                </button>
                <button
                  className="text-orange-600 hover:text-orange-700 font-medium"
                  onClick={() => console.log('View aging report')}
                >
                  View aging report →
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">Avg. payment time:</span>
                <span className="font-semibold text-gray-950">8.3 days</span>
                <span className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                  "bg-green-50 text-green-700"
                )}>
                  <TrendingDown className="h-2.5 w-2.5" />
                  -2 days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Smart Opportunities Section - Full Width */}
      <div className="mb-6">
        <Card className="border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-purple-900" />
              <h2 className="text-base font-semibold text-gray-950">Smart Opportunities</h2>
            </div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* Auto-code 18 invoices */}
              <button
                className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                onClick={() => {}}
                tabIndex={0}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Auto-code 18 invoices</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      Review & Apply
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-950">£45,600</p>
                  <p className="text-xs text-gray-600">ML confidence: 92%</p>
                </div>
              </button>

              {/* GR posted for 14 invoices */}
              <button
                className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                onClick={() => {}}
                tabIndex={0}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">GR posted for 14 invoices</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      Auto-match
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-950">£32,100</p>
                  <p className="text-xs text-gray-600">Ready for auto-match</p>
                </div>
              </button>

              {/* Recurring price variance */}
              <button
                className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                onClick={() => {}}
                tabIndex={0}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Recurring price variance</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      Propose Rule
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-950">£12,500</p>
                  <p className="text-xs text-gray-600">3-4% over 6 months with Tech Solutions UK</p>
                </div>
              </button>

              {/* Early Payment Discount Capture */}
              <button
                className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                onClick={() => {}}
                tabIndex={0}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Capture £8,900 in discounts</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      Schedule Payment Run
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-950">£8,900</p>
                  <p className="text-xs text-gray-600">12 invoices eligible for 2% discount if paid by Friday</p>
                </div>
              </button>

              {/* Statement Reconciliation Alert */}
              <button
                className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 hover:bg-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                onClick={() => {}}
                tabIndex={0}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">5 vendor statements ready</p>
                    </div>
                    <span className="flex items-center gap-0.5 text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                      Start Reconciliation
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-950">£234,000</p>
                  <p className="text-xs text-gray-600">£234k unmatched across 47 line items</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
        </>
      )}

      {/* Kanban View */}
      {activeView === 'kanban' && (
        <KanbanBoard />
      )}

      {/* Lightning View */}
      {activeView === 'lightning' && (
        <LightningActions />
      )}
    </div>
  )
}