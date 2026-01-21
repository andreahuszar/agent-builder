"use client"

import { useEffect } from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { ChatInterface } from "./ChatInterface"
import { AgentBuilder } from "./AgentBuilder"
import { WorkflowVisualizer } from "./WorkflowVisualizer"
import Navigation from "@/app/components/Navigation"
import UserMenu from "@/app/components/UserMenu"
import { Plus, Pencil, ChevronDown, ChevronRight, Power } from "lucide-react"

type Mode = "chat" | "observe" | "build"

export type Agent = {
  id: string
  name: string
  stage: string
  active: boolean
  mode?: "observe" | "suggest" | "auto-apply"
  prompt?: string
  model?: string
  tools?: string[]
}

export type AgentMetrics = {
  evaluated: number
  actedOn: number
  referred: number
}

export default function AgentBuilderPage() {
  const [mode, setMode] = useState<Mode>("observe")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Effect to auto-create new agent when switching to build mode with no agent selected
  useEffect(() => {
    if (mode === "build" && !editingAgent && !testingAgent) {
      console.log("[v0] Auto-creating new agent when entering build mode")
      handleCreateNewAgent()
    }
  }, [mode])
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Invoice Ingestion Agent",
      stage: "ingestion",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Document Reception and Initial Classification Agent - exclusively handles incoming document intake

INPUTS:
- Raw invoice documents (PDF, XLSX, CSV, email attachments)
- Document metadata (filename, sender, timestamp, file size)

STEPS:
1. Receive incoming document and validate file type (PDF, XLSX, CSV, PNG/JPG) and size (max 25MB)
2. Perform virus and malware scanning
3. Assign unique document ID and timestamp
4. Create intake audit trail entry
5. Route to Data Capture stage

VALIDATIONS:
- File size must not exceed 25MB
- File format must be supported
- Document must pass virus scan
- Document must not be corrupted or unreadable

OUTPUT:
- Document intake record with unique ID
- Routing to Data Capture stage

ERROR HANDLING:
- If file type unsupported → Reject with supported format list
- If file corrupted → Request resubmission
- If virus detected → Quarantine and alert security team`,
      model: "gpt-4",
      tools: ["Document Parser", "Virus Scanner"],
    },
    {
      id: "2",
      name: "Data Capture Agent",
      stage: "data-capture",
      active: true,
      mode: "suggest",
      prompt: `ROLE: Field Extraction and Data Population Agent - exclusively extracts text and numbers from documents

INPUTS:
- Validated documents from Ingestion stage
- OCR engine output
- Vendor-specific extraction templates

STEPS:
1. Extract invoice number, date, due date from document header
2. Extract vendor name, address, tax ID
3. Extract line items: description, quantity, unit price, amount
4. Extract totals: subtotal, tax, total amount
5. Calculate confidence score for each field
6. Flag fields with confidence < 85% for manual review

VALIDATIONS:
- Invoice number must be present
- Invoice date must be valid date format
- Total amount must match line items sum
- OCR confidence for amounts must exceed 85%

OUTPUT:
- Structured data object with extracted fields
- Confidence scores per field
- List of fields requiring manual review

ERROR HANDLING:
- If OCR confidence < 70% → Route to manual data entry
- If critical field missing → Halt and request clarification
- If total mismatch > $5 → Flag calculation error for review`,
      model: "gpt-4",
      tools: ["OCR Engine", "Data Extractor"],
    },
    {
      id: "3",
      name: "Verification Agent",
      stage: "verification",
      active: false,
      mode: "observe",
      prompt: `ROLE: Business Rules Validation Agent - exclusively validates data against business rules and master data

INPUTS:
- Extracted invoice data from Data Capture stage
- Vendor master data
- Contract pricing agreements
- Historical vendor invoices

STEPS:
1. Verify vendor exists and is active in vendor master
2. Check vendor is not on blocked list
3. Validate pricing against contract rates (±5% tolerance)
4. Check for duplicate invoice number from this vendor
5. Verify tax calculations match jurisdiction rates
6. Confirm payment terms ≤ 90 days

VALIDATIONS:
- Vendor must be active in master data
- Pricing variance must be within ±5%
- No duplicate invoice numbers
- Tax rate must match jurisdiction
- Payment terms must not exceed 90 days

OUTPUT:
- Validation status: Pass / Fail
- List of rule violations
- Risk score (0-100)

ERROR HANDLING:
- If vendor blocked → Reject with reason code
- If pricing variance > 10% → Escalate to procurement
- If duplicate found → Reject with reference to original`,
      model: "gpt-3.5",
      tools: ["Data Validator", "Vendor Lookup", "Contract Database"],
    },
    {
      id: "5",
      name: "Approval Decision Agent",
      stage: "approval",
      active: true,
      mode: "suggest",
      prompt: `ROLE: Approval Recommendation Agent - exclusively provides decision support to approvers

INPUTS:
- Invoice pending approval
- Historical approval patterns
- Supporting documentation (PO, contracts)
- Budget utilization status

STEPS:
1. Calculate risk score based on vendor history and amount
2. Compare pricing to historical invoices from this vendor
3. Check budget remaining in cost center
4. Identify any unusual patterns or red flags
5. Provide approve/reject recommendation with rationale
6. Highlight key information for approver attention

VALIDATIONS:
- Invoice matches PO line items if PO-backed
- Pricing within historical range (±15%)
- Budget has sufficient remaining funds

OUTPUT:
- Recommendation: Approve / Request Info / Reject
- Risk score with explanation
- Key decision factors highlighted
- Budget impact summary

ERROR HANDLING:
- If risk score > 70 → Recommend detailed review
- If budget insufficient → Suggest payment delay
- If pricing outlier → Flag for procurement review`,
      model: "gpt-4",
      tools: ["Risk Analyzer", "Budget Checker", "Historical Data"],
    },
    {
      id: "6",
      name: "GL Posting Agent",
      stage: "posting",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Accounting Entry Creation Agent - exclusively creates and posts journal entries to ERP

INPUTS:
- Approved invoices
- Chart of accounts
- GL mapping rules
- Cost center assignments

STEPS:
1. Map invoice line items to GL accounts
2. Split by cost center if multiple departments
3. Calculate tax postings by jurisdiction
4. Generate balanced journal entry (debit = credit)
5. Post to ERP via API
6. Obtain ERP document number
7. Update invoice status to "Posted"

VALIDATIONS:
- Posting period must be open
- GL accounts must be valid and active
- Debit and credit must balance exactly
- No duplicate postings for same invoice

OUTPUT:
- ERP posting document number
- Journal entry details
- Updated invoice status

ERROR HANDLING:
- If posting period closed → Hold until next period
- If GL account invalid → Route to accounting for correction
- If posting fails → Retry 3 times, then escalate`,
      model: "gpt-4",
      tools: ["ERP Connector", "GL Mapper", "Tax Calculator"],
    },
    {
      id: "7",
      name: "Payment Processing Agent",
      stage: "posting",
      active: false,
      mode: "observe",
      prompt: `ROLE: Payment Execution Agent - exclusively generates payment files and sends payments to vendors

INPUTS:
- Posted invoices ready for payment
- Vendor banking details
- Payment run schedule
- Available cash balance

STEPS:
1. Group invoices by payment date and vendor
2. Verify vendor banking information is current
3. Calculate payment amount with any discounts
4. Generate ACH payment file for banking system
5. Submit to treasury for execution
6. Record payment reference number
7. Send remittance advice email to vendor

VALIDATIONS:
- Payment date must be ≤ due date
- Vendor bank details verified within last 90 days
- Sufficient funds available
- No duplicate payments

OUTPUT:
- Payment file submitted to bank
- Payment confirmation numbers
- Remittance advice sent

ERROR HANDLING:
- If bank details missing → Hold and request update
- If insufficient funds → Delay payment, notify treasury
- If payment rejected by bank → Try alternative method`,
      model: "gpt-3.5",
      tools: ["Payment Gateway", "Bank Integration", "Email Sender"],
    },
  ])
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null)
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "3months">("7days")

  const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetrics>>({})

  useState(() => {
    const metrics: Record<string, AgentMetrics> = {}
    const baseMultiplier = dateRange === "7days" ? 1 : dateRange === "30days" ? 4.3 : 13

    agents.forEach((agent) => {
      // Only generate metrics for pre-loaded agents (IDs 1-7), not newly created ones
      if (agent.id && agent.id.length <= 2) {
        const baseEvaluated = Math.floor((Math.random() * 3000 + 1000) * baseMultiplier)
        const actedOnPercent = agent.mode === "auto-apply" ? 0.85 : agent.mode === "suggest" ? 0.6 : 0
        const actedOn = Math.floor(baseEvaluated * actedOnPercent)
        const referred = baseEvaluated - actedOn

        metrics[agent.id] = {
          evaluated: baseEvaluated,
          actedOn: actedOn,
          referred: referred,
        }
      }
    })

    setAgentMetrics(metrics)
  })

  const stages = [
    { id: "ingestion", name: "Ingestion" },
    { id: "data-capture", name: "Data Capture" },
    { id: "verification", name: "Verification" },
    { id: "matching", name: "Matching" },
    { id: "approval", name: "Approval" },
    { id: "posting", name: "Posting" },
  ]

  const agentsByStage = stages.map((stage) => ({
    ...stage,
    agents: agents.filter((agent) => agent.stage === stage.id),
    activeCount: agents.filter((agent) => agent.stage === stage.id && agent.active).length,
    inactiveCount: agents.filter((agent) => agent.stage === stage.id && !agent.active).length,
  }))

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stageId)) {
        newSet.delete(stageId)
      } else {
        newSet.add(stageId)
      }
      return newSet
    })
  }

  const handlePreviewAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setIsPreviewMode(true)
    setMode("build")
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setIsPreviewMode(false)
    setMode("build")
  }

  const handleSaveAgent = (updatedAgent: Agent) => {
    console.log("[v0] handleSaveAgent called with:", {
      id: updatedAgent.id,
      name: updatedAgent.name,
      stage: updatedAgent.stage,
      hasId: !!updatedAgent.id,
      idLength: updatedAgent.id?.length,
    })

    // Check if this is an existing agent by looking in the agents array
    const existingAgent = agents.find((a) => a.id === updatedAgent.id)
    console.log("[v0] Existing agent found:", !!existingAgent)

    if (updatedAgent.id && existingAgent) {
      // Update existing agent
      console.log("[v0] Updating existing agent:", updatedAgent.id, updatedAgent.name, "Stage:", updatedAgent.stage)
      setAgents((prev) => {
        const updated = prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
        console.log("[v0] Agents after update:", updated.map((a) => `${a.name} (${a.stage})`))
        return updated
      })
      setEditingAgent(updatedAgent)
    } else {
      // Create new agent
      const newAgent = {
        ...updatedAgent,
        id: updatedAgent.id || Date.now().toString(),
        active: false,
      }
      console.log("[v0] Creating new agent:", newAgent.name, "Stage:", newAgent.stage, "ID:", newAgent.id)
      setAgents((prev) => {
        const updated = [...prev, newAgent]
        console.log("[v0] Agent count after creation:", updated.length)
        console.log("[v0] All agents:", updated.map((a) => `${a.name} (${a.stage})`))
        return updated
      })
      setEditingAgent(newAgent)
      // Auto-expand the stage where the new agent was created
      if (newAgent.stage) {
        console.log("[v0] Auto-expanding stage:", newAgent.stage)
        setExpandedStages((prev) => {
          const newSet = new Set(prev)
          newSet.add(newAgent.stage)
          console.log("[v0] Expanded stages:", Array.from(newSet))
          return newSet
        })
      }
    }
    setIsPreviewMode(true)
  }

  const handleCreateNewAgent = () => {
    setEditingAgent({ id: "", name: "", stage: "", active: false, mode: "observe", prompt: "", model: "", tools: [] }) // Added mode field
    setIsPreviewMode(false)
    setMode("build")
  }

  const handleCreateAgentForStage = (stageId: string) => {
    setEditingAgent({
      id: "",
      name: "",
      stage: stageId,
      active: false,
      mode: "observe",
      prompt: "",
      model: "",
      tools: [],
    })
    setIsPreviewMode(false)
    setMode("build")
  }

  const toggleAgentActive = (agentId: string) => {
    setAgents((prev) => prev.map((a) => (a.id === agentId ? { ...a, active: !a.active } : a)))
    // If we're currently viewing this agent, update the editing agent too
    if (editingAgent?.id === agentId) {
      setEditingAgent((prev) => (prev ? { ...prev, active: !prev.active } : null))
    }
  }

  const handleTestAgent = (agent: Agent) => {
    setTestingAgent(agent)
  }

  const handleCloseTest = () => {
    setTestingAgent(null)
  }

  const handleEdit = () => {
    console.log("[v0] Edit button clicked, switching to edit mode")
    setIsPreviewMode(false)
  }

  const handlePromptGenerated = (generatedPrompt: string, tools: string[]) => {
    console.log("[v0] Prompt generated, updating agent with tools:", tools)
    if (editingAgent) {
      // Update the editing agent with the generated prompt and tools
      setEditingAgent({
        ...editingAgent,
        prompt: generatedPrompt,
        tools: tools,
      })
    }
  }

  const handleDeleteAgent = (agentId: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== agentId))
    // Clear editing agent if it's the one being deleted
    if (editingAgent?.id === agentId) {
      setEditingAgent(null)
      setIsPreviewMode(false)
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Main App Navigation Sidebar */}
      <Navigation activeModule="settings" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Matching main app styling */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur-md">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center">
              {/* Navigation Tabs */}
              <nav className="flex flex-1 justify-start" aria-label="Tabs">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setMode("observe")}
                    className={`${
                      mode === "observe"
                        ? "bg-purple-900 text-white"
                        : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                    } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                    aria-current={mode === "observe" ? "page" : undefined}
                  >
                    Workflow
                  </button>
                  <button
                    onClick={() => setMode("build")}
                    className={`${
                      mode === "build"
                        ? "bg-purple-900 text-white"
                        : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                    } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                    aria-current={mode === "build" ? "page" : undefined}
                  >
                    Agent Builder
                  </button>
                </div>
              </nav>

              {/* User Menu */}
              <div className="flex items-center">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex bg-background">
          {/* Left Panel: Agent List/Sidebar */}
          {mode === "build" && (
            <aside className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">Agents</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {agentsByStage.map((stage) => (
                    <div key={stage.id} className="rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleStage(stage.id)}
                        className="w-full flex items-center gap-2 p-2.5 hover:bg-muted/50 transition-colors rounded-lg"
                      >
                        {expandedStages.has(stage.id) ? (
                          <ChevronDown className="w-4 h-4 text-foreground/60" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-foreground/60" />
                        )}
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-foreground">{stage.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {stage.activeCount} active, {stage.inactiveCount} inactive
                          </div>
                        </div>
                      </button>

                      {expandedStages.has(stage.id) && stage.agents.length > 0 && (
                        <div className="space-y-1 mt-1 ml-2 pl-4 border-l border-border/50">
                          {stage.agents.map((agent) => (
                            <div
                              key={agent.id}
                              onClick={() => handlePreviewAgent(agent)}
                              className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted transition-colors group cursor-pointer"
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`w-7 h-7 shrink-0 ${agent.active ? "text-green-500 hover:text-green-600" : "text-muted-foreground hover:text-foreground"}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleAgentActive(agent.id)
                                }}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </Button>
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${agent.active ? "bg-green-500" : "bg-muted-foreground/40"}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{agent.name}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditAgent(agent)
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-border">
                <Button
                  variant="default"
                  className="w-full justify-start gap-2 bg-[oklch(0.38_0.15_291)] hover:bg-[oklch(0.35_0.15_291)]"
                  onClick={handleCreateNewAgent}
                >
                  <Plus className="w-4 h-4" />
                  New Agent
                </Button>
              </div>
            </aside>
          )}

          {/* Center: Main Content */}
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-hidden">
              {mode === "observe" && (
                <WorkflowVisualizer
                  agents={agents}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  onCreateAgent={handleCreateAgentForStage}
                  agentMetrics={agentMetrics}
                  onAgentClick={handlePreviewAgent}
                />
              )}
              {mode === "build" && (
                <AgentBuilder
                  agent={testingAgent || editingAgent ? {
                    ...(testingAgent || editingAgent)!,
                    model: (testingAgent || editingAgent)?.model || "gpt-4"
                  } : null}
                  onSave={handleSaveAgent}
                  isPreview={isPreviewMode}
                  onEdit={handleEdit}
                  onToggleActive={toggleAgentActive}
                  onOpenTest={() => editingAgent && handleTestAgent(editingAgent)}
                  testingAgent={!!testingAgent}
                  editingAgent={!!editingAgent}
                  showTestModal={!!testingAgent}
                  allAgents={agents}
                  onDelete={handleDeleteAgent}
                  agentMetrics={editingAgent?.id ? agentMetrics[editingAgent.id] : undefined}
                />
              )}
            </div>

            {/* Right: Chat Assistant */}
            {mode === "build" && (
              <div className="w-80 border-l border-border">
                <ChatInterface
                  onPromptGenerated={handlePromptGenerated}
                  agentId={editingAgent?.id || "new"}
                  currentAgent={editingAgent}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
