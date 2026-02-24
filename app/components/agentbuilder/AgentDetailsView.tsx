"use client"

import { useState, useEffect } from "react"
import { Agent } from "./AgentBuilderPage"
import { Pencil, Clock, Trash2, Save, Check, X, AlertTriangle } from "lucide-react"
import { Button } from "@/app/components/ui/button"

interface AgentMetrics {
  evaluated: number
  actedOn: number
  referred: number
  createdDate?: string
  lastRunDate?: string | null
  avgRuntimeMs?: number
  invoicesProcessed?: number
}

interface AgentDetailsViewProps {
  agent: Agent
  onToggleActive: (agentId: string) => void
  onEdit: () => void
  onDelete: (agentId: string) => void
  onSave: () => void
  onUpdateAgent: (updatedAgent: Agent) => void
  allAgents?: Agent[]
  onOpenTest?: () => void
  agentMetrics?: AgentMetrics
}

const AVAILABLE_SKILLS = [
  "Connect to ERP",
  "Extract Text",
  "Find Purchase Orders",
  "Find Vendor Information",
  "Flag Issues",
  "Intelligent Matching",
  "Map to General Ledger",
  "Process Documents",
  "Route for Approval",
  "Run Workflows",
  "Send Messages",
  "Verify Data",
]

const STAGE_LANES: Record<string, string[]> = {
  ingestion: ["Source Intake", "File Triage", "Duplicate Detection", "Supplier Routing"],
  "data-capture": ["OCR Extraction", "Field Normalisation", "Header vs Line Split", "Currency/Tax Parsing"],
  verification: ["Confidence Scoring", "Anomaly Checks", "Supplier Master Validation", "Policy Checks"],
  matching: ["PO Match", "GRN Match", "Contract Match", "Unit Conversion", "Tolerance Application"],
  approval: ["Approver Routing", "Reminder Nudges", "Exception Pack Creation", "Escalation"],
  posting: ["Coding Suggestion", "ERP Payload Creation", "Posting Validation", "Reconciliation"]
}

const stages = [
  { id: "ingestion", name: "Invoice Import" },
  { id: "data-capture", name: "Data Capture" },
  { id: "verification", name: "Verification" },
  { id: "matching", name: "Matching" },
  { id: "approval", name: "Approval" },
  { id: "posting", name: "Posting" },
]

type ConflictType = {
  type: "rule" | "responsibility" | "field" | "status"
  severity: "high" | "medium" | "low"
  conflictingAgentId: string
  conflictingAgentName: string
  description: string
}

