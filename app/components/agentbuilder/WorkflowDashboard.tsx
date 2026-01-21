"use client"

import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Calendar, TrendingUp, TrendingDown } from "lucide-react"

type DashboardMetrics = {
  linesEvaluated: number
  linesActedOn: number
  linesReferredToHITL: number
  timeSavedHours: number
  totalLines: number
}

type DateRange = "7days" | "30days" | "3months"

type WorkflowDashboardProps = {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function WorkflowDashboard({ dateRange, onDateRangeChange }: WorkflowDashboardProps) {
  // Generate mock data based on date range
  const getMetricsForRange = (range: DateRange): DashboardMetrics => {
    const baseMultiplier = range === "7days" ? 1 : range === "30days" ? 4.3 : 13
    return {
      linesEvaluated: Math.floor(15420 * baseMultiplier),
      linesActedOn: Math.floor(12336 * baseMultiplier),
      linesReferredToHITL: Math.floor(3084 * baseMultiplier),
      timeSavedHours: Math.floor(257 * baseMultiplier),
      totalLines: Math.floor(15420 * baseMultiplier),
    }
  }

  const metrics = getMetricsForRange(dateRange)

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(Math.floor(num))
  }

  const getPercentage = (value: number) => {
    return ((value / metrics.totalLines) * 100).toFixed(1)
  }

  const getTrendPercentage = (metricType: string) => {
    // Simulate trend data - in production this would compare to previous period
    const trends: Record<DateRange, Record<string, number>> = {
      "7days": { evaluated: 8.2, actedOn: 12.5, hitl: -3.1, timeSaved: 15.8 },
      "30days": { evaluated: 5.7, actedOn: 9.3, hitl: -1.8, timeSaved: 11.2 },
      "3months": { evaluated: 3.4, actedOn: 6.1, hitl: -0.5, timeSaved: 7.9 },
    }
    return trends[dateRange][metricType] || 0
  }

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0
    const Icon = isPositive ? TrendingUp : TrendingDown
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    )
  }

  const dateRangeLabels = {
    "7days": "Last 7 Days",
    "30days": "Last 30 Days",
    "3months": "Last 3 Months",
  }

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invoice processing workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor agent performance and efficiency</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(["7days", "30days", "3months"] as DateRange[]).map((range) => (
              <Button
                key={range}
                variant={dateRange === range ? "default" : "ghost"}
                size="sm"
                onClick={() => onDateRangeChange(range)}
                className="text-xs"
              >
                {dateRangeLabels[range]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lines Evaluated */}
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Lines Evaluated by Agents</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatNumber(metrics.linesEvaluated)}</p>
              <span className="text-xs text-muted-foreground">{getPercentage(metrics.linesEvaluated)}%</span>
            </div>
            <div className="mt-2">
              <TrendIndicator value={getTrendPercentage("evaluated")} />
            </div>
          </div>
        </Card>

        {/* Lines Acted On */}
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Lines Acted On by Agents</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatNumber(metrics.linesActedOn)}</p>
              <span className="text-xs text-muted-foreground">{getPercentage(metrics.linesActedOn)}%</span>
            </div>
            <div className="mt-2">
              <TrendIndicator value={getTrendPercentage("actedOn")} />
            </div>
          </div>
        </Card>

        {/* Lines Referred to HITL */}
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Lines Referred to HITL</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatNumber(metrics.linesReferredToHITL)}</p>
              <span className="text-xs text-muted-foreground">{getPercentage(metrics.linesReferredToHITL)}%</span>
            </div>
            <div className="mt-2">
              <TrendIndicator value={getTrendPercentage("hitl")} />
            </div>
          </div>
        </Card>

        {/* Time Saved */}
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Time Saved (Hours)</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{formatNumber(metrics.timeSavedHours)}</p>
              <span className="text-xs text-muted-foreground">Est.</span>
            </div>
            <div className="mt-2">
              <TrendIndicator value={getTrendPercentage("timeSaved")} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
