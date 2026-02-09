"use client"

import { Card } from "@/app/components/ui/card"
import { Bot, Info, AlertTriangle, AlertCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface AgentInsight {
  type: 'observation' | 'warning' | 'error'
  agent_name: string
  agent_id: string
  message: string
  severity: 'info' | 'warning' | 'error'
  timestamp: string
  details?: Record<string, any>
}

interface AgentInsightsPanelProps {
  insights: AgentInsight[]
  className?: string
}

export function AgentInsightsPanel({ insights, className = "" }: AgentInsightsPanelProps) {
  if (!insights || insights.length === 0) {
    return null
  }

  // Group insights by agent
  const insightsByAgent = insights.reduce((acc, insight) => {
    if (!acc[insight.agent_name]) {
      acc[insight.agent_name] = []
    }
    acc[insight.agent_name].push(insight)
    return acc
  }, {} as Record<string, AgentInsight[]>)

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />
      default:
        return <Info className="w-4 h-4 text-blue-600" />
    }
  }

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-900'
      case 'warning':
        return 'text-amber-900'
      default:
        return 'text-blue-900'
    }
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-gray-950">Agent Insights</h3>
        <span className="text-xs text-muted-foreground">
          ({insights.length} observation{insights.length !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(insightsByAgent).map(([agentName, agentInsights]) => (
          <div key={agentName} className="space-y-2">
            {/* Agent name header */}
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-950">{agentName}</span>
            </div>

            {/* Insights for this agent */}
            {agentInsights.map((insight, idx) => (
              <div
                key={`${insight.agent_id}-${idx}`}
                className={`p-3 rounded-lg border ${getSeverityBg(insight.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getSeverityIcon(insight.severity)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${getSeverityText(insight.severity)}`}>
                      {insight.message}
                    </p>
                    
                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(insight.timestamp), { addSuffix: true })}
                    </p>

                    {/* Additional details if present */}
                    {insight.details && (
                      <div className="mt-2 space-y-1">
                        {insight.details.flaggedIssues && insight.details.flaggedIssues.length > 0 && (
                          <div className="text-xs">
                            <span className="font-medium">Flagged issues:</span>
                            <ul className="list-disc list-inside ml-2 mt-0.5">
                              {insight.details.flaggedIssues.map((issue: string, i: number) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {insight.details.skillsUsed && insight.details.skillsUsed.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {insight.details.skillsUsed.map((skill: string, i: number) => (
                              <span
                                key={i}
                                className="text-xs px-1.5 py-0.5 bg-white/50 rounded border border-gray-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Empty state shouldn't render but just in case */}
      {insights.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No agent insights recorded for this invoice
        </p>
      )}
    </Card>
  )
}
