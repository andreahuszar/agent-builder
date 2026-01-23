"use client"

import { useEffect, useState } from "react"
import { 
  Bot, Users, FileText, AlertTriangle, TrendingUp, Clock, DollarSign, 
  Activity, Zap, BarChart3, PieChart as PieChartIcon, RefreshCw 
} from "lucide-react"
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { generateExecutiveDashboardData, ExecutiveDashboardData } from './executive-dashboard-data'

// Color palette for charts
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

const STAGE_COLORS = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.info,
  COLORS.purple,
  COLORS.teal,
]

export default function ExecutiveDashboardClient() {
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState("30")

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      const days = parseInt(dateRange) || 30
      
      // Get real agent count from localStorage
      let activeAgentsCount = 8 // fallback default
      if (typeof window !== 'undefined') {
        const storedAgents = localStorage.getItem('agents')
        if (storedAgents) {
          try {
            const agents = JSON.parse(storedAgents)
            activeAgentsCount = agents.filter((agent: any) => agent.active).length
          } catch (e) {
            console.error('Failed to parse stored agents:', e)
          }
        }
      }
      
      const dashboardData = generateExecutiveDashboardData(days, activeAgentsCount)
      setData(dashboardData)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      // #region agent log
      if (typeof window !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExecutiveDashboardClient.tsx:50',message:'Error loading dashboard data',data:{error:err instanceof Error ? err.message : String(err),stack:err instanceof Error ? err.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      }
      // #endregion
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

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

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading executive dashboard...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ExecutiveDashboardClient.tsx:95',message:'No data available',data:{loading,hasData:!!data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    }
    // #endregion
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    )
  }

  const { kpis } = data

  return (
    <div className="w-full p-4 sm:px-6 lg:px-8 bg-background">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-950">Executive AI Productivity Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive view of AI agent performance and business impact
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.activeAgents)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Agents currently processing invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices Impacted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.invoicesImpacted)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique invoices processed by agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.agentErrors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.agentsRequiringReview} agents requiring review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(kpis.agentWorkPercentage)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(kpis.humanWorkPercentage)} human work
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Runtime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.agentRuntimeHours)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total hours agents have been running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">FTE Savings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.fteSavings.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Equivalent full-time employees saved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dollar Amount Processed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.dollarAmountProcessed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total invoice value processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacity Added</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpis.capacityAddedHours)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Additional capacity hours generated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Agent Activity by Workflow Stage - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Agent Activity by Workflow Stage
            </CardTitle>
            <CardDescription>Distribution of agent activity across workflow stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.agentActivityByStage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.agentActivityByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {data.agentActivityByStage.map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{stage.stage}:</span>
                  <span className="font-medium">{formatNumber(stage.invoicesProcessed)} invoices</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Human vs Agent Work Utilization - Stacked Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Human vs Agent Work Utilization
            </CardTitle>
            <CardDescription>Daily breakdown of work distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.humanVsAgentWork.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Bar dataKey="agentWork" stackId="a" fill={COLORS.success} name="Agent Work" />
                <Bar dataKey="humanWork" stackId="a" fill={COLORS.warning} name="Human Work" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* FTE Savings and Invoice Volume */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* FTE Savings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              FTE Savings Over Time
            </CardTitle>
            <CardDescription>Before vs after implementation comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.fteSavingsOverTime.slice(-30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => `${value.toFixed(1)} FTE`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="fteSavings" 
                  stroke={COLORS.success} 
                  strokeWidth={2}
                  name="FTE Savings"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="beforeImplementation" 
                  stroke={COLORS.danger} 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="Before (Days)"
                />
                <Line 
                  type="monotone" 
                  dataKey="afterImplementation" 
                  stroke={COLORS.info} 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="After (Days)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Invoice Processing Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Invoice Processing Volume
            </CardTitle>
            <CardDescription>Dollar amount of invoices processed over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.invoiceProcessingVolume.slice(-30)}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke={COLORS.primary} 
                  fillOpacity={1} 
                  fill="url(#colorAmount)"
                  name="Amount Processed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Time Improvement */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Cycle Time Improvement by Stage
          </CardTitle>
          <CardDescription>Processing time reduction before vs after implementation</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data.cycleTimeImprovement} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={120} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(1)} days`}
              />
              <Legend />
              <Bar dataKey="beforeDays" fill={COLORS.danger} name="Before Implementation" />
              <Bar dataKey="afterDays" fill={COLORS.success} name="After Implementation" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.cycleTimeImprovement.map((stage) => (
              <div key={stage.stage} className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium text-gray-950">{stage.stage}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Improvement: <span className="font-semibold text-success">{stage.improvementPercent.toFixed(1)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {stage.beforeDays} days → {stage.afterDays} days
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
