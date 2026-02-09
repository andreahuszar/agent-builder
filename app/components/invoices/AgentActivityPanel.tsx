"use client"

import { Card } from "@/app/components/ui/card"
import { Bot, Info, AlertTriangle, AlertCircle, Zap, CheckCircle } from "lucide-react"
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

interface AgentCorrection {
  field: string
  original_value: string
  corrected_value: string
  reason: string
  agent_name: string
  agent_id: string
  timestamp: string
  confidence?: number
  source_field?: string
  is_extraction?: boolean
}

interface AgentActivity {
  type: 'insight' | 'correction'
  agent_name: string
  agent_id: string
  timestamp: string
  data: AgentInsight | AgentCorrection
}

interface AgentActivityPanelProps {
  insights?: AgentInsight[]
  corrections?: AgentCorrection[]
  className?: string
}

export function AgentActivityPanel({ insights = [], corrections = [], className = "" }: AgentActivityPanelProps) {
  // Helper function to safely format timestamps
  const formatTimestamp = (timestamp: string | undefined): string | null => {
    if (!timestamp) return null
    try {
      const date = new Date(timestamp)
      if (isNaN(date.getTime())) return null
      return formatDistanceToNow(date, { addSuffix: true })
    } catch {
      return null
    }
  }

  // Combine insights and corrections into unified activity list
  const activities: AgentActivity[] = [
    ...insights.map(insight => ({
      type: 'insight' as const,
      agent_name: insight.agent_name,
      agent_id: insight.agent_id,
      timestamp: insight.timestamp,
      data: insight
    })),
    ...corrections.map(correction => ({
      type: 'correction' as const,
      agent_name: correction.agent_name,
      agent_id: correction.agent_id,
      timestamp: correction.timestamp,
      data: correction
    }))
  ]

  if (activities.length === 0) {
    return null
  }

  // Group activities by agent
  const activitiesByAgent = activities.reduce((acc, activity) => {
    if (!acc[activity.agent_name]) {
      acc[activity.agent_name] = []
    }
    acc[activity.agent_name].push(activity)
    return acc
  }, {} as Record<string, AgentActivity[]>)

  // Sort each agent's activities by timestamp (most recent first)
  Object.keys(activitiesByAgent).forEach(agentName => {
    activitiesByAgent[agentName].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
      return timeB - timeA
    })
  })

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

  const getCorrectionIcon = (correction: AgentCorrection) => {
    if (correction.is_extraction) {
      return <Zap className="w-4 h-4 text-purple-600" fill="currentColor" />
    }
    return <CheckCircle className="w-4 h-4 text-purple-600" />
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

  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const totalActions = activities.length

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-gray-950">Agent Activity</h3>
        <span className="text-xs text-muted-foreground">
          ({totalActions} action{totalActions !== 1 ? 's' : ''})
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(activitiesByAgent).map(([agentName, agentActivities]) => (
          <div key={agentName} className="space-y-2">
            {/* Agent name header */}
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-950">{agentName}</span>
              <span className="text-xs text-muted-foreground">
                ({agentActivities.length})
              </span>
            </div>

            {/* Activities for this agent */}
            {agentActivities.map((activity, idx) => {
              if (activity.type === 'insight') {
                const insight = activity.data as AgentInsight
                return (
                  <div
                    key={`${activity.agent_id}-insight-${idx}`}
                    className={`p-3 rounded-lg border ${getSeverityBg(insight.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      {getSeverityIcon(insight.severity)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${getSeverityText(insight.severity)}`}>
                          {insight.message}
                        </p>
                        
                        {/* Timestamp */}
                        {formatTimestamp(insight.timestamp) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimestamp(insight.timestamp)}
                          </p>
                        )}

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
                )
              } else {
                const correction = activity.data as AgentCorrection
                return (
                  <div
                    key={`${activity.agent_id}-correction-${idx}`}
                    className="p-3 rounded-lg border bg-purple-50 border-purple-200"
                  >
                    <div className="flex items-start gap-2">
                      {getCorrectionIcon(correction)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-purple-900">
                          {correction.is_extraction ? 'Auto-extracted' : 'Auto-corrected'} {formatFieldName(correction.field)}
                        </p>
                        
                        {/* Value display */}
                        <div className="mt-2 space-y-1">
                          {correction.is_extraction ? (
                            <div className="text-xs">
                              <span className="font-medium text-gray-700">Value: </span>
                              <span className="text-gray-950 font-mono">{correction.corrected_value}</span>
                            </div>
                          ) : (
                            <div className="text-xs space-y-0.5">
                              {correction.original_value && (
                                <div>
                                  <span className="font-medium text-gray-700">Original: </span>
                                  <span className="text-gray-950 font-mono line-through">{correction.original_value}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-medium text-gray-700">Corrected: </span>
                                <span className="text-gray-950 font-mono">{correction.corrected_value}</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Confidence score if available */}
                          {correction.confidence !== undefined && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-700">Confidence: </span>
                              <span className="text-gray-950">{Math.round(correction.confidence * 100)}%</span>
                            </div>
                          )}
                          
                          {/* Source field if available */}
                          {correction.source_field && (
                            <div className="text-xs">
                              <span className="font-medium text-gray-700">Source: </span>
                              <span className="text-gray-950">{correction.source_field}</span>
                            </div>
                          )}
                          
                          {/* Reason */}
                          {correction.reason && (
                            <div className="text-xs mt-2 text-gray-700 italic">
                              {correction.reason}
                            </div>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        {formatTimestamp(correction.timestamp) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTimestamp(correction.timestamp)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        ))}
      </div>

      {/* Empty state shouldn't render but just in case */}
      {activities.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No agent activity recorded for this invoice
        </p>
      )}
    </Card>
  )
}
