"use client"

import { useState } from "react"
import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { CheckCircle2, Circle, AlertCircle, Plus, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { groupAgentsByStage, normalizeStageId } from "./stageUtils"

type Agent = {
  id: string
  name: string
  stage: string
  active: boolean
  mode?: "observe" | "suggest" | "auto-apply"
}

type DateRange = "7days" | "30days" | "3months"

type WorkflowVisualizerProps = {
  agents: Agent[]
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  onCreateAgent?: (stage: string) => void
  agentMetrics: Record<string, AgentMetrics>
  onAgentClick?: (agent: Agent) => void
}

type AgentMetrics = {
  evaluated: number
  actedOn: number
  referred: number
  createdDate: string
  lastRunDate: string | null
  avgRuntimeMs: number
  invoicesProcessed: number
}

export function WorkflowVisualizer({
  agents,
  dateRange,
  onDateRangeChange,
  onCreateAgent,
  agentMetrics,
  onAgentClick,
}: WorkflowVisualizerProps) {
  // State to track which stages are expanded (Invoice Import open by default)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set()
  )

  const agentsByStage = groupAgentsByStage(agents)

  // Toggle stage expansion/collapse
  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) {
        next.delete(stageId)
      } else {
        next.add(stageId)
      }
      return next
    })
  }

  const getStageStatus = (stageId: string) => {
    const stageAgents = agents.filter((a) => normalizeStageId(a.stage) === stageId)
    if (stageAgents.length === 0) return "empty"
    if (stageAgents.some((a) => a.active)) return "active"
    return "inactive"
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "inactive":
        return <AlertCircle className="w-5 h-5 text-amber-500" />
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const formatRuntime = (ms: number) => {
    if (ms < 1000) {
      return `${ms}ms`
    }
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-background py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold">Invoice processing workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor agent performance and efficiency</p>
        </div>

        <div className="space-y-2">
          {agentsByStage.map((stage) => {
            const status = getStageStatus(stage.id)
            const stageAgents = stage.agents
            const activeCount = stage.activeCount
            const inactiveCount = stage.inactiveCount

            return (
              <div key={stage.id}>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">{getStatusIcon(status)}</div>
                    <div className="flex-1 min-w-0">
                      {/* Clickable Stage Header */}
                      <div 
                        className={`flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -m-2 p-2 rounded transition-colors ${expandedStages.has(stage.id) ? 'mb-2' : ''}`}
                        onClick={() => toggleStage(stage.id)}
                      >
                        {expandedStages.has(stage.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <h3 className="text-lg font-semibold">{stage.name}</h3>
                        {stageAgents.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {activeCount > 0 && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                {activeCount} active
                              </Badge>
                            )}
                            {inactiveCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {inactiveCount} inactive
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            0 agents
                          </Badge>
                        )}
                      </div>

                      {/* Expandable Content */}
                      {expandedStages.has(stage.id) && (
                        <>
                          {stageAgents.length > 0 && (
                            <div className="space-y-2 mb-4">
                              {stageAgents.map((agent) => {
                                const metrics = agentMetrics[agent.id]

                                return (
                                  <div key={agent.id} className="p-3 rounded-lg bg-muted space-y-3">
                                    {/* Row 1: Agent name and status badges */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`w-2 h-2 rounded-full ${
                                            agent.active ? "bg-green-500" : "bg-muted-foreground/40"
                                          }`}
                                        />
                                        <span
                                          className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            onAgentClick?.(agent)
                                          }}
                                        >
                                          {agent.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Badge variant={agent.active ? "default" : "secondary"} className="text-xs">
                                          {agent.active ? "Active" : "Inactive"}
                                        </Badge>
                                        {agent.mode && (
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${
                                              agent.mode === "observe"
                                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                                : agent.mode === "suggest"
                                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                  : "bg-red-500/10 text-red-600 border-red-500/20"
                                            }`}
                                          >
                                            {agent.mode}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Row 2: Metrics grid (only if metrics available) */}
                                    {metrics && (
                                      <div className="grid grid-cols-4 gap-3 text-xs">
                                        <div>
                                          <div className="text-muted-foreground">Created</div>
                                          <div className="font-medium">{formatDate(metrics.createdDate)}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Last Run</div>
                                          <div className="font-medium">{formatDate(metrics.lastRunDate) || "Never"}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Avg Runtime</div>
                                          <div className="font-medium">{formatRuntime(metrics.avgRuntimeMs)}</div>
                                        </div>
                                        <div>
                                          <div className="text-muted-foreground">Invoices</div>
                                          <div className="font-medium">{formatNumber(metrics.invoicesProcessed)}</div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {onCreateAgent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onCreateAgent(stage.id)
                              }}
                              className="gap-2"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              New Agent
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