export function AgentDetailsView({
  agent,
  onToggleActive,
  onEdit,
  onDelete,
  onSave,
  onUpdateAgent,
  allAgents = [],
  onOpenTest,
  agentMetrics,
}: AgentDetailsViewProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(agent.name)
  const [promptView, setPromptView] = useState<"basic" | "advanced" | "flowchart">("basic")
  const [conflicts, setConflicts] = useState<ConflictType[]>([])
  const [isConflictCardDismissed, setIsConflictCardDismissed] = useState(false)

  // Reset dismiss state when agent changes
  useEffect(() => {
    setIsConflictCardDismissed(false)
  }, [agent.id])

  // Extract KEY ACTIONS from prompt with special handling for routing/approval/thresholds
  const extractKeyActions = (prompt: string) => {
    const actions: string[] = []
    
    // Extract from AGENT INSTRUCTIONS first (often most concise)
    const instructionsMatch = prompt.match(/AGENT INSTRUCTIONS?:([\s\S]*?)(?=\n\n(?:INPUTS?|STEPS?|VALIDATIONS?|[A-Z]{2,}):|\n\n-|$)/i)
    if (instructionsMatch) {
      const lines = instructionsMatch[1].split('\n').filter(line => {
        const trimmed = line.trim()
        return trimmed && trimmed.length > 10
      })
      const instructionActions = lines.map(line => line.replace(/^\d+\.\s*[-•]?\s*/, '').trim()).filter(Boolean)
      if (instructionActions.length > 0) {
        actions.push(...instructionActions)
      }
    }
    
    // If no instructions or we want more detail, extract from STEPS section
    if (actions.length === 0) {
      const stepsMatch = prompt.match(/STEPS?:([\s\S]*?)(?=\n\n(?:VALIDATIONS?|OUTPUTS?|ERROR HANDLING|[A-Z]{2,}):|\n\n-|$)/i)
      if (stepsMatch) {
        const text = stepsMatch[1]
        const lines = text.split('\n')
        
        for (const line of lines) {
          const trimmed = line.trim()
          // Main numbered steps (1. 2. 3.)
          if (/^\d+\./.test(trimmed)) {
            const action = trimmed.replace(/^\d+\.\s*[-•]?\s*/, '').trim()
            if (action) actions.push(action)
          }
          // Sub-steps with important info (a. Route, b. Apply, etc.)
          else if (/^\s*[a-z]\.\s*/i.test(trimmed)) {
            const subAction = trimmed.replace(/^\s*[a-z]\.\s*/i, '').trim()
            // Include sub-steps that mention routing, applying, setting, or notifications
            if (subAction && (/route|apply|set|send|notify|assign/i.test(subAction))) {
              actions.push(subAction)
            }
          }
        }
      }
    }
    
    // Limit to first 7 actions for summary view
    return actions.slice(0, 7)
  }

  // Extract detailed STEPS for flowchart view (more comprehensive than key actions)
  const extractFlowchartSteps = (prompt: string) => {
    const steps: string[] = []
    
    // Try to extract from STEPS section first (most detailed)
    const stepsMatch = prompt.match(/STEPS?:([\s\S]*?)(?=\n\n(?:VALIDATIONS?|OUTPUTS?|ERROR HANDLING|INPUTS?|[A-Z]{2,}):|\n\n-|$)/i)
    if (stepsMatch) {
      const text = stepsMatch[1]
      const lines = text.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        // Main numbered steps (1. 2. 3.)
        if (/^\d+\./.test(trimmed)) {
          const step = trimmed.replace(/^\d+\.\s*[-•]?\s*/, '').trim()
          if (step && step.length > 5) steps.push(step)
        }
        // Important sub-steps (a. b. c.)
        else if (/^\s*[a-z]\.\s*/i.test(trimmed) && steps.length > 0) {
          const subStep = trimmed.replace(/^\s*[a-z]\.\s*/i, '').trim()
          // Include meaningful sub-steps
          if (subStep && subStep.length > 10) {
            steps.push(`  ${subStep}`) // Indent sub-steps
          }
        }
      }
    }
    
    // Fallback to AGENT INSTRUCTIONS if no steps found
    if (steps.length === 0) {
      const instructionsMatch = prompt.match(/AGENT INSTRUCTIONS?:([\s\S]*?)(?=\n\n(?:INPUTS?|STEPS?|VALIDATIONS?|[A-Z]{2,}):|\n\n-|$)/i)
      if (instructionsMatch) {
        const lines = instructionsMatch[1].split('\n').filter(line => {
          const trimmed = line.trim()
          return trimmed && trimmed.length > 10
        })
        steps.push(...lines.map(line => line.replace(/^\d+\.\s*[-•]?\s*/, '').trim()).filter(Boolean))
      }
    }
    
    return steps
  }

  // Extract ROLE from prompt for basic view (first line only)
  const extractRole = (prompt: string) => {
    const match = prompt.match(/ROLE:\s*\n?\s*([^\n]+)/i)
    return match ? match[1].trim() : ""
  }
  
  // Extract INPUTS from prompt
  const extractInputs = (prompt: string) => {
    const match = prompt.match(/INPUTS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!match) return []
    const lines = match[1].split('\n').filter(line => line.trim())
    return lines.map(line => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
  }
  
  // Extract OUTPUTS from prompt
  const extractOutputs = (prompt: string) => {
    const match = prompt.match(/OUTPUTS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!match) return []
    const lines = match[1].split('\n').filter(line => line.trim())
    return lines.map(line => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
  }

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== agent.name) {
      onUpdateAgent({
        ...agent,
        name: editedName.trim(),
      })
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setEditedName(agent.name)
    setIsEditingName(false)
  }

  // Detect conflicts with other agents (copied from AgentBuilder.tsx)
  const detectConflicts = (): ConflictType[] => {
    if (!agent || !agent.prompt || !allAgents) return []

    const detectedConflicts: ConflictType[] = []
    const currentPromptLower = agent.prompt.toLowerCase()
    const currentStageIndex = stages.findIndex((s) => s.id === agent.stage)

    const extractVendorScope = (promptText: string): string[] => {
      const vendors: string[] = []
      const vendorPatterns = [
        /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:invoices|vendors?)/gi,
        /from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:only|exclusively)/gi,
        /(?:vendor|supplier):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      ]

      vendorPatterns.forEach((pattern) => {
        const matches = [...promptText.matchAll(pattern)]
        matches.forEach((match) => {
          if (match[1]) vendors.push(match[1].toLowerCase())
        })
      })

      return vendors
    }

    const getRuleAction = (promptText: string): "approve" | "reject" | "review" | "neutral" => {
      if (promptText.includes("auto-approve") || promptText.includes("approve all")) return "approve"
      if (
        promptText.includes("reject") ||
        promptText.includes("flag for review") ||
        promptText.includes("manual review")
      )
        return "reject"
      if (promptText.includes("require approval")) return "review"
      return "neutral"
    }

    const currentVendors = extractVendorScope(agent.prompt)
    const currentAction = getRuleAction(currentPromptLower)
    const currentIsVendorSpecific = currentVendors.length > 0

    allAgents.forEach((otherAgent) => {
      if (!otherAgent.id || otherAgent.id === agent.id || !otherAgent.prompt) return

      const otherStageIndex = stages.findIndex((s) => s.id === otherAgent.stage)
      const otherPromptLower = otherAgent.prompt.toLowerCase()

      const isSameStage = currentStageIndex === otherStageIndex
      const isEarlierStage = otherStageIndex < currentStageIndex
      const isLaterStage = otherStageIndex > currentStageIndex

      const stageDistance = Math.abs(currentStageIndex - otherStageIndex)
      if (stageDistance > 1) return

      const otherVendors = extractVendorScope(otherAgent.prompt)
      const otherAction = getRuleAction(otherPromptLower)
      const otherIsVendorSpecific = otherVendors.length > 0

      const hasVendorOverlap = currentVendors.some((v) => otherVendors.includes(v))
      const actionsConflict =
        (currentAction === "approve" && otherAction === "reject") ||
        (currentAction === "reject" && otherAction === "approve")

      if (isSameStage) {
        const currentAutoApproves =
          currentPromptLower.includes("auto-approve") || currentPromptLower.includes("approve all")
        const currentRequiresReview =
          currentPromptLower.includes("flag for review") ||
          currentPromptLower.includes("manual review") ||
          currentPromptLower.includes("require approval") ||
          currentPromptLower.includes("reject")
        const otherAutoApproves = otherPromptLower.includes("auto-approve") || otherPromptLower.includes("approve all")
        const otherRequiresReview =
          otherPromptLower.includes("flag for review") ||
          otherPromptLower.includes("manual review") ||
          otherPromptLower.includes("require approval") ||
          otherPromptLower.includes("reject")

        const isGenuineRuleConflict =
          (currentAutoApproves && otherRequiresReview) || (currentRequiresReview && otherAutoApproves)

        if (isGenuineRuleConflict) {
          if (currentIsVendorSpecific && otherIsVendorSpecific) {
            if (hasVendorOverlap) {
              detectedConflicts.push({
                type: "rule",
                severity: "high",
                conflictingAgentId: otherAgent.id,
                conflictingAgentName: otherAgent.name,
                description: `Contradictory vendor-specific rules: Both agents target ${currentVendors.filter((v) => otherVendors.includes(v)).join(", ")} with conflicting actions`,
              })
            }
          } else if (!currentIsVendorSpecific && !otherIsVendorSpecific) {
            detectedConflicts.push({
              type: "rule",
              severity: "high",
              conflictingAgentId: otherAgent.id,
              conflictingAgentName: otherAgent.name,
              description: currentAutoApproves
                ? `Contradictory general rules in same stage: This agent auto-approves while "${otherAgent.name}" requires manual review`
                : `Contradictory general rules in same stage: This agent requires review while "${otherAgent.name}" auto-approves`,
            })
          }
        }

        // Detect field modification conflicts
        const fields = ["po number", "amount", "vendor", "invoice number", "date", "status"]
        fields.forEach((field) => {
          if (currentPromptLower.includes(`modify ${field}`) || currentPromptLower.includes(`change ${field}`)) {
            if (otherPromptLower.includes(`modify ${field}`) || otherPromptLower.includes(`change ${field}`)) {
              detectedConflicts.push({
                type: "field",
                severity: "medium",
                conflictingAgentId: otherAgent.id,
                conflictingAgentName: otherAgent.name,
                description: `Both agents in same stage modify "${field}" - creates ambiguity about which agent should handle this field`,
              })
            }
          }
        })

        // Detect overlapping responsibilities
        const responsibilityKeywords = ["extract", "validate", "verify", "route", "approve", "post", "process"]
        const currentResponsibilities = responsibilityKeywords.filter((kw) => currentPromptLower.includes(kw))
        const otherResponsibilities = responsibilityKeywords.filter((kw) => otherPromptLower.includes(kw))
        const overlap = currentResponsibilities.filter((r) => otherResponsibilities.includes(r))

        if (overlap.length >= 2) {
          detectedConflicts.push({
            type: "responsibility",
            severity: "medium",
            conflictingAgentId: otherAgent.id,
            conflictingAgentName: otherAgent.name,
            description: `Overlapping responsibilities in same stage: Both agents handle ${overlap.join(", ")} - may duplicate work or cause conflicts`,
          })
        }
      }

      if (isEarlierStage) {
        const currentRejects =
          currentPromptLower.includes("mark as failed") ||
          currentPromptLower.includes("reject") ||
          currentPromptLower.includes("flag for review")
        const otherApproves =
          otherPromptLower.includes("mark as passed") ||
          otherPromptLower.includes("status: pass") ||
          otherPromptLower.includes("approve")

        if (currentRejects && otherApproves) {
          detectedConflicts.push({
            type: "status",
            severity: "high",
            conflictingAgentId: otherAgent.id,
            conflictingAgentName: otherAgent.name,
            description: `Workflow reversal: This stage rejects invoices that "${otherAgent.name}" approved in earlier stage "${otherAgent.stage}"`,
          })
        }

        const fields = ["amount", "vendor", "invoice number"]
        fields.forEach((field) => {
          const currentModifies =
            currentPromptLower.includes(`modify ${field}`) || currentPromptLower.includes(`change ${field}`)
          const otherSets = otherPromptLower.includes(`extract ${field}`) || otherPromptLower.includes(`set ${field}`)

          if (currentModifies && otherSets) {
            detectedConflicts.push({
              type: "field",
              severity: "medium",
              conflictingAgentId: otherAgent.id,
              conflictingAgentName: otherAgent.name,
              description: `Workflow conflict: This stage modifies "${field}" that was set by "${otherAgent.name}" in earlier stage - consider if this is intentional`,
            })
          }
        })
      }

      if (isLaterStage) {
        const currentRejects =
          currentPromptLower.includes("mark as failed") ||
          currentPromptLower.includes("reject") ||
          currentPromptLower.includes("flag for review")
        const otherApproves =
          otherPromptLower.includes("mark as passed") ||
          otherPromptLower.includes("status: pass") ||
          otherPromptLower.includes("approve")

        if (currentRejects && otherApproves) {
          detectedConflicts.push({
            type: "status",
            severity: "high",
            conflictingAgentId: otherAgent.id,
            conflictingAgentName: otherAgent.name,
            description: `Workflow reversal: This stage rejects invoices that "${otherAgent.name}" approves in later stage "${otherAgent.stage}"`,
          })
        }

        const fields = ["amount", "vendor", "invoice number"]
        fields.forEach((field) => {
          const currentModifies =
            currentPromptLower.includes(`modify ${field}`) || currentPromptLower.includes(`change ${field}`)
          const otherSets = otherPromptLower.includes(`extract ${field}`) || otherPromptLower.includes(`set ${field}`)

          if (currentModifies && otherSets) {
            detectedConflicts.push({
              type: "field",
              severity: "medium",
              conflictingAgentId: otherAgent.id,
              conflictingAgentName: otherAgent.name,
              description: `Workflow conflict: This stage modifies "${field}" that will be set by "${otherAgent.name}" in later stage - consider workflow order`,
            })
          }
        })
      }

      if (isSameStage && agent.mode && otherAgent.mode) {
        if (agent.mode === "auto-apply" && otherAgent.mode === "observe") {
          detectedConflicts.push({
            type: "rule",
            severity: "low",
            conflictingAgentId: otherAgent.id,
            conflictingAgentName: otherAgent.name,
            description: `Mode mismatch in same stage: This agent auto-applies changes while "${otherAgent.name}" only observes - may cause inconsistent behavior`,
          })
        }
      }
    })

    return detectedConflicts
  }

  // Run conflict detection when agent or allAgents changes
  useEffect(() => {
    if (agent && agent.prompt) {
      const detected = detectConflicts()
      setConflicts(detected)
    }
  }, [agent?.id, agent?.prompt, agent?.stage, allAgents])

  const keyActions = extractKeyActions(agent.prompt || '')
  const flowchartSteps = extractFlowchartSteps(agent.prompt || '')

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => {
                    setEditedName(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  className="text-xl font-semibold text-gray-950 border border-purple-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-gray-950">{agent.name}</h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </button>
                {conflicts.length > 0 && isConflictCardDismissed && (
                  <button
                    onClick={() => setIsConflictCardDismissed(false)}
                    className="p-1.5 hover:bg-amber-100 rounded transition-colors"
                    title={`View ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}`}
                  >
                    <div className="relative">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {conflicts.length}
                      </span>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Active</span>
            <button
              onClick={() => onToggleActive(agent.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                agent.active ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  agent.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Conflict Warning */}
        {conflicts.length > 0 && !isConflictCardDismissed && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-amber-900">
                    Potential Conflicts Detected ({conflicts.length})
                  </h4>
                  <p className="text-xs text-amber-700 mt-1">
                    This agent may conflict with other agents in your workflow. Review before deploying.
                  </p>
                </div>
                <button
                  onClick={() => setIsConflictCardDismissed(true)}
                  className="p-1 hover:bg-gray-100 rounded transition-colors shrink-0"
                  title="Dismiss"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              <div className="space-y-2">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      conflict.severity === "high"
                        ? "bg-red-50 border-red-200"
                        : conflict.severity === "medium"
                          ? "bg-amber-50 border-amber-200"
                          : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {conflict.severity === "high" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded shrink-0 bg-red-600 text-white">
                          {conflict.severity.toUpperCase()}
                        </span>
                      )}
                      {conflict.severity === "medium" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded shrink-0 bg-amber-500 text-white">
                          {conflict.severity.toUpperCase()}
                        </span>
                      )}
                      {conflict.severity === "low" && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded shrink-0 bg-blue-600 text-white">
                          {conflict.severity.toUpperCase()}
                        </span>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-950 mb-1 capitalize">
                          {conflict.type} conflict with "{conflict.conflictingAgentName}"
                        </p>
                        <p className="text-xs text-gray-700">{conflict.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Deployment Info */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-950 mb-4">Deployment info</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Mode</label>
              <select 
                value={agent.mode || "auto-apply"} 
                onChange={(e) => onUpdateAgent({ ...agent, mode: e.target.value as 'observe' | 'suggest' | 'auto-apply' })}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3cpath%20d%3D%22M7%207l3-3%203%203m0%206l-3%203-3-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[center_right_0.5rem] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="observe">Observe</option>
                <option value="suggest">Suggest</option>
                <option value="auto-apply">Auto-apply</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Stage</label>
              <select 
                value={agent.stage || ""} 
                onChange={(e) => onUpdateAgent({ ...agent, stage: e.target.value, lane: '' })}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3cpath%20d%3D%22M7%207l3-3%203%203m0%206l-3%203-3-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[center_right_0.5rem] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select stage</option>
                <option value="ingestion">Invoice Import</option>
                <option value="data-capture">Data capture</option>
                <option value="verification">Verification</option>
                <option value="matching">Matching</option>
                <option value="approval">Approval</option>
                <option value="posting">Posting</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Lane</label>
              <select 
                value={agent.lane || ""}
                onChange={(e) => onUpdateAgent({ ...agent, lane: e.target.value })}
                className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md bg-white appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3cpath%20d%3D%22M7%207l3-3%203%203m0%206l-3%203-3-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[center_right_0.5rem] bg-no-repeat focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select a lane</option>
                {agent.stage && STAGE_LANES[agent.stage] ? (
                  STAGE_LANES[agent.stage].map((laneOption) => (
                    <option key={laneOption} value={laneOption}>
                      {laneOption}
                    </option>
                  ))
                ) : (
                  <option disabled>No stage selected</option>
                )}
              </select>
              {!agent.stage && (
                <p className="text-xs text-gray-500 mt-1">Please select a stage first</p>
              )}
            </div>
          </div>
        </div>

        {/* Agent Details */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-950">Agent details</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setPromptView("basic")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  promptView === "basic" 
                    ? "bg-purple-100 border-purple-200 text-purple-900" 
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Basic
              </button>
              <button 
                onClick={() => setPromptView("advanced")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  promptView === "advanced" 
                    ? "bg-purple-100 border-purple-200 text-purple-900" 
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Advanced
              </button>
              <button 
                onClick={() => setPromptView("flowchart")}
                className={`px-4 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                  promptView === "flowchart" 
                    ? "bg-purple-100 border-purple-200 text-purple-900" 
                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Flowchart
              </button>
            </div>
          </div>

          {/* Basic View */}
          {promptView === "basic" && (
            <>
              {/* Role */}
              {extractRole(agent.prompt || "") && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">ROLE:</h3>
                  <p className="text-sm text-gray-700">{extractRole(agent.prompt || "")}</p>
                </div>
              )}

              {/* Key Actions */}
              {keyActions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">KEY ACTIONS:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {keyActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {/* Advanced View */}
          {promptView === "advanced" && (
            <>
              {/* Full Prompt */}
              <div className="mb-6">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {agent.prompt || "No prompt configured"}
                </div>
              </div>

              {/* Required Agent Skills */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase">Required agent skills</h3>
                  <span className="text-xs text-gray-500">
                    {agent.skills?.length || 0} of {AVAILABLE_SKILLS.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => {
                    const isSelected = agent.skills?.includes(skill)
                    return (
                      <div
                        key={skill}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-purple-50 border-purple-600 text-purple-700 font-medium'
                            : 'bg-white border-gray-300 text-gray-700'
                        }`}
                      >
                        {isSelected && (
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                        {skill}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Referenced Files */}
              {agent.documents && agent.documents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">REFERENCED FILES:</h3>
                  <div className="space-y-2">
                    {agent.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="font-mono">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Flowchart View */}
          {promptView === "flowchart" && (
            <div className="py-4">
              {/* Agent Role/Purpose */}
              {extractRole(agent.prompt || "") && (
                <div className="flex flex-col items-center mb-6">
                  <div className="w-full max-w-2xl px-6 py-4 bg-purple-50 border-2 border-purple-400 rounded-xl text-center">
                    <div className="text-xs font-semibold text-purple-600 mb-2 uppercase tracking-wide">Agent Purpose</div>
                    <div className="text-base font-medium text-gray-950">{extractRole(agent.prompt || "")}</div>
                  </div>
                </div>
              )}

              {/* Process Steps */}
              {flowchartSteps.length > 0 && (
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <div className="inline-block px-4 py-1 bg-gray-100 rounded-full">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Process Flow</span>
                    </div>
                  </div>
                  
                  {(() => {
                    let stepNumber = 1
                    return flowchartSteps.map((step, index) => {
                      const isSubStep = step.startsWith('  ')
                      const displayStep = step.trim()
                      const currentStepNumber = isSubStep ? null : stepNumber++
                      
                      return (
                        <div key={index} className="flex flex-col items-center">
                          <div className={`w-full ${isSubStep ? 'max-w-xl ml-12' : 'max-w-2xl'} px-5 py-4 ${
                            isSubStep 
                              ? 'bg-purple-50 border-2 border-purple-200' 
                              : 'bg-white border-2 border-gray-300'
                          } rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex items-start gap-3">
                              {!isSubStep && (
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white text-sm font-bold shrink-0">
                                  {currentStepNumber}
                                </div>
                              )}
                              {isSubStep && (
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-300 text-purple-900 text-xs font-bold shrink-0">
                                  →
                                </div>
                              )}
                              <div className={`flex-1 text-sm ${isSubStep ? 'text-purple-900' : 'text-gray-950'} pt-0.5`}>
                                {displayStep}
                              </div>
                            </div>
                          </div>
                          {index < flowchartSteps.length - 1 && (
                            <div className="flex items-center justify-center py-2">
                              <div className="w-0.5 h-6 bg-gray-300"></div>
                              <div className="absolute">
                                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a1 1 0 01-.707-.293l-4-4a1 1 0 011.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 1.414l-4 4A1 1 0 0110 18z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              )}

              {/* Completion indicator */}
              <div className="flex justify-center mt-6">
                <div className="px-6 py-2 bg-green-50 border-2 border-green-400 rounded-full">
                  <span className="text-sm font-semibold text-green-700">✓ Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* Test Agent Banner */}
          {onOpenTest && (
            <div className="bg-gradient-to-r from-purple-100 to-purple-200 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-300/40 flex items-center justify-center">
                    <span className="text-purple-700 text-lg">🧪</span>
                  </div>
                  <span className="text-purple-900 text-sm font-medium">Test agent against Historical invoice data?</span>
                </div>
                <button
                  onClick={onOpenTest}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <span>🔬</span>
                  Test agent
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-950 mb-4">Performance metrics</h2>
          {agentMetrics ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Invoices evaluated</div>
                <div className="text-2xl font-bold text-gray-950">
                  {new Intl.NumberFormat("en-US").format(agentMetrics.evaluated)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Acted on</div>
                <div className="text-2xl font-bold text-gray-950">
                  {new Intl.NumberFormat("en-US").format(agentMetrics.actedOn)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Referred to team</div>
                <div className="text-2xl font-bold text-gray-950">
                  {new Intl.NumberFormat("en-US").format(agentMetrics.referred)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Stats will be shown once agent has been live for 24 hours</span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Sticky Footer with Action Buttons */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-end gap-4">
          <button
            onClick={() => onDelete(agent.id)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete agent
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
          >
            <Save className="h-4 w-4" />
            Save agent
          </button>
        </div>
      </div>
    </div>
  )
}
