"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronRight, ChevronDown, Plus, X, Minimize2, Power, Pencil, Play, Loader2, TrendingDown } from "lucide-react"
import { Agent } from "./AgentBuilderPage"
import { ChatInterface, type ChatInterfaceRef } from "./ChatInterface"
import { AgentDetailsView } from "./AgentDetailsView"
import { Button } from "@/app/components/ui/button"
import { Card } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"

// Import simulation modules
import { generateTestScenarios, type ScenarioConfig, type TimePeriod, type Stage } from './testScenarioGenerator'
import { simulateBaselineProcessingBatch, type BaselineStats } from './baselineSimulator'
import { simulateAgentProcessingBatch, type AgentStats, type AgentConfig as SimAgentConfig } from './agentSimulator'
import { calculateComparisonMetrics, createInvoiceComparisons, formatMetricsForDisplay, generateExecutiveSummary, type ComparisonMetrics, type InvoiceComparison } from './comparisonMetrics'

interface AgentMetrics {
  evaluated: number
  actedOn: number
  referred: number
  createdDate?: string
  lastRunDate?: string | null
  avgRuntimeMs?: number
  invoicesProcessed?: number
}

interface AgentBuilder2Props {
  agents: Agent[]
  onCreateAgent: (stageId: string) => void
  currentAgent: Agent | null
  onAgentSelect: (agent: Agent | null) => void
  onSaveAgent: (agent: Agent) => void
  isPreviewMode: boolean
  onToggleActive: (agentId: string) => void
  onEditAgent: (agent: Agent) => void
  onDeleteAgent: (agentId: string) => void
  onOpenTest?: () => void
  testingAgent?: Agent | null
  onCloseTest?: () => void
  agentMetrics?: Record<string, AgentMetrics>
}

const WORKFLOW_STAGES = [
  { id: "ingestion", name: "Invoice Import" },
  { id: "data-capture", name: "Data Capture" },
  { id: "verification", name: "Verification" },
  { id: "matching", name: "Matching" },
  { id: "approval", name: "Approval" },
  { id: "posting", name: "Posting" },
]

