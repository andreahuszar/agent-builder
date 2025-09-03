"use client"

import { useState } from "react"
import { FileText, Clock, AlertCircle, Users, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/app/components/ui/card"

interface StatusGroup {
  id: string
  title: string
  icon: React.ReactNode
  count: number
  amount?: number
  color: string
  bgColor: string
  description?: string
  trend?: {
    value: number
    label: string
    positive: boolean
  }
  priority?: "high" | "medium" | "low"
  action?: () => void
  aiAssist?: {
    available: boolean
    suggestion: string
    action: () => void
  }
}

interface InvoiceStatusGroupsProps {
  data: {
    my_cases: { count: number; statuses: Array<any> }
    in_progress: { count: number; amount: number; statuses: Array<any> }
    pending: { count: number; amount: number; statuses: Array<any> }
    overdue: { count: number; amount: number; days_overdue_avg: number | null }
    queue: { count: number; amount: number; oldest_date: string | null }
    completed: { count: number; amount: number; statuses: Array<any> }
    issues: { count: number; amount: number; statuses: Array<any> }
  }
  loading?: boolean
  onGroupClick?: (groupId: string) => void
  formatCurrency?: (amount: number) => string
  formatNumber?: (num: number) => string
}

export default function InvoiceStatusGroups({ 
  data, 
  loading = false, 
  onGroupClick, 
  formatCurrency = (n) => `$${n.toLocaleString()}`, 
  formatNumber = (n) => n.toLocaleString() 
}: InvoiceStatusGroupsProps) {
  
  const statusGroups: StatusGroup[] = [
    {
      id: "my_cases",
      title: "My Cases",
      icon: <Users className="h-5 w-5" />,
      count: data.my_cases.count,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      description: "Assigned to you",
      trend: data.my_cases.count > 0 ? {
        value: 12,
        label: "from yesterday",
        positive: false
      } : undefined
    },
    {
      id: "in_progress",
      title: "In Progress",
      icon: <Clock className="h-5 w-5" />,
      count: data.in_progress.count,
      amount: data.in_progress.amount,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Being processed",
      trend: {
        value: 5,
        label: "from yesterday",
        positive: false
      },
    },
    {
      id: "pending",
      title: "Pending",
      icon: <FileText className="h-5 w-5" />,
      count: data.pending.count,
      amount: data.pending.amount,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      description: "Awaiting action",
      priority: data.pending.count > 20 ? "high" : "medium"
    },
    {
      id: "overdue",
      title: "Overdue",
      icon: <AlertCircle className="h-5 w-5" />,
      count: data.overdue.count,
      amount: data.overdue.amount,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: data.overdue.days_overdue_avg ? 
        `Avg ${data.overdue.days_overdue_avg} days overdue` : "Requires attention",
      priority: "high",
      trend: {
        value: 3,
        label: "from last week",
        positive: false
      }
    },
    {
      id: "issues",
      title: "Issues",
      icon: <XCircle className="h-5 w-5" />,
      count: data.issues.count,
      amount: data.issues.amount,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Escalated cases",
      priority: data.issues.count > 0 ? "high" : "low"
    }
  ]

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 w-8 bg-gray-200 rounded mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {statusGroups.map((group) => (
          <Card
            key={group.id}
            onClick={() => onGroupClick && onGroupClick(group.id)}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-lg",
              group.priority === "high" && "ring-2 ring-red-200"
            )}
          >
            <CardContent className="p-4">
              {/* Priority Badge */}
              {group.priority === "high" && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Priority
                </div>
              )}

              {/* Icon and Trend */}
              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", group.bgColor)}>
                  <div className={group.color}>{group.icon}</div>
                </div>
                {group.trend && (
                  <div className="text-xs text-right">
                    <div className={cn(
                      "font-semibold",
                      group.trend.positive ? "text-green-600" : "text-red-600"
                    )}>
                      {group.trend.positive ? "+" : ""}{group.trend.value}%
                    </div>
                    <div className="text-gray-500">{group.trend.label}</div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">{group.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(group.count)}
                </p>
                {group.amount && (
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    {formatCurrency(group.amount)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">{group.description}</p>
              </div>
              
              
              {/* Visual indicator bar at bottom */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-1 rounded-b-lg",
                group.color === "text-violet-600" && "bg-violet-500",
                group.color === "text-blue-600" && "bg-blue-500",
                group.color === "text-yellow-600" && "bg-yellow-500",
                group.color === "text-red-600" && "bg-red-500",
                group.color === "text-gray-600" && "bg-gray-500",
                group.color === "text-green-600" && "bg-green-500",
                group.color === "text-orange-600" && "bg-orange-500"
              )} />
            </CardContent>
          </Card>
      ))}
    </div>
  )
}