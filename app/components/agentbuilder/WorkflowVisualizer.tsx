"use client"

import { Card } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { ArrowDownIcon, CheckCircle2, Circle, AlertCircle, Plus } from "lucide-react"
import { Button } from "@/app/components/ui/button"

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
}

export function WorkflowVisualizer({
  agents,
  dateRange,
  onDateRangeChange,
  onCreateAgent,
  agentMetrics,
  onAgentClick,
}: WorkflowVisualizerProps) {
  const stages = [
    { id: "ingestion", name: "Ingestion", description: "Receive and validate invoices" },
    { id: "data-capture", name: "Data Capture", description: "Extract line items and amounts" },
    { id: "verification", name: "Verification", description: "Validate data accuracy" },
    { id: "matching", name: "Matching", description: "Match to purchase orders" },
    { id: "approval", name: "Approval", description: "Route for authorization" },
    { id: "posting", name: "Posting", description: "Post to accounting systems" },
  ]

  const getStageStatus = (stageId: string) => {
    const stageAgents = agents.filter((a) => a.stage === stageId)
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

  return (
    <div className="h-full overflow-y-auto p-6 bg-background py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold">Invoice processing workflow</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor agent performance and efficiency</p>
        </div>

        <div className="space-y-0">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.id)
            const stageAgents = agents.filter((a) => a.stage === stage.id)

            return (
              <div key={stage.id}>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">{getStatusIcon(status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{stage.name}</h3>
                        </div>
                        {onCreateAgent && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCreateAgent(stage.id)}
                            className="gap-2 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            New Agent
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">{stage.description}</p>

                      {stageAgents.length > 0 && (
                        <div className="space-y-2">
                          {stageAgents.map((agent) => {
                            const metrics = agentMetrics[agent.id]

                            return (
                              <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      agent.active ? "bg-green-500" : "bg-muted-foreground/40"
                                    }`}
                                  />
                                  <span
                                    className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => onAgentClick?.(agent)}
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
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {index < stages.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDownIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