export function AgentBuilder2({
  agents,
  onCreateAgent,
  currentAgent,
  onAgentSelect,
  onSaveAgent,
  isPreviewMode,
  onToggleActive,
  onEditAgent,
  onDeleteAgent,
  onOpenTest,
  testingAgent,
  onCloseTest,
  agentMetrics = {},
}: AgentBuilder2Props) {
  const [chatOpen, setChatOpen] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)
  const [leftWidth, setLeftWidth] = useState(320) // 320px = w-80
  const [rightWidth, setRightWidth] = useState(400) // 400px default chat width
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)
  const chatRef = useRef<ChatInterfaceRef>(null)
  const [detectedStage, setDetectedStage] = useState<string>("")
  const [detectedLane, setDetectedLane] = useState<string>("")

  // Testing modal state
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"7days" | "30days" | "3months" | "6months">("7days")
  const [isTesting, setIsTesting] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetrics | null>(null)
  const [invoiceComparisons, setInvoiceComparisons] = useState<InvoiceComparison[]>([])
  const [baselineStats, setBaselineStats] = useState<BaselineStats | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)
  const [withoutAgentFilter, setWithoutAgentFilter] = useState<"all" | "pass" | "blocked" | "delayed" | "error">("all")
  const [withAgentFilter, setWithAgentFilter] = useState<"all" | "auto_resolved" | "suggested_resolution" | "observed" | "escalated_to_human">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fail">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(50)

  // Auto-show details when currentAgent is loaded (e.g., from URL parameter or new agent creation)
  useEffect(() => {
    // Show details and chat for both preview mode and new agents with prompts
    if (currentAgent && currentAgent.prompt) {
      setShowDetails(true)
      setChatOpen(true) // Keep chat interface available
      
      // Also expand the stage containing this agent
      if (currentAgent.stage) {
        setExpandedStages(prev => {
          const newSet = new Set(prev)
          newSet.add(currentAgent.stage)
          return newSet
        })
      }
    }
  }, [currentAgent?.id])

  // Extract a clean agent name from the prompt
  const extractAgentName = (prompt: string): string => {
    // Try to extract from ROLE line
    const roleMatch = prompt.match(/ROLE:\s*(.+?)(?:\s*-|Agent|\n|$)/i)
    if (roleMatch) {
      let name = roleMatch[1].trim()
      // Remove common suffixes
      name = name.replace(/\s+(Agent|automation|processor|handler|service|system)$/i, '')
      // Capitalize first letter of each word
      name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      return name + ' Agent'
    }
    
    // Fallback: try to extract from first meaningful line
    const lines = prompt.split('\n').filter(l => l.trim())
    if (lines.length > 0) {
      return lines[0].substring(0, 50).trim() + ' Agent'
    }
    
    return 'New Agent'
  }

  const runBulkTest = async () => {
    if (!testingAgent) return
    
    setIsTesting(true)
    setTestProgress(0)
    setComparisonMetrics(null)
    setInvoiceComparisons([])
    setCurrentPage(1)

    // Configure scenario generation
    const scenarioConfig: ScenarioConfig = {
      scenarioTypes: ["all"],
      issueMix: 40, // Fixed 40% issue rate for realistic testing
      stage: (testingAgent.stage || 'matching') as Stage,
      lane: testingAgent.lane || "",
    }

    // Generate test scenarios
    const scenarios = generateTestScenarios(selectedTimePeriod as TimePeriod, scenarioConfig)
    
    // Configure agent for simulation
    const agentConfig: SimAgentConfig = {
      name: testingAgent.name || "Test Agent",
      stage: testingAgent.stage || "matching",
      lane: testingAgent.lane || "",
      mode: testingAgent.mode || "auto-apply",
      prompt: testingAgent.prompt || "",
      skills: testingAgent.skills || [],
    }

    const batchSize = 50
    const totalBatches = Math.ceil(scenarios.length / batchSize)
    
    let allBaselineResults: any[] = []
    let allAgentResults: any[] = []

    // Process in batches for UI responsiveness
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize
      const batchEnd = Math.min(batchStart + batchSize, scenarios.length)
      const batchScenarios = scenarios.slice(batchStart, batchEnd)

      // Simulate processing delay for realism
      await new Promise((resolve) => setTimeout(resolve, 200))

      // Run both baseline and agent simulations
      const { results: baselineResults } = simulateBaselineProcessingBatch(batchScenarios)
      const { results: agentResults } = simulateAgentProcessingBatch(batchScenarios, agentConfig)

      allBaselineResults = [...allBaselineResults, ...baselineResults]
      allAgentResults = [...allAgentResults, ...agentResults]

      // Update progress
      const progress = ((batchEnd) / scenarios.length) * 100
      setTestProgress(progress)

      // Create invoice comparisons for display
      const batchComparisons = createInvoiceComparisons(batchScenarios, baselineResults, agentResults)
      setInvoiceComparisons(prev => [...prev, ...batchComparisons])
    }

    // Calculate final statistics
    const { stats: finalBaselineStats } = simulateBaselineProcessingBatch(scenarios)
    const { stats: finalAgentStats } = simulateAgentProcessingBatch(scenarios, agentConfig)
    
    setBaselineStats(finalBaselineStats)
    setAgentStats(finalAgentStats)

    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(finalBaselineStats, finalAgentStats, scenarios.length)
    setComparisonMetrics(metrics)

    setIsTesting(false)
  }

  const handleCloseTestModal = () => {
    if (onCloseTest) onCloseTest()
    
    // Reset all test state
    setComparisonMetrics(null)
    setInvoiceComparisons([])
    setTestProgress(0)
    setIsTesting(false)
    setCurrentPage(1)
    setWithoutAgentFilter("all")
    setWithAgentFilter("all")
    setStatusFilter("all")
  }

  const exportComparisonToCSV = () => {
    if (!comparisonMetrics || invoiceComparisons.length === 0) return

    // Build CSV content
    const headers = [
      "Invoice ID",
      "Vendor",
      "Amount",
      "Without Agent - Outcome",
      "Without Agent - Time (min)",
      "Without Agent - Manual Touches",
      "With Agent - Action",
      "With Agent - Time (min)",
      "With Agent - Manual Touches",
      "Improvement",
      "Time Saved (min)",
      "Improvement Highlights",
    ]

    const rows = invoiceComparisons.map(comp => [
      comp.invoiceId,
      comp.vendor,
      comp.amount.toFixed(2),
      comp.withoutAgent.outcome,
      comp.withoutAgent.processingTime.toFixed(1),
      comp.withoutAgent.manualTouches,
      comp.withAgent.action,
      comp.withAgent.processingTime.toFixed(1),
      comp.withAgent.manualTouches,
      comp.improvement.outcome,
      comp.improvement.timeSaved.toFixed(1),
      comp.improvement.highlights.join("; "),
    ])

    // Add summary rows
    rows.push([]) // Empty row
    rows.push(["SUMMARY"])
    rows.push(["Total Invoices", String(invoiceComparisons.length)])
    rows.push(["Avg Time Without Agent", comparisonMetrics.avgProcessingTimeWithout.toFixed(1) + " min"])
    rows.push(["Avg Time With Agent", comparisonMetrics.avgProcessingTimeWith.toFixed(1) + " min"])
    rows.push(["Time Reduction", comparisonMetrics.timeReductionPercentage.toFixed(1) + "%"])
    rows.push(["Annual FTE Savings", comparisonMetrics.annualFTESavings.toFixed(2)])
    rows.push(["Annual Cost Savings", "$" + comparisonMetrics.annualCostSavings.toLocaleString()])

    // Convert to CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `agent-test-comparison-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePromptGenerated = (prompt: string, skills: string[], documents?: any[]) => {
    console.log('[AgentBuilder2] handlePromptGenerated called', { currentAgent, prompt: prompt.substring(0, 50), skills })
    
    const agentName = extractAgentName(prompt)
    
    if (currentAgent) {
      const updatedAgent = {
        ...currentAgent,
        name: currentAgent.name === 'New Agent' || !currentAgent.name ? agentName : currentAgent.name,
        stage: detectedStage || currentAgent.stage || '',
        lane: detectedLane || currentAgent.lane || '',
        prompt,
        skills,
        documents: documents || currentAgent.documents,
      }
      console.log('[AgentBuilder2] Updating existing agent:', updatedAgent.name)
      onSaveAgent(updatedAgent)
      setShowDetails(true)
    } else {
      // Create a new agent if none is selected
      console.log('[AgentBuilder2] Creating new agent')
      const newAgentId = `agent-${Date.now()}`
      
      // Extract stage from prompt if possible
      const stageMatch = prompt.match(/STAGE:\s*(\w+)/i)
      const stage = stageMatch ? stageMatch[1].toLowerCase() : ''
      
      const newAgent: Agent = {
        id: newAgentId,
        name: agentName,
        stage: detectedStage || stage,
        lane: detectedLane,
        active: false,
        mode: 'auto-apply',
        prompt,
        skills,
        documents: documents || [],
      }
      
      console.log('[AgentBuilder2] New agent created:', newAgent)
      onSaveAgent(newAgent)
      onAgentSelect(newAgent)
      setShowDetails(true)
    }
  }

  const handleEditAgentDetails = () => {
    setShowDetails(false)
  }

  const handleSaveAgentDetails = () => {
    // Save is already handled by onSaveAgent
    setShowDetails(true)
  }

  const handleCreateNewAgent = (stageId?: string) => {
    const newAgentId = `agent-${Date.now()}`
    const newAgent: Agent = {
      id: newAgentId,
      name: "",
      stage: stageId || "",
      active: false,
      mode: "auto-apply",
      prompt: "",
      skills: [],
      documents: [],
    }
    
    onAgentSelect(newAgent)
    setChatOpen(true)
    setShowDetails(false)
  }

  // Handle left resize
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingLeft(true)
  }

  // Handle right resize
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingRight(true)
  }

  // Handle mouse move for resizing
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingLeft) {
      const newWidth = Math.max(240, Math.min(500, e.clientX))
      setLeftWidth(newWidth)
    }
    if (isDraggingRight) {
      const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX))
      setRightWidth(newWidth)
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDraggingLeft(false)
    setIsDraggingRight(false)
  }

  // Add event listeners for drag
  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      // Set cursor for entire document during drag
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      
      window.addEventListener('mousemove', handleMouseMove as any)
      window.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('mousemove', handleMouseMove as any)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingLeft, isDraggingRight])

  // Group agents by stage
  const agentsByStage = WORKFLOW_STAGES.map((stage) => ({
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

  return (
    <div className="flex h-full bg-white relative">
      {/* Left Column: Agent List */}
      <div className="border-r border-gray-200 flex flex-col bg-white" style={{ width: `${leftWidth}px` }}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-950 uppercase tracking-wide">Agents</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <Minimize2 className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {agentsByStage.map((stage) => (
              <div key={stage.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-gray-50 transition-colors rounded-lg"
                >
                  {expandedStages.has(stage.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-950">{stage.name}</div>
                    <div className="text-xs text-gray-500">
                      {stage.activeCount} active, {stage.inactiveCount} inactive
                    </div>
                  </div>
                </button>

                {expandedStages.has(stage.id) && stage.agents.length > 0 && (
                  <div className="space-y-1 mt-1 ml-2 pl-4 border-l border-gray-200">
                    {stage.agents.map((agent) => {
                      const isSelected = currentAgent?.id === agent.id
                      return (
                      <div
                        key={agent.id}
                        onClick={() => {
                          onAgentSelect(agent)
                          if (agent.prompt) {
                            setShowDetails(true)
                            setChatOpen(true)
                          } else {
                            setShowDetails(false)
                          }
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors group cursor-pointer ${
                          isSelected 
                            ? 'bg-purple-50 border-2 border-purple-900 hover:bg-purple-100' 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`w-7 h-7 shrink-0 ${agent.active ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-600"}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleActive(agent.id)
                          }}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${agent.active ? "bg-green-500" : "bg-gray-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-950 truncate">{agent.name}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditAgent(agent)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => handleCreateNewAgent()}
            className="w-full flex items-center justify-start gap-2 px-4 py-2.5 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Agent
          </button>
        </div>
      </div>

      {/* Left Resize Handle */}
      <div
        onMouseDown={handleLeftMouseDown}
        className={`w-1 hover:w-1.5 bg-transparent hover:bg-purple-600 cursor-col-resize transition-all ${
          isDraggingLeft ? 'w-1.5 bg-purple-600' : ''
        }`}
        style={{ flexShrink: 0 }}
      />

      {/* Middle Column: Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: '400px' }}>
        {showDetails && currentAgent && currentAgent.prompt ? (
          <AgentDetailsView
            agent={currentAgent}
            onToggleActive={onToggleActive}
            onEdit={handleEditAgentDetails}
            onDelete={onDeleteAgent}
            onSave={handleSaveAgentDetails}
            onUpdateAgent={onSaveAgent}
            allAgents={agents}
            onOpenTest={onOpenTest}
            agentMetrics={currentAgent.id ? agentMetrics[currentAgent.id] : undefined}
          />
        ) : chatOpen ? (
          // State when user is creating a new agent (chat is open)
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center px-8">
              <div className="mb-6">
                <img 
                  src="/agent-builder-robot.png" 
                  alt="Agent Builder Robot" 
                  className="w-48 h-48 mx-auto object-contain"
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-950 mb-4">
                Let's build your agent together
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Use the chat panel on the right to describe what you'd like this agent to do. I'll help configure everything.
              </p>
            </div>
          </div>
        ) : (
          // Initial empty state (no chat, no agent selected)
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center px-8">
              <div className="mb-6">
                <img 
                  src="/agent-builder-robot.png" 
                  alt="Agent Builder Robot" 
                  className="w-48 h-48 mx-auto object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-950 mb-4">
                Agent builder
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                Create custom rules and agents to enhance your workflow
              </p>
              <button
                onClick={() => handleCreateNewAgent()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
              >
                <Plus className="h-4 w-4" />
                Create new agent
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Resize Handle */}
      {chatOpen && (
        <div
          onMouseDown={handleRightMouseDown}
          className={`w-1 hover:w-1.5 bg-transparent hover:bg-purple-600 cursor-col-resize transition-all ${
            isDraggingRight ? 'w-1.5 bg-purple-600' : ''
          }`}
          style={{ flexShrink: 0 }}
        />
      )}

      {/* Right Column: Chat Panel */}
      {chatOpen && (
        <div className="border-l border-gray-200 flex flex-col" style={{ width: `${rightWidth}px` }}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-950">Chat</h2>
            <button
              onClick={() => chatRef.current?.clearChat()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear chat
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatInterface
              ref={chatRef}
              currentAgent={currentAgent}
              onPromptGenerated={handlePromptGenerated}
              onStageDetected={(stage) => {
                console.log('[AgentBuilder2] Stage detected:', stage)
                setDetectedStage(stage)
              }}
              onLaneDetected={(lane) => {
                console.log('[AgentBuilder2] Lane detected:', lane)
                setDetectedLane(lane)
              }}
              agentId={currentAgent?.id}
              currentPrompt={currentAgent?.prompt}
              onOpenTest={onOpenTest}
            />
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testingAgent && (
        <div className="fixed inset-0 bg-background z-[10000] flex flex-col">
          <Card className="w-full h-full overflow-hidden flex flex-col border-0 rounded-none shadow-none">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Test Agent: {testingAgent.name || "Untitled Agent"}</h3>
                <p className="text-base text-gray-950 mt-2">
                  Simulate against historical invoice data to measure agent impact
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseTestModal}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!isTesting && invoiceComparisons.length === 0 ? (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Select Time Period</Label>
                    <div className="grid grid-cols-4 gap-3">
                      <Button
                        variant={selectedTimePeriod === "7days" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("7days")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">7 days</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "30days" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("30days")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">30 days</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "3months" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("3months")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">3 months</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "6months" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("6months")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">6 months</span>
                      </Button>
                    </div>
                  </div>

                  <Card className="p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2">Test Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="font-medium">{testingAgent.name || "Unnamed Agent"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stage:</span>
                        <span className="font-medium capitalize">{testingAgent.stage || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lane:</span>
                        <span className="font-medium">{testingAgent.lane || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mode:</span>
                        <span className="font-medium capitalize">{testingAgent.mode === "auto-apply" ? "Auto-Apply" : testingAgent.mode || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skills:</span>
                        <span className="font-medium">{testingAgent.skills?.length || 0} selected</span>
                      </div>
                    </div>
                  </Card>

                  <Button onClick={runBulkTest} className="w-full h-12" size="lg">
                    <Play className="w-5 h-5 mr-2" />
                    Start Test Run
                  </Button>
                </div>
              ) : isTesting ? (
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
                    <h4 className="text-lg font-semibold mb-2">Processing Invoices...</h4>
                    <p className="text-muted-foreground mb-4">Testing agent against historical data</p>
                    <div className="max-w-md mx-auto">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${testProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{testProgress.toFixed(0)}% Complete</p>
                    </div>
                  </div>

                  {invoiceComparisons.length > 0 && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Recent Results</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {invoiceComparisons
                          .slice(-10)
                          .reverse()
                          .map((comparison, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                            >
                              <span className="font-mono">{comparison.invoiceId}</span>
                              <span className={comparison.improvement.outcome === "better" ? "text-green-600" : "text-gray-600"}>
                                {comparison.improvement.outcome === "better" ? "✓ Improved" : "○ No change"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  {comparisonMetrics && (
                    <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                      <h4 className="text-lg font-semibold mb-2">Agent Value Summary</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {generateExecutiveSummary(comparisonMetrics)}
                      </p>
                    </Card>
                  )}

                  {/* Comparison Metrics - Side by Side */}
                  {comparisonMetrics && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        {/* WITHOUT Agent Column */}
                        <Card className="p-4 bg-gray-50">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Without Agent</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-gray-500">Avg Time</p>
                              <p className="text-xl font-bold text-gray-900">{comparisonMetrics.avgProcessingTimeWithout.toFixed(1)} min</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Exceptions</p>
                              <p className="text-xl font-bold text-gray-900">{comparisonMetrics.exceptionsWithout.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Manual Touches</p>
                              <p className="text-xl font-bold text-gray-900">{comparisonMetrics.manualTouchesWithout.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Cost/Invoice</p>
                              <p className="text-xl font-bold text-gray-900">${comparisonMetrics.costPerInvoiceWithout.toFixed(2)}</p>
                            </div>
                          </div>
                        </Card>

                        {/* WITH Agent Column */}
                        <Card className="p-4 bg-purple-50 border-purple-200">
                          <p className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-3">With Agent</p>
                          <div className="space-y-3">
                            <div>
                              <p className="text-xs text-purple-700">Avg Time</p>
                              <p className="text-xl font-bold text-purple-900">{comparisonMetrics.avgProcessingTimeWith.toFixed(1)} min</p>
                            </div>
                            <div>
                              <p className="text-xs text-purple-700">Exceptions</p>
                              <p className="text-xl font-bold text-purple-900">{comparisonMetrics.exceptionsWith.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-purple-700">Manual Touches</p>
                              <p className="text-xl font-bold text-purple-900">{comparisonMetrics.manualTouchesWith.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-purple-700">Cost/Invoice</p>
                              <p className="text-xl font-bold text-purple-900">${comparisonMetrics.costPerInvoiceWith.toFixed(2)}</p>
                            </div>
                          </div>
                        </Card>

                        {/* Improvement Column */}
                        <Card className="p-4 bg-green-50 border-green-200">
                          <p className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-3">Improvement</p>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-xs text-green-700">Time Saved</p>
                                <p className="text-xl font-bold text-green-900">{comparisonMetrics.timeReductionPercentage.toFixed(0)}%</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-xs text-green-700">Fewer Exceptions</p>
                                <p className="text-xl font-bold text-green-900">{comparisonMetrics.exceptionReductionPercentage.toFixed(0)}%</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-xs text-green-700">Fewer Touches</p>
                                <p className="text-xl font-bold text-green-900">{comparisonMetrics.manualTouchReductionPercentage.toFixed(0)}%</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-xs text-green-700">Cost Savings</p>
                                <p className="text-xl font-bold text-green-900">${comparisonMetrics.costSavingsPerInvoice.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {/* ROI Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <Card className="p-4">
                          <p className="text-sm font-semibold mb-3">FTE Savings</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Hours Saved:</span>
                              <span className="font-medium">{comparisonMetrics.fteHoursSaved.toFixed(1)} hours</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Annual FTE Savings:</span>
                              <span className="font-medium text-green-600">{comparisonMetrics.annualFTESavings.toFixed(2)} FTE</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Annual Cost Savings:</span>
                              <span className="font-medium text-green-600">${comparisonMetrics.annualCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </Card>

                        <Card className="p-4">
                          <p className="text-sm font-semibold mb-3">Processing Efficiency</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Speedup Factor:</span>
                              <span className="font-medium">{comparisonMetrics.processingSpeedupFactor.toFixed(1)}x faster</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Auto-Resolved:</span>
                              <span className="font-medium">{comparisonMetrics.autoResolvedCount.toLocaleString()} invoices</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Accuracy:</span>
                              <span className="font-medium">{comparisonMetrics.accuracyWith.toFixed(1)}% (+{comparisonMetrics.accuracyImprovement.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    </>
                  )}

                  {/* Invoice-by-Invoice Comparison Table */}
                  {invoiceComparisons.length > 0 && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">Invoice-by-Invoice Comparison</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            Agent actions: <span className="text-purple-700">✓ No human needed</span> • <span className="text-yellow-700">→ Review needed</span> • <span className="text-gray-600">○ Flagged only</span> • <span className="text-yellow-700">↑ Manual required</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Select value={withoutAgentFilter} onValueChange={(value: any) => {
                            setWithoutAgentFilter(value)
                            setCurrentPage(1)
                          }}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Without Agent" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All Outcomes</SelectItem>
                              <SelectItem value="pass">Passed</SelectItem>
                              <SelectItem value="blocked">Blocked</SelectItem>
                              <SelectItem value="delayed">Delayed</SelectItem>
                              <SelectItem value="error">Error</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select value={withAgentFilter} onValueChange={(value: any) => {
                            setWithAgentFilter(value)
                            setCurrentPage(1)
                          }}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="With Agent" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All Actions</SelectItem>
                              <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
                              <SelectItem value="suggested_resolution">Suggested</SelectItem>
                              <SelectItem value="observed">Observed</SelectItem>
                              <SelectItem value="escalated_to_human">Escalated</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select value={statusFilter} onValueChange={(value: any) => {
                            setStatusFilter(value)
                            setCurrentPage(1)
                          }}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Improvement" />
                            </SelectTrigger>
                            <SelectContent className="z-[10001]">
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="pass">Improved</SelectItem>
                              <SelectItem value="fail">With Issues</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2">Invoice ID</th>
                              <th className="text-left p-2">Vendor</th>
                              <th className="text-right p-2">Amount</th>
                              <th className="text-left p-2">Without Agent</th>
                              <th className="text-left p-2">With Agent</th>
                              <th className="text-left p-2">Improvement</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const filteredResults = invoiceComparisons.filter((comparison) => {
                                // Without Agent filter
                                if (withoutAgentFilter !== "all" && comparison.withoutAgent.outcome !== withoutAgentFilter) {
                                  return false
                                }
                                
                                // With Agent filter
                                if (withAgentFilter !== "all" && comparison.withAgent.agentAction !== withAgentFilter) {
                                  return false
                                }
                                
                                // Improvement filter
                                if (statusFilter === "pass" && comparison.improvement.outcome !== "better") {
                                  return false
                                }
                                if (statusFilter === "fail" && !comparison.hasIssue) {
                                  return false
                                }
                                
                                return true
                              })
                              
                              // Show empty state if no results match filter
                              if (filteredResults.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                      <p className="text-sm">No invoices match the current filter.</p>
                                      <p className="text-xs mt-1">Try selecting a different filter option.</p>
                                    </td>
                                  </tr>
                                )
                              }
                              
                              const startIndex = (currentPage - 1) * rowsPerPage
                              const endIndex = startIndex + rowsPerPage
                              const paginatedResults = filteredResults.slice(startIndex, endIndex)

                              return paginatedResults.map((comparison, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t hover:bg-muted/50 transition-colors"
                                >
                                  <td className="p-2 font-mono">
                                    <div className="flex items-center gap-1">
                                      {comparison.invoiceId}
                                    </div>
                                  </td>
                                  <td className="p-2">{comparison.vendor}</td>
                                  <td className="p-2 text-right font-medium">${comparison.amount.toFixed(2)}</td>
                                  <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                      <span className={`text-xs px-1.5 py-0.5 rounded inline-block ${
                                        comparison.withoutAgent.outcome === "pass" ? "bg-green-100 text-green-700" : 
                                        comparison.withoutAgent.outcome === "blocked" ? "bg-red-100 text-red-700" :
                                        comparison.withoutAgent.outcome === "delayed" ? "bg-yellow-100 text-yellow-700" :
                                        "bg-gray-100 text-gray-700"
                                      }`}>
                                        {comparison.withoutAgent.outcome === "pass" ? "passed" : comparison.withoutAgent.outcome}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{comparison.withoutAgent.processingTimeMinutes.toFixed(0)}min • {comparison.withoutAgent.manualTouches} touch{comparison.withoutAgent.manualTouches !== 1 ? 'es' : ''}</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                      <span className={`text-xs px-1.5 py-0.5 rounded inline-block ${
                                        comparison.withAgent.agentAction === "auto_resolved" ? "bg-purple-100 text-purple-700" : 
                                        comparison.withAgent.agentAction === "suggested_resolution" ? "bg-yellow-100 text-yellow-700" :
                                        comparison.withAgent.agentAction === "observed" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-100 text-gray-700"
                                      }`}>
                                        {comparison.withAgent.agentAction === "auto_resolved" ? "✓ Auto-resolved (no human)" : 
                                         comparison.withAgent.agentAction === "suggested_resolution" ? "→ Suggested (needs review)" : 
                                         comparison.withAgent.agentAction === "observed" ? "○ Observed (flagged only)" : 
                                         "↑ Escalated to human"}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{comparison.withAgent.processingTimeMinutes.toFixed(0)}min • {comparison.withAgent.manualTouches} touch{comparison.withAgent.manualTouches !== 1 ? 'es' : ''}</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex flex-wrap gap-1">
                                      {comparison.improvement.highlights.map((highlight, hidx) => (
                                        <span key={hidx} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                                          {highlight}
                                        </span>
                                      ))}
                                      {comparison.improvement.highlights.length === 0 && (
                                        <span className="text-xs text-muted-foreground">No change</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            })()}
                          </tbody>
                        </table>
                      </div>
                      {(() => {
                        const filteredResults = invoiceComparisons.filter((comparison) => {
                          // Without Agent filter
                          if (withoutAgentFilter !== "all" && comparison.withoutAgent.outcome !== withoutAgentFilter) {
                            return false
                          }
                          
                          // With Agent filter
                          if (withAgentFilter !== "all" && comparison.withAgent.agentAction !== withAgentFilter) {
                            return false
                          }
                          
                          // Improvement filter
                          if (statusFilter === "pass" && comparison.improvement.outcome !== "better") {
                            return false
                          }
                          if (statusFilter === "fail" && !comparison.hasIssue) {
                            return false
                          }
                          
                          return true
                        })

                        const totalPages = Math.ceil(filteredResults.length / rowsPerPage)
                        
                        if (totalPages <= 1) return null

                        return (
                          <div className="flex items-center justify-between mt-3 text-xs">
                            <div className="text-muted-foreground">
                              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredResults.length)} of {filteredResults.length} invoices
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                              >
                                Previous
                              </Button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                  let pageNum
                                  if (totalPages <= 5) {
                                    pageNum = i + 1
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                  } else {
                                    pageNum = currentPage - 2 + i
                                  }
                                  return (
                                    <Button
                                      key={pageNum}
                                      variant={currentPage === pageNum ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => setCurrentPage(pageNum)}
                                      className="w-8 h-8 p-0"
                                    >
                                      {pageNum}
                                    </Button>
                                  )
                                })}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )
                      })()}
                    </Card>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleCloseTestModal}
                      variant="outline"
                      className="flex-1"
                    >
                      Close
                    </Button>
                    <Button
                      onClick={exportComparisonToCSV}
                      disabled={!comparisonMetrics}
                      variant="outline"
                      className="flex-1"
                    >
                      Export CSV
                    </Button>
                    <Button
                      onClick={() => {
                        setComparisonMetrics(null)
                        setInvoiceComparisons([])
                        setTestProgress(0)
                      }}
                      variant="default"
                      className="flex-1"
                    >
                      Run New Test
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
