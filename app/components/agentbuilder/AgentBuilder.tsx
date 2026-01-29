"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { Card } from "@/app/components/ui/card"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Save, Play, Edit, Power, X, Loader2, RefreshCw, Trash2, ChevronRight, TrendingUp, TrendingDown } from "lucide-react" // Added Trash2 icon and ChevronRight icon
import { ChatInterface } from "./ChatInterface"

import type { Agent } from "./AgentBuilderPage"

// Import new simulation modules
import { generateTestScenarios, type ScenarioConfig, type TimePeriod, type Stage } from './testScenarioGenerator'
import { simulateBaselineProcessingBatch, type BaselineStats } from './baselineSimulator'
import { simulateAgentProcessingBatch, type AgentStats, type AgentConfig as SimAgentConfig } from './agentSimulator'
import { calculateComparisonMetrics, createInvoiceComparisons, formatMetricsForDisplay, generateExecutiveSummary, type ComparisonMetrics, type InvoiceComparison } from './comparisonMetrics'

// AgentConfig matches Agent type from AgentBuilderPage
type AgentConfig = Agent & {
  lane: string
}

type VersionHistoryEntry = {
  id: string
  timestamp: Date
  editor: string
  action: "created" | "edited" | "activated" | "deactivated"
  changes: string[]
  snapshot: AgentConfig
}

interface AgentBuilderProps {
  agent?: AgentConfig | null
  onSave: (agent: AgentConfig) => void
  isPreview?: boolean
  onEdit?: () => void
  onToggleActive?: (agentId: string) => void
  onOpenTest?: () => void
  onCloseTest?: () => void
  testingAgent?: boolean
  editingAgent?: boolean
  showTestModal?: boolean
  allAgents?: any[] // Added allAgents prop for conflict detection
  onDelete?: (agentId: string) => void // Added onDelete prop
  agentMetrics?: { evaluated: number; actedOn: number; referred: number } // Added agentMetrics prop
  onPromptGenerated?: (prompt: string, skills: string[]) => void // Added for prompt generation from chat
  currentAgent?: Agent | null // Added for passing agent context to chat
  onStateChange?: (prompt: string, skills: string[], advancedYaml?: string) => void // Callback to sync state with parent
}

const stages = [
  { id: "ingestion", name: "Ingestion" },
  { id: "data-capture", name: "Data Capture" },
  { id: "verification", name: "Verification" },
  { id: "matching", name: "Matching" },
  { id: "approval", name: "Approval" },
  { id: "posting", name: "Posting" },
]

const STAGE_LANES: Record<string, string[]> = {
  ingestion: ["Source Intake", "File Triage", "Duplicate Detection", "Supplier Routing"],
  "data-capture": ["OCR Extraction", "Field Normalisation", "Header vs Line Split", "Currency/Tax Parsing"],
  verification: ["Confidence Scoring", "Anomaly Checks", "Supplier Master Validation", "Policy Checks"],
  matching: ["PO Match", "GRN Match", "Contract Match", "Unit Conversion", "Tolerance Application"],
  approval: ["Approver Routing", "Reminder Nudges", "Exception Pack Creation", "Escalation"],
  posting: ["Coding Suggestion", "ERP Payload Creation", "Posting Validation", "Reconciliation"]
}

export function AgentBuilder({
  agent,
  onSave,
  isPreview = false,
  onEdit,
  onToggleActive,
  onOpenTest,
  onCloseTest,
  testingAgent = false,
  editingAgent = false,
  showTestModal = false,
  allAgents = [], // Default to empty array if not provided
  onDelete, // Added onDelete
  agentMetrics, // Added agentMetrics prop
  onPromptGenerated, // Added for prompt generation from chat
  currentAgent, // Added for passing agent context to chat
  onStateChange, // Callback to sync state with parent
}: AgentBuilderProps) {
  const [agentName, setAgentName] = useState("")
  const [stage, setStage] = useState("ingestion")
  const [lane, setLane] = useState<string>("")
  const [agentMode, setAgentMode] = useState<"observe" | "suggest" | "auto-apply">("observe") // Added agent mode state
  const [prompt, setPrompt] = useState("")
  const [activeSkills, setActiveSkills] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedYaml, setAdvancedYaml] = useState("")
  const [originalPrompt, setOriginalPrompt] = useState("")
  const [promptRules, setPromptRules] = useState<any[]>([{ id: "1", type: "if", condition: "", action: "" }])
  const lastAgentIdRef = useRef<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const chatCardRef = useRef<HTMLDivElement>(null)
  const [liveInvoiceSource, setLiveInvoiceSource] = useState<"samples" | "uploaded" | "erp">("samples")
  const [liveInvoices, setLiveInvoices] = useState<any[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [internalShowTestModal, setInternalShowTestModal] = useState(false)
  const [testInput, setTestInput] = useState("")
  const [testOutput, setTestOutput] = useState("")
  const [isTesting, setIsTesting] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]) // Added selectedSkills state
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<"7days" | "30days" | "3months" | "6months">("7days")
  const [testResults, setTestResults] = useState<any[]>([])
  const [testProgress, setTestProgress] = useState(0)
  const [testSummary, setTestSummary] = useState<any>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalAgentData, setOriginalAgentData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fail">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage] = useState(50)
  
  // New state for scenario configuration and comparison
  const [scenarioMix, setScenarioMix] = useState<number>(40) // 40% issues by default
  const [comparisonMetrics, setComparisonMetrics] = useState<ComparisonMetrics | null>(null)
  const [invoiceComparisons, setInvoiceComparisons] = useState<InvoiceComparison[]>([])
  const [baselineStats, setBaselineStats] = useState<BaselineStats | null>(null)
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null)

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [showDecisionLog, setShowDecisionLog] = useState(false)

  const [versionHistory, setVersionHistory] = useState<VersionHistoryEntry[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  const [conflicts, setConflicts] = useState<
    Array<{
      type: "rule" | "responsibility" | "field" | "status"
      severity: "high" | "medium" | "low"
      conflictingAgentId: string
      conflictingAgentName: string
      description: string
    }>
  >([])

  // const [agentMetrics, setAgentMetrics] = useState<{ // REMOVED: Now using prop
  //   evaluated: number
  //   actedOn: number
  //   referred: number
  // } | null>(null)
  const previousAgentIdRef = useRef<string | null>(null) // Added ref for previous agent ID

  type PromptRule = {
    id: string
    type: "if" | "when" | "and" | "or"
    condition: string
    action: string
  }

  const addVersionEntry = (action: "created" | "edited" | "activated" | "deactivated", changes: string[]) => {
    if (!agent && !agentName) return // Don't add version if no agent is being edited/created yet

    const newEntry: VersionHistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      editor: "Current User", // In production, this would be the actual user
      action,
      changes,
      snapshot: {
        id: agent?.id || "",
        name: agentName,
        stage,
        lane,
        mode: agentMode,
        prompt,
        skills: activeSkills,
        active: isActive,
      },
    }

    setVersionHistory((prev) => [newEntry, ...prev])
  }

  const handleRollback = (versionId: string) => {
    const version = versionHistory.find((v) => v.id === versionId)
    if (!version) return

    const snapshot = version.snapshot
    setAgentName(snapshot.name || "")
    setStage(snapshot.stage || "ingestion")
    setLane(snapshot.lane || "")
    setAgentMode(snapshot.mode || "observe")
    setPrompt(snapshot.prompt || "")
    setActiveSkills(snapshot.skills || [])
    setSelectedSkills(snapshot.skills || [])
    setIsActive(snapshot.active ?? false)

    addVersionEntry("edited", [`Rolled back to version from ${new Date(version.timestamp).toLocaleString()}`])
  }

  const rulesToPrompt = (rules: PromptRule[]): string => {
    if (rules.length === 0) return ""

    let text = ""
    rules.forEach((rule, index) => {
      const prefix = index === 0 ? "" : rule.type.toUpperCase() + " "
      text += `${prefix}${rule.type.toUpperCase()} ${rule.condition} THEN ${rule.action}\n`
    })
    return text
  }

  const promptToRules = (text: string): PromptRule[] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const rules: PromptRule[] = []

    lines.forEach((line) => {
      const ifMatch = line.match(/IF\s+(.+?)\s+THEN\s+(.+)/i)
      const whenMatch = line.match(/WHEN\s+(.+?)\s+THEN\s+(.+)/i)
      const andMatch = line.match(/AND\s+(.+?)\s+THEN\s+(.+)/i)
      const orMatch = line.match(/OR\s+(.+?)\s+THEN\s+(.+)/i)

      if (ifMatch) {
        rules.push({
          id: Date.now().toString() + Math.random(),
          type: "if",
          condition: ifMatch[1].trim(),
          action: ifMatch[2].trim(),
        })
      } else if (whenMatch) {
        rules.push({
          id: Date.now().toString() + Math.random(),
          type: "when",
          condition: whenMatch[1].trim(),
          action: whenMatch[2].trim(),
        })
      } else if (andMatch) {
        rules.push({
          id: Date.now().toString() + Math.random(),
          type: "and",
          condition: andMatch[1].trim(),
          action: andMatch[2].trim(),
        })
      } else if (orMatch) {
        rules.push({
          id: Date.now().toString() + Math.random(),
          type: "or",
          condition: orMatch[1].trim(),
          action: orMatch[2].trim(),
        })
      }
    })

    return rules
  }

  const addRule = () => {
    const newRule: PromptRule = {
      id: Date.now().toString(),
      type: "if",
      condition: "",
      action: "",
    }
    setPromptRules([...promptRules, newRule])
  }

  const updateRule = (id: string, field: "type" | "condition" | "action", value: string) => {
    setPromptRules(promptRules.map((rule) => (rule.id === id ? { ...rule, [field]: value } : rule)))
  }

  const deleteRule = (id: string) => {
    setPromptRules(promptRules.filter((rule) => rule.id !== id))
  }

  const handleToggleAdvanced = () => {
    if (!showAdvanced) {
      setOriginalPrompt(prompt)
      setAdvancedYaml(generateCodeView())
    } else {
      const generatedYaml = generateCodeView()
      if (advancedYaml !== generatedYaml) {
        parseYamlToPrompt(advancedYaml)
      } else {
        setPrompt(originalPrompt)
      }
    }
    setShowAdvanced(!showAdvanced)
  }

  const parseYamlToPrompt = (yaml: string) => {
    try {
      const purposeMatch = yaml.match(/purpose:\s*"([^"]+)"/)
      const strategyMatch = yaml.match(/description:\s*\|\s*\n([\s\S]*?)(?=\n\s{0,4}\w+:|$)/)
      const validationsMatch = yaml.match(/validations:\s*\n([\s\S]*?)(?=\noutputs:|$)/)
      const outputMatch = yaml.match(/outputs:\s*\n([\s\S]*?)(?=\ndecision:|$)/)
      const errorMatch = yaml.match(/error_handling:\s*\n([\s\S]*?)(?=\naudit:|$)/)

      const purpose = purposeMatch ? purposeMatch[1] : ""
      const strategy = strategyMatch
        ? strategyMatch[1]
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s)
            .join(" ")
        : ""

      let newPrompt = ""
      if (purpose) newPrompt += `ROLE: ${purpose}\n\n`
      if (strategy) newPrompt += `STEPS: ${strategy}\n\n`
      if (validationsMatch) newPrompt += `VALIDATIONS: See validation rules in advanced view\n\n`
      if (outputMatch) newPrompt += `OUTPUT: See output contract in advanced view\n\n`
      if (errorMatch) newPrompt += `ERROR HANDLING: See error handling rules in advanced view\n\n`

      if (newPrompt) {
        setPrompt(newPrompt.trim())
      }
    } catch (error) {
      console.error("Error parsing YAML:", error)
    }
  }

  const handleRulesChange = (rules: any[]) => {
    setPromptRules(rules)
    const text = rulesToPrompt(rules)
    setPrompt(text)
  }

  const handlePromptGenerated = (generatedPrompt: string, skills: string[], documents?: any[]) => {
    console.log("[AgentBuilder] Prompt generation complete")
    
    // Mark that AI generation is complete
    isAIGeneratingRef.current = false
    
    setPrompt(generatedPrompt)
    setActiveSkills(skills)
    setSelectedSkills(skills)
    if (onPromptGenerated) {
      onPromptGenerated(generatedPrompt, skills, documents)
    }
    // Sync state with parent
    if (onStateChange) {
      const yaml = showAdvanced ? generateCodeView() : ""
      onStateChange(generatedPrompt, skills, yaml)
    }
    
    // Scroll to and focus the name field in the configuration section
    setTimeout(() => {
      if (nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        nameInputRef.current.focus()
      }
    }, 100)
  }

  // Sync state with parent component for right sidebar rendering
  useEffect(() => {
    if (onStateChange) {
      const yaml = showAdvanced ? generateCodeView() : ""
      onStateChange(prompt, activeSkills, yaml)
    }
  }, [prompt, activeSkills, showAdvanced, agentName, stage, lane, agentMode, onStateChange])

  const extractErrorScenariosFromPrompt = (promptText: string): string[] => {
    if (!promptText) return []

    const errorSection = promptText.match(/ERROR HANDLING:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!errorSection) return []

    const scenarios: string[] = []
    const lines = errorSection[1].split("\n")

    lines.forEach((line) => {
      const trimmed = line.trim()
      // Match lines like "- Missing PO" or "* Invalid amount" or "1. Duplicate invoice"
      const match = trimmed.match(/^[-*•\d]+\.?\s*(.+)/)
      if (match) {
        let scenario = match[1].trim()

        // Remove "If" at the beginning
        scenario = scenario.replace(/^if\s+/i, "")

        // Remove everything after → or : (the action part)
        scenario = scenario.split(/\s*[→:]\s*/)[0].trim()

        if (scenario) {
          scenarios.push(scenario)
        }
      }
    })

    return scenarios.length > 0
      ? scenarios
      : [
          "PO reference missing or invalid",
          "Invoice amount doesn't match PO",
          "Duplicate invoice detected",
          "Vendor not in approved list",
          "Invoice date outside acceptable range",
        ]
  }

  const extractErrorActionsFromPrompt = (promptText: string): Record<string, string> => {
    if (!promptText) return {}

    const errorSection = promptText.match(/ERROR HANDLING:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!errorSection) return {}

    const actions: Record<string, string> = {}
    const lines = errorSection[1].split("\n")

    lines.forEach((line) => {
      const trimmed = line.trim()
      const match = trimmed.match(/^[-*•\d]+\.?\s*(.+)/)
      if (match) {
        let fullText = match[1].trim()

        // Remove "If" at the beginning
        fullText = fullText.replace(/^if\s+/i, "")

        // Split by → or : to separate error from action
        const parts = fullText.split(/\s*[→:]\s*/)
        if (parts.length >= 2) {
          const errorDescription = parts[0].trim()
          const action = parts.slice(1).join(": ").trim()
          actions[errorDescription] = action
        }
      }
    })

    return actions
  }

  useEffect(() => {
    const agentChanged = agent?.id !== lastAgentIdRef.current

    if (agent && agentChanged) {
      console.log("[v0] Loading different agent:", agent.id)
      setAgentName(agent.name)
      setStage(agent.stage || "ingestion")
      setLane(agent.lane || STAGE_LANES[agent.stage || "ingestion"]?.[0] || "")
      setAgentMode(agent.mode || "observe")
      setPrompt(agent.prompt || "")
      setOriginalPrompt(agent.prompt || "")
      setActiveSkills(agent.skills || [])
      setSelectedSkills(agent.skills || [])
      setIsActive(agent.active ?? false)
      setTestResults([])
      setTestProgress(0)
      setTestSummary(null)
      setIsTesting(false)
      setSelectedTimePeriod("7days")
      setOriginalAgentData({
        name: agent.name,
        stage: agent.stage || "ingestion",
        lane: agent.lane || "",
        mode: agent.mode || "observe",
        prompt: agent.prompt || "",
        skills: agent.skills || [],
      })
      setHasChanges(false)
      lastAgentIdRef.current = agent.id
      previousAgentIdRef.current = agent.id // Store current agent ID in previousAgentId ref
      
      // Always reset version history when loading a different agent
      // Create initial version history entry for this agent
      const initialSnapshot: AgentConfig = {
        id: agent.id,
        name: agent.name,
        stage: agent.stage || "ingestion",
        lane: agent.lane || "",
        mode: agent.mode || "observe",
        prompt: agent.prompt || "",
        skills: agent.skills || [],
        active: agent.active ?? false,
      }
      setVersionHistory([
        {
          id: "initial",
          timestamp: new Date(Date.now() - 100000), // A bit in the past
          editor: "System",
          action: "created",
          changes: [],
          snapshot: initialSnapshot,
        },
      ])
    } else if (!agent && agentChanged) {
      console.log("[v0] Creating new agent")
      setAgentName("")
      setStage("ingestion")
      setLane("")
      setAgentMode("observe")
      setPrompt("")
      setOriginalPrompt("")
      setActiveSkills([])
      setSelectedSkills([])
      setIsActive(false)
      setTestResults([])
      setTestProgress(0)
      setTestSummary(null)
      setIsTesting(false)
      setVersionHistory([]) // Clear version history when creating new agent
      setSelectedTimePeriod("7days")
      setOriginalAgentData(null)
      setHasChanges(false)
      lastAgentIdRef.current = null
      previousAgentIdRef.current = null // Reset previousAgentId ref
      setVersionHistory([]) // Clear history for new agent
    } else if (agent && !agentChanged) {
      if (agent.prompt !== prompt) {
        console.log("[v0] Updating prompt from external source")
        setPrompt(agent.prompt || "")
        setOriginalPrompt(agent.prompt || "")
      }
      if (JSON.stringify(agent.skills) !== JSON.stringify(activeSkills)) {
        console.log("[v0] Updating skills from external source")
        setActiveSkills(agent.skills || [])
        setSelectedSkills(agent.skills || [])
      }
    }
  }, [agent])

  // Auto-select first lane when stage changes
  // Use a ref to track if we're in the middle of AI generation (to avoid race conditions)
  const isAIGeneratingRef = useRef(false)
  
  useEffect(() => {
    // Only auto-select first lane if:
    // 1. Stage is set
    // 2. Lane is currently empty (not already set by AI or user)
    // 3. Agent doesn't already have a lane
    // 4. Not in the middle of AI generation (to avoid race with AI lane detection)
    if (stage && STAGE_LANES[stage] && !lane && !agent?.lane && !isAIGeneratingRef.current) {
      console.log("[AgentBuilder] Auto-selecting first lane for stage:", stage)
      const firstLane = STAGE_LANES[stage][0]
      setLane(firstLane)
    }
  }, [stage, agent?.lane, lane])

  // Scroll chat card into view on mount
  useEffect(() => {
    setTimeout(() => {
      chatCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 300)
  }, [])

  // Check if we already have metrics for this agent
  // REMOVED: This logic is now handled by the parent component passing agentMetrics as a prop.
  // The initial check and generation of metrics will happen there.
  // useEffect(() => {
  //   if (agentMetrics && agent?.id === previousAgentIdRef.current) {
  //     return // Already have metrics for this agent, don't regenerate
  //   }

  //   // For newly created agents without metrics, keep metrics null to show zeros
  //   if (!agent?.id) {
  //     setAgentMetrics(null)
  //     return
  //   }

  //   // For this demo, we'll treat agents as "new" if they don't have metrics yet
  //   // Only generate metrics once for pre-existing agents
  //   const isNewAgent = !agent.stage || agent.id.toString().length > 10 // newly generated IDs are timestamps

  //   if (isNewAgent) {
  //     setAgentMetrics(null)
  //     return
  //   }

  //   // Generate metrics only once for pre-loaded agents
  //   const baseEvaluated = Math.floor(Math.random() * 500 + 200) // 24 hours worth of data
  //   const actedOnPercent = agentMode === "auto-apply" ? 0.85 : agentMode === "suggest" ? 0.6 : 0
  //   const actedOn = Math.floor(baseEvaluated * actedOnPercent)
  //   const referred = baseEvaluated - actedOn

  //   setAgentMetrics({
  //     evaluated: baseEvaluated,
  //     actedOn: actedOn,
  //     referred: referred,
  //   })
  // }, [agent?.id]) // Only depend on agent ID, not the entire agent object or mode

  const detectConflicts = (
    currentAgent: AgentConfig | null,
    allAgents: any[],
  ): Array<{
    type: "rule" | "responsibility" | "field" | "status"
    severity: "high" | "medium" | "low"
    conflictingAgentId: string
    conflictingAgentName: string
    description: string
  }> => {
    if (!currentAgent || !currentAgent.prompt) return []

    const detectedConflicts: Array<{
      type: "rule" | "responsibility" | "field" | "status"
      severity: "high" | "medium" | "low"
      conflictingAgentId: string
      conflictingAgentName: string
      description: string
    }> = []

    const currentPromptLower = currentAgent.prompt.toLowerCase()

    // Get stage indices to understand workflow position
    const currentStageIndex = stages.findIndex((s) => s.id === currentAgent.stage)

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

    const currentVendors = extractVendorScope(currentAgent.prompt)
    const currentAction = getRuleAction(currentPromptLower)
    const currentIsVendorSpecific = currentVendors.length > 0

    allAgents.forEach((otherAgent) => {
      if (!otherAgent.id || otherAgent.id === currentAgent.id || !otherAgent.prompt) return

      const otherStageIndex = stages.findIndex((s) => s.id === otherAgent.stage)
      const otherPromptLower = otherAgent.prompt.toLowerCase()

      // Determine relationship: same stage, earlier stage, or later stage
      const isSameStage = currentStageIndex === otherStageIndex
      const isEarlierStage = otherStageIndex < currentStageIndex
      const isLaterStage = otherStageIndex > currentStageIndex

      // Only check conflicts for same stage or adjacent stages
      const stageDistance = Math.abs(currentStageIndex - otherStageIndex)
      if (stageDistance > 1) return // Too far apart in workflow to conflict

      const otherVendors = extractVendorScope(otherAgent.prompt)
      const otherAction = getRuleAction(otherPromptLower)
      const otherIsVendorSpecific = otherVendors.length > 0

      const hasVendorOverlap = currentVendors.some((v) => otherVendors.includes(v))
      const actionsConflict =
        (currentAction === "approve" && otherAction === "reject") ||
        (currentAction === "reject" && otherAction === "approve")

      // SAME STAGE CONFLICTS - Check all conflict types
      if (isSameStage) {
        // Only flag as conflict if:
        // 1. Both target same vendor(s) with contradictory actions, OR
        // 2. One is general and one is vendor-specific with contradictory actions for overlapping scope
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
          // If both are vendor-specific, only conflict if they target same vendor
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
            // No conflict if vendor-specific rules target different vendors
          } else if (!currentIsVendorSpecific && !otherIsVendorSpecific) {
            // Both are general rules with conflicting actions
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
          // If one is vendor-specific and one is general, this is rule hierarchy (not a conflict)
          // The vendor-specific rule takes precedence for that vendor
        }

        // Detect field modification conflicts (same stage only)
        const fields = ["po number", "amount", "vendor", "invoice number", "date", "status"]
        fields.forEach((field) => {
          if (currentPromptLower.includes(`modify ${field}`) || currentPromptLower.includes(`change ${field}`)) {
            if (currentPromptLower.includes(`modify ${field}`) || currentPromptLower.includes(`change ${field}`)) {
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

        // Detect overlapping responsibilities in same stage
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

      // SEQUENTIAL STAGE CONFLICTS - Only flag if later stage undoes earlier work
      if (isLaterStage) {
        // Later stage rejecting what earlier stage approved
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

        // Later stage modifying fields that earlier stage set
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

      if (isEarlierStage) {
        // Earlier stage rejecting what later stage might approve
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

        // Earlier stage modifying fields that later stage sets
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

      // Mode conflicts only matter in same stage
      if (isSameStage) {
        if (currentAgent.mode === "auto-apply" && otherAgent.mode === "observe") {
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

  useEffect(() => {
    if (agent?.prompt) {
      const detected = detectConflicts(agent, allAgents)
      setConflicts(detected)
    } else {
      setConflicts([])
    }
  }, [agent, allAgents])

  const handleToggleActive = () => {
    if (!agent?.id) return

    const newActiveState = !isActive
    setIsActive(newActiveState)

    if (onToggleActive) {
      onToggleActive(agent.id)
    }
    addVersionEntry(newActiveState ? "activated" : "deactivated", [])
  }

  useEffect(() => {
    if (!originalAgentData || !isPreview) return

    const currentData = {
      name: agentName,
      stage,
      lane,
      mode: agentMode,
      prompt,
      skills: activeSkills,
    }

    const changed =
      currentData.name !== originalAgentData.name ||
      currentData.stage !== originalAgentData.stage ||
      currentData.lane !== originalAgentData.lane ||
      currentData.mode !== originalAgentData.mode ||
      currentData.prompt !== originalAgentData.prompt ||
      JSON.stringify(currentData.skills) !== JSON.stringify(originalAgentData.skills)

    setHasChanges(changed)
  }, [agentName, stage, lane, agentMode, prompt, activeSkills, originalAgentData, isPreview])

  // Removed the old useEffect for agentMetrics and kept the new one

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }


  const loadLiveInvoices = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const mockLiveInvoices = [
      {
        id: "INV-2024-1001",
        vendor: "Acme Corporation",
        amount: 1234.56,
        date: "2024-01-15",
        status: "pending",
        rawData: `INVOICE
Invoice Number: INV-2024-1001
Date: January 15, 2024
Vendor: Acme Corporation
Amount: $1,234.56
Status: Pending Approval
Items: Office Supplies, Equipment`,
      },
      {
        id: "INV-2024-1002",
        vendor: "TechSupply Inc",
        amount: 5678.9,
        date: "2024-01-18",
        status: "pending",
        rawData: `INVOICE
Invoice Number: INV-2024-1002
Date: January 18, 2024
Vendor: TechSupply Inc
Amount: $5,678.90
Status: Pending Review
Items: Computer Hardware, Software Licenses`,
      },
      {
        id: "INV-2024-1003",
        vendor: "Global Services Ltd",
        amount: 3456.78,
        date: "2024-01-20",
        status: "pending",
        rawData: `INVOICE
Invoice Number: INV-2024-1003
Date: January 20, 2024
Vendor: Global Services Ltd
Amount: $3,456.78
Status: Awaiting Processing
Items: Consulting Services, Professional Fees`,
      },
      {
        id: "INV-2024-1004",
        vendor: "Office Depot",
        amount: 892.45,
        date: "2024-01-22",
        status: "pending",
        rawData: `INVOICE
Invoice Number: INV-2024-1004
Date: January 22, 2024
Vendor: Office Depot
Amount: $892.45
Status: New
Items: Stationery, Printer Supplies`,
      },
      {
        id: "INV-2024-1005",
        vendor: "CloudHost Services",
        amount: 2100.0,
        date: "2024-01-25",
        status: "pending",
        rawData: `INVOICE
Invoice Number: INV-2024-1005
Date: January 25, 2024
Vendor: CloudHost Services
Amount: $2,100.00
Status: Pending
Items: Monthly Hosting, Cloud Storage`,
      },
    ]

    setLiveInvoices(mockLiveInvoices)
    setIsLoadingInvoices(false)
  }

  useEffect(() => {
    if (liveInvoiceSource === "erp" && liveInvoices.length === 0) {
      loadLiveInvoices()
    }
  }, [liveInvoiceSource])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      try {
        const data = JSON.parse(content)
        if (Array.isArray(data)) {
          setLiveInvoices(data)
        } else {
          setLiveInvoices([data])
        }
      } catch {
        setLiveInvoices([
          {
            id: "uploaded-" + Date.now(),
            vendor: "Unknown",
            amount: 0,
            date: new Date().toISOString().split("T")[0],
            status: "uploaded",
            rawData: content,
          },
        ])
      }
    }
    reader.readAsText(file)
  }

  const handleSelectLiveInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    const invoice = liveInvoices.find((inv) => inv.id === invoiceId)
    if (invoice) {
      setTestInput(invoice.rawData)
      setSelectedInvoice(invoice) // Set selected invoice for decision log
    }
  }

  const handleSave = () => {
    const changes: string[] = []

    if (originalAgentData) {
      if (agentName !== originalAgentData.name) changes.push(`Name: "${originalAgentData.name}" → "${agentName}"`)
      if (stage !== originalAgentData.stage) changes.push(`Stage: "${originalAgentData.stage}" → "${stage}"`)
      if (lane !== originalAgentData.lane) changes.push(`Lane: "${originalAgentData.lane}" → "${lane}"`)
      if (agentMode !== originalAgentData.mode) changes.push(`Mode: "${originalAgentData.mode}" → "${agentMode}"`)
      if (prompt !== originalAgentData.prompt) changes.push("Prompt updated")
      if (JSON.stringify(activeSkills) !== JSON.stringify(originalAgentData.skills)) changes.push("Skills modified")
    } else {
      // If it's a new agent, mark as created
      if (!agent?.id) {
        changes.push("Agent created")
      }
    }

    const config: AgentConfig = {
      id: agent?.id || Date.now().toString(),
      name: agentName,
      stage,
      lane,
      mode: agentMode,
      prompt,
      skills: activeSkills,
      active: isActive,
      documents: agent?.documents || [],
    }

    onSave(config)

    addVersionEntry(agent?.id ? "edited" : "created", changes.length > 0 ? changes : ["Agent configuration saved"])

    setHasChanges(false)
    setOriginalAgentData({
      name: agentName,
      stage,
      lane,
      mode: agentMode,
      prompt,
      skills: activeSkills,
    })
  }

  const exportComparisonToCSV = () => {
    if (!comparisonMetrics || invoiceComparisons.length === 0) return

    // Build CSV content
    const headers = [
      "Invoice ID",
      "Vendor", 
      "Amount",
      "Has Issue",
      "Issue Description",
      "Without Agent - Outcome",
      "Without Agent - Time (min)",
      "Without Agent - Manual Touches",
      "With Agent - Action",
      "With Agent - Time (min)", 
      "With Agent - Manual Touches",
      "With Agent - Confidence",
      "Time Reduction (%)",
      "Touch Reduction",
      "Improvement Highlights",
    ]

    const rows = invoiceComparisons.map(comp => [
      comp.invoiceId,
      comp.vendor,
      comp.amount.toFixed(2),
      comp.hasIssue ? "Yes" : "No",
      comp.issueDescription || "None",
      comp.withoutAgent.outcome,
      comp.withoutAgent.processingTimeMinutes.toFixed(1),
      comp.withoutAgent.manualTouches,
      comp.withAgent.agentAction,
      comp.withAgent.processingTimeMinutes.toFixed(1),
      comp.withAgent.manualTouches,
      (comp.withAgent.agentConfidence * 100).toFixed(0) + "%",
      comp.improvement.timeReductionPercentage.toFixed(1) + "%",
      comp.improvement.manualTouchReduction,
      comp.improvement.highlights.join("; "),
    ])

    // Add summary rows
    rows.push([]) // Empty row
    rows.push(["SUMMARY"])
    rows.push(["Total Invoices", comparisonMetrics.exceptionsWithout + comparisonMetrics.exceptionsWith])
    rows.push(["Avg Time Without Agent", comparisonMetrics.avgProcessingTimeWithout.toFixed(1) + " min"])
    rows.push(["Avg Time With Agent", comparisonMetrics.avgProcessingTimeWith.toFixed(1) + " min"])
    rows.push(["Time Reduction", comparisonMetrics.timeReductionPercentage.toFixed(1) + "%"])
    rows.push(["Exceptions Without Agent", comparisonMetrics.exceptionsWithout])
    rows.push(["Exceptions With Agent", comparisonMetrics.exceptionsWith])
    rows.push(["Exception Reduction", comparisonMetrics.exceptionReductionPercentage.toFixed(1) + "%"])
    rows.push(["Auto-Resolved Count", comparisonMetrics.autoResolvedCount])
    rows.push(["Annual FTE Savings", comparisonMetrics.annualFTESavings.toFixed(2)])
    rows.push(["Annual Cost Savings", "$" + comparisonMetrics.annualCostSavings.toLocaleString()])

    // Convert to CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        // Escape quotes and wrap in quotes if needed
        const cellStr = String(cell)
        if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
          return '"' + cellStr.replace(/"/g, '""') + '"'
        }
        return cellStr
      }).join(","))
    ].join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `agent-comparison-${agentName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const runBulkTest = async () => {
    setIsTesting(true)
    setTestProgress(0)
    setTestResults([])
    setTestSummary(null)
    setComparisonMetrics(null)
    setInvoiceComparisons([])
    setCurrentPage(1)

    // Configure scenario generation
    const scenarioConfig: ScenarioConfig = {
      scenarioTypes: ["all"],
      issueMix: scenarioMix,
      stage: stage as Stage,
      lane: lane,
    }

    // Generate test scenarios
    const scenarios = generateTestScenarios(selectedTimePeriod as TimePeriod, scenarioConfig)
    
    // Configure agent for simulation
    const agentConfig: SimAgentConfig = {
      name: agentName,
      stage,
      lane,
      mode: agentMode,
      prompt,
      skills: activeSkills,
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
      
      // Also update testResults for backward compatibility with progress display
      setTestResults(prev => [...prev, ...batchComparisons])
    }

    // Calculate final statistics
    const { stats: finalBaselineStats } = simulateBaselineProcessingBatch(scenarios)
    const { stats: finalAgentStats } = simulateAgentProcessingBatch(scenarios, agentConfig)
    
    setBaselineStats(finalBaselineStats)
    setAgentStats(finalAgentStats)

    // Calculate comparison metrics
    const metrics = calculateComparisonMetrics(finalBaselineStats, finalAgentStats, scenarios.length)
    setComparisonMetrics(metrics)

    // Build summary for backward compatibility (if needed)
    setTestSummary({
      total: scenarios.length,
      passed: finalAgentStats.passed,
      failed: finalAgentStats.escalated + finalAgentStats.blocked,
      passRate: ((finalAgentStats.passed / scenarios.length) * 100).toFixed(1),
      avgProcessingTime: finalAgentStats.avgProcessingTimeMinutes.toFixed(0),
      avgConfidence: (finalAgentStats.avgConfidence * 100).toFixed(0),
      
      // Baseline comparison
      baselinePassed: finalBaselineStats.passed,
      baselineFailed: finalBaselineStats.blocked + finalBaselineStats.delayed + finalBaselineStats.errors,
      
      // Value metrics
      timeReduction: metrics.timeReductionPercentage.toFixed(0),
      exceptionReduction: metrics.exceptionReductionPercentage.toFixed(0),
      fteHoursSaved: metrics.fteHoursSaved.toFixed(1),
      annualFTESavings: metrics.annualFTESavings.toFixed(2),
    })

    setIsTesting(false)
  }

  const getFailureReason = (status: string) => {
    // Keeping for backward compatibility if needed
    const reasons: Record<string, string> = {
      missing_po: "PO reference missing or invalid",
      amount_mismatch: "Invoice amount doesn't match PO",
      duplicate: "Duplicate invoice detected",
      vendor_issue: "Vendor not in approved list",
      date_error: "Invoice date outside acceptable range",
    }
    return reasons[status] || "Validation failed"
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestOutput("")

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const output = {
      agent: agentName || "Unnamed Agent",
      stage,
      lane,
      input: testInput || "Sample invoice data",
      processing: {
        skills_used: activeSkills,
        prompt_applied: prompt.substring(0, 100) + "...",
      },
      result: {
        status: "success",
        extracted_data: {
          invoice_number: "INV-2024-001",
          date: "2024-01-15",
          total: "$1,234.56",
          vendor: "Acme Corp",
        },
        confidence: 0.95,
        next_stage: "Ready for next stage",
      },
    }

    setTestOutput(JSON.stringify(output, null, 2))
    setIsTesting(false)
  }

  const handleCloseTestModal = () => {
    setInternalShowTestModal(false)
    setSelectedInvoice(null) // Clear selected invoice when closing modal
    
    // Reset all test state so parameters need to be selected again
    setTestResults([])
    setTestSummary(null)
    setComparisonMetrics(null)
    setInvoiceComparisons([])
    setBaselineStats(null)
    setAgentStats(null)
    setSelectedTimePeriod("7days")
    setScenarioMix(40)
    setStatusFilter("all")
    setCurrentPage(1)
    setIsTesting(false)
    setTestProgress(0)
    
    if (onCloseTest) {
      onCloseTest()
    }
  }

  const sampleInvoices = {
    simple: `Invoice #INV-2024-001
Date: January 15, 2024
From: Acme Corporation
Total: $1,234.56
Items: Office Supplies`,
    detailed: `INVOICE
Invoice Number: INV-2024-002
Date: January 20, 2024
Due Date: February 20, 2024

Bill To: XYZ Company
123 Business St, City, State 12345

Items:
1. Premium Widget - Qty: 10 - $50.00 each = $500.00
2. Standard Service - Qty: 5 - $100.00 each = $500.00

Subtotal: $1,000.00
Tax (10%): $100.00
Total: $1,100.00`,
  }

  const parsePromptToCode = (promptText: string) => {
    if (!promptText) return null

    const sections: Record<string, string> = {}
    const lines = promptText.split("\n")
    let currentSection = ""
    let currentContent: string[] = []

    lines.forEach((line) => {
      if (line.match(/^(Role|Inputs|Steps|Validations|Output|Error Handling):/i)) {
        if (currentSection && currentContent.length > 0) {
          sections[currentSection] = currentContent.join("\n").trim()
        }
        const match = line.match(/^([^:]+):(.*)/)
        if (match) {
          currentSection = match[1].trim()
          currentContent = match[2].trim() ? [match[2].trim()] : []
        }
      } else if (currentSection && line.trim()) {
        currentContent.push(line)
      }
    })

    if (currentSection && currentContent.length > 0) {
      sections[currentSection] = currentContent.join("\n").trim()
    }

    return Object.keys(sections).length > 0 ? sections : null
  }

  const generateCodeView = () => {
    const parsed = parsePromptToCode(prompt)

    const role = parsed?.["Role"] || parsed?.["role"] || "Process invoice data"
    const inputs = parsed?.["Inputs"] || parsed?.["inputs"] || "invoice data from ERP"
    const steps = parsed?.["Steps"] || parsed?.["steps"] || "process and validate data"
    const validations = parsed?.["Validations"] || parsed?.["validations"] || "validate data integrity"
    const output = parsed?.["Output"] || parsed?.["output"] || "processed results"
    const errorHandling = parsed?.["Error Handling"] || parsed?.["error handling"] || "flag exceptions for review"

    return `agent:
  id: ${agentName.toLowerCase().replace(/\s+/g, "_") || "untitled_agent"}
  name: "${agentName || "Untitled Agent"}"
  purpose: "${role}"

inputs:
  invoice:
    source: erp
    required_fields:
      - invoice_id
      - supplier_id
      - currency
      - invoice_date
      ${inputs.toLowerCase().includes("po") ? "- po_reference" : ""}
      - lines[].line_id
      - lines[].description
      - lines[].quantity
      - lines[].unit_price
      - lines[].line_amount
  ${
    inputs.toLowerCase().includes("po") || inputs.toLowerCase().includes("purchase order")
      ? `purchase_order:
    source: erp
    required_fields:
      - po_id
      - supplier_id
      - currency
      - po_date
      - lines[].po_line_id
      - lines[].description
      - lines[].quantity
      - lines[].unit_price
      - lines[].line_amount`
      : ""
  }

skills:
  allowed:
    ${selectedSkills.length > 0 ? selectedSkills.map((t) => `- ${t.toLowerCase().replace(/\s+/g, "_")}`).join("\n    ") : "- verify_data\n    - connect_to_erp_system"}
  constraints:
    max_tool_calls: 10
    timeout_seconds: 30

processing:
  stage: ${stage || "ingestion"}
  priority: normal
  
  strategy:
    description: |
      ${steps
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s)
        .join("\n      ")}
    
    rules:
      ${
        steps.toLowerCase().includes("match")
          ? `- name: exact_match
        enabled: true
        tolerance_pct: 0.0
      
      - name: fuzzy_match
        enabled: true
        similarity_min: 0.85`
          : `- name: process_sequential
        enabled: true`
      }

validations:
  ${
    validations
      .split("\n")
      .map((v, idx) => {
        const validation = v.trim()
        if (!validation) return ""
        return `- id: v_${idx + 1}
    severity: ${validation.toLowerCase().includes("require") || validation.toLowerCase().includes("must") ? "block" : "warn"}
    check: ${validation}
    reason_code: VALIDATION_${idx + 1}_FAILED`
      })
      .filter((v) => v)
      .join("\n  ") ||
    `- id: v_data_integrity
    severity: block
    check: all required fields present
    reason_code: MISSING_REQUIRED_FIELD
  
  - id: v_data_format
    severity: warn
    check: data formats are valid
    reason_code: INVALID_FORMAT`
  }

outputs:
  contract:
    return:
      - invoice_id
      - processing_status
      ${
        output.toLowerCase().includes("match")
          ? `- matches[]:
          invoice_line_id: string
          matched_id: string
          confidence: number
      - exceptions[]:
          line_id: string
          exception_type: string
          reason_code: string
          details: object`
          : `- results[]:
          field_name: string
          value: any
          confidence: number`
      }
      - recommendation:
          action: enum["POST", "FLAG", "REVIEW"]
          reason_codes: string[]

decision:
  default_action: ${errorHandling.toLowerCase().includes("post") ? "POST" : "FLAG"}
  post_when:
    - condition: "validations.all_passed == true"
    - condition: "confidence >= 0.90"
  flag_when:
    - condition: "any(blocking_validation_failed)"
    ${errorHandling.toLowerCase().includes("exception") ? `- condition: "exceptions.count > 0"` : ""}
    - condition: "confidence < 0.90"
  review_when:
    - condition: "warnings.count > 0"
    - condition: "manual_review_required == true"

error_handling:
  ${
    errorHandling
      .split("\n")
      .map((e, idx) => {
        const error = e.trim()
        if (!error) return ""
        const action = error.toLowerCase().includes("flag")
          ? "FLAG"
          : error.toLowerCase().includes("post")
            ? "POST"
            : "REVIEW"
        return `on_error_${idx + 1}:
    action: ${action}
    description: ${error}
    reason_code: ERROR_${idx + 1}`
      })
      .filter((e) => e)
      .join("\n  ") ||
    `on_validation_error:
    action: FLAG
    reason_code: VALIDATION_ERROR
  
  on_processing_error:
    action: FLAG
    reason_code: PROCESSING_ERROR
  
  on_tool_error:
    action: REVIEW
    reason_code: TOOL_ERROR`
  }

audit:
  record:
    - fired_rules
    - validation_results
    - processing_steps
    - tool_calls
    - final_recommendation
    - execution_time_ms

configuration:
  lane: ${lane || "N/A"}
  stage: ${stage || "ingestion"}
  
status: ${isActive ? "active" : "inactive"}`
  }

  const AVAILABLE_SKILLS = [
    "Extract text",
    "Process Documents",
    "Verify Data",
    "Find Purchase Orders",
    "Intelligent Matching",
    "Flag Issues",
    "Connect to ERP System",
    "Run Workflows",
    "Route for Approval",
    "Send Messages",
    "Map to General Ledger",
    "Find Vendor Information",
  ]

  const getModeStyles = (mode: "observe" | "suggest" | "auto-apply") => {
    switch (mode) {
      case "observe":
        return {
          bg: "bg-blue-50 dark:bg-blue-950/20",
          border: "border-blue-200 dark:border-blue-900",
          text: "text-blue-700 dark:text-blue-300",
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100",
        }
      case "suggest":
        return {
          bg: "bg-yellow-50 dark:bg-yellow-950/20",
          border: "border-yellow-300 dark:border-yellow-900",
          text: "text-yellow-800 dark:text-yellow-300",
          badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        }
      case "auto-apply":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          border: "border-red-200 dark:border-red-900",
          text: "text-red-700 dark:text-red-300",
          badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100",
        }
    }
  }

  const getModeDescription = (mode: "observe" | "suggest" | "auto-apply") => {
    switch (mode) {
      case "observe":
        return "Shadow mode - Agent observes without affecting the workflow"
      case "suggest":
        return "Suggestion mode - Agent highlights fields and provides recommendations"
      case "auto-apply":
        return "Critical mode - Agent automatically applies decisions"
    }
  }

  const currentModeStyles = getModeStyles(agentMode)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false) // Added delete confirmation state

  const handleDelete = () => {
    if (agent?.id && onDelete) {
      onDelete(agent.id)
      setShowDeleteConfirm(false)
    }
  }

  const generateDecisionTimeline = (invoice: any) => {
    const baseTime = new Date()
    baseTime.setHours(baseTime.getHours() - Math.floor(Math.random() * 24))

    const timeline: Array<{
      timestamp: Date
      agent: string
      stage: string
      action: string
      outcome: "passed" | "failed" | "referred" | "processed"
      details: string
      confidence?: string
      fieldsAffected?: string[]
    }> = []

    // Ingestion stage
    const ingestionTime = new Date(baseTime)
    timeline.push({
      timestamp: ingestionTime,
      agent: "Invoice Ingestion Agent",
      stage: "Ingestion",
      action: "Document Received",
      outcome: "processed",
      details: `PDF format validated, ${Math.floor(Math.random() * 3) + 1} pages detected`,
      confidence: "98%",
    })

    // Data Capture stage
    const captureTime = new Date(ingestionTime.getTime() + 1200)
    timeline.push({
      timestamp: captureTime,
      agent: "OCR Extraction Agent",
      stage: "Data Capture",
      action: "Text Extraction",
      outcome: "processed",
      details: `OCR completed with ${(Math.random() * 5 + 94).toFixed(1)}% confidence`,
      confidence: `${(Math.random() * 5 + 94).toFixed(1)}%`,
      fieldsAffected: ["raw_text", "document_type"],
    })

    const mappingTime = new Date(captureTime.getTime() + 800)
    timeline.push({
      timestamp: mappingTime,
      agent: "Field Mapping Agent",
      stage: "Data Capture",
      action: "Field Extraction",
      outcome: "processed",
      details: `Extracted ${Math.floor(Math.random() * 5) + 10} fields including vendor, amount, PO#`,
      fieldsAffected: ["vendor_name", "invoice_amount", "po_number", "invoice_date", "line_items"],
    })

    // Verification stage
    const verifyTime = new Date(mappingTime.getTime() + 1500)
    const duplicateCheck = Math.random() > 0.1
    timeline.push({
      timestamp: verifyTime,
      agent: "Duplicate Detection Agent",
      stage: "Verification",
      action: "Duplicate Check",
      outcome: duplicateCheck ? "passed" : "failed",
      details: duplicateCheck ? "No duplicates found in last 90 days" : "Potential duplicate of INV-2024-0892 detected",
      confidence: duplicateCheck ? "100%" : "87%",
    })

    // If invoice failed, show where it failed
    if (!invoice.passed) {
      const failTime = new Date(verifyTime.getTime() + 2000)
      timeline.push({
        timestamp: failTime,
        agent: agent?.name || "Current Agent",
        stage: stages.find((s) => s.id === stage)?.name || "Verification",
        action: "Validation Failed",
        outcome: "failed",
        details: invoice.reason || "Validation rule not met",
        fieldsAffected: ["validation_status"],
      })

      // Referred to HITL
      const referTime = new Date(failTime.getTime() + 500)
      timeline.push({
        timestamp: referTime,
        agent: "Exception Manager",
        stage: "HITL Queue",
        action: "Referred for Review",
        outcome: "referred",
        details: `Action taken: ${invoice.action || "Flag for manual review"}`,
        fieldsAffected: ["review_status", "assigned_reviewer"],
      })
    } else {
      // Successful path continues
      const matchTime = new Date(verifyTime.getTime() + 2000)
      timeline.push({
        timestamp: matchTime,
        agent: "PO Matching Agent",
        stage: "Verification",
        action: "PO Match",
        outcome: "passed",
        details: `Matched to PO-${Math.floor(Math.random() * 9000) + 1000} with 98% confidence`,
        confidence: "98%",
        fieldsAffected: ["matched_po", "match_confidence"],
      })

      // Approval stage
      const approvalTime = new Date(matchTime.getTime() + 3000)
      timeline.push({
        timestamp: approvalTime,
        agent: "Approval Decision Agent",
        stage: "Approval",
        action: agentMode === "auto-apply" ? "Auto-Approved" : "Approval Recommended",
        outcome: "passed",
        details: `Amount $${invoice.amount} within auto-approval threshold`,
        fieldsAffected: ["approval_status", "approved_by"],
      })

      // Posting stage
      if (agentMode === "auto-apply") {
        const postTime = new Date(approvalTime.getTime() + 1000)
        timeline.push({
          timestamp: postTime,
          agent: "GL Posting Agent",
          stage: "Posting",
          action: "Posted to ERP",
          outcome: "processed",
          details: `GL entries created: Debit 6100-00, Credit 2100-00`,
          fieldsAffected: ["gl_entry_id", "posting_date", "posting_status"],
        })
      }
    }

    return timeline
  }

  const formatTimelineTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-background">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 m-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">Delete Agent</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Are you sure you want to delete "{agent?.name}"? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Delete Agent
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Test Modal */}
      {internalShowTestModal && (
        <div className="fixed inset-0 bg-background z-[10000] flex flex-col">
          <Card className="w-full h-full overflow-hidden flex flex-col border-0 rounded-none shadow-none">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Test Agent on historic ERP Data</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Simulate running {agentName || "this agent"} against historical invoice data
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
                        <span className="font-bold text-xl">7 days </span>
                        <span className="text-xs">Days (~1,500 invoices)</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "30days" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("30days")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">30 days </span>
                        <span className="text-xs">Days (~6,200 invoices)</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "3months" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("3months")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">3 months </span>
                        <span className="text-xs">Months (~18,500 invoices)</span>
                      </Button>
                      <Button
                        variant={selectedTimePeriod === "6months" ? "default" : "outline"}
                        onClick={() => setSelectedTimePeriod("6months")}
                        className="h-20 flex flex-col items-center justify-center"
                      >
                        <span className="font-bold text-xl">6 months </span>
                        <span className="text-xs">Months (~37,000 invoices)</span>
                      </Button>
                    </div>
                  </div>

                  <Card className="p-4 bg-muted/50">
                    <h4 className="font-semibold mb-2">Test Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Agent:</span>
                        <span className="font-medium">{agentName || "Unnamed Agent"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stage:</span>
                        <span className="font-medium capitalize">{stage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lane:</span>
                        <span className="font-medium">{lane}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mode:</span>
                        <span className="font-medium capitalize">{agentMode === "auto-apply" ? "Auto-Apply" : agentMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Skills:</span>
                        <span className="font-medium">{activeSkills.length} selected</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-semibold">Scenario Mix</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adjust the percentage of invoices with issues to test agent effectiveness
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {scenarioMix}% with issues, {100 - scenarioMix}% clean
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={scenarioMix}
                          onChange={(e) => setScenarioMix(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-900"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>All Clean</span>
                          <span>Balanced</span>
                          <span>All Issues</span>
                        </div>
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

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">Invoice-by-Invoice Comparison</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Agent actions: <span className="text-purple-700">✓ No human needed</span> • <span className="text-yellow-700">→ Review needed</span> • <span className="text-gray-600">○ Flagged only</span> • <span className="text-yellow-700">↑ Manual required</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={(value: any) => {
                          setStatusFilter(value)
                          setCurrentPage(1) // Reset to page 1 when filter changes
                        }}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent className="z-[10001]">
                            <SelectItem value="all">All Invoices</SelectItem>
                            <SelectItem value="pass">Improved Only</SelectItem>
                            <SelectItem value="fail">Issues Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={exportComparisonToCSV} disabled={!comparisonMetrics}>
                          Export CSV
                        </Button>
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
                              if (statusFilter === "all") return true
                              if (statusFilter === "pass") return comparison.improvement.outcome === "better"
                              if (statusFilter === "fail") return comparison.hasIssue
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
                                      comparison.withoutAgent.outcome === "passed" ? "bg-green-100 text-green-700" : 
                                      comparison.withoutAgent.outcome === "blocked" ? "bg-red-100 text-red-700" :
                                      comparison.withoutAgent.outcome === "delayed" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-gray-100 text-gray-700"
                                    }`}>
                                      {comparison.withoutAgent.outcome}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{comparison.withoutAgent.processingTimeMinutes.toFixed(0)}min • {comparison.withoutAgent.manualTouches} touch{comparison.withoutAgent.manualTouches !== 1 ? 'es' : ''}</span>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="flex flex-col gap-1">
                                    <span className={`text-xs px-1.5 py-0.5 rounded inline-block ${
                                      comparison.withAgent.outcome === "passed" ? "bg-purple-100 text-purple-700" : 
                                      comparison.withAgent.outcome === "escalated" ? "bg-yellow-100 text-yellow-700" :
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
                        if (statusFilter === "all") return true
                        if (statusFilter === "pass") return comparison.improvement.outcome === "better"
                        if (statusFilter === "fail") return comparison.hasIssue
                        return true
                      })
                      const totalPages = Math.max(1, Math.ceil(filteredResults.length / rowsPerPage))
                      const startIndex = filteredResults.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0
                      const endIndex = Math.min(currentPage * rowsPerPage, filteredResults.length)

                      return (
                        <>
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-xs text-muted-foreground">
                              {filteredResults.length > 0 ? (
                                <>
                                  Showing {startIndex.toLocaleString()} - {endIndex.toLocaleString()} of{" "}
                                  {filteredResults.length.toLocaleString()} invoices
                                  {statusFilter !== "all" && ` (${statusFilter === "pass" ? "improved" : "with issues"})`}
                                </>
                              ) : (
                                <>No invoices match the selected filter</>
                              )}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1 || filteredResults.length === 0}
                              >
                                First
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1 || filteredResults.length === 0}
                              >
                                Previous
                              </Button>
                              <span className="text-xs text-muted-foreground px-2">
                                Page {filteredResults.length > 0 ? currentPage : 0} of {filteredResults.length > 0 ? totalPages : 0}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages || filteredResults.length === 0}
                              >
                                Next
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages || filteredResults.length === 0}
                              >
                                Last
                              </Button>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </Card>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        setTestResults([])
                        setTestSummary(null)
                        setComparisonMetrics(null)
                        setInvoiceComparisons([])
                        setBaselineStats(null)
                        setAgentStats(null)
                        setStatusFilter("all")
                        setCurrentPage(1)
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Run New Test
                    </Button>
                    <Button
                      onClick={exportComparisonToCSV}
                      disabled={!comparisonMetrics}
                      variant="outline"
                      className="flex-1"
                    >
                      Export Full Report
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {showDecisionLog && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10001] p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
              <div>
                <h3 className="font-semibold text-lg">Invoice Decision Log</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedInvoice.id} | {selectedInvoice.vendor} | ${selectedInvoice.amount}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedInvoice.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedInvoice.passed ? "Passed" : "Failed"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setShowDecisionLog(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-0">
                {generateDecisionTimeline(selectedInvoice).map((event, index, arr) => (
                  <div key={index} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          event.outcome === "passed"
                            ? "bg-green-500 border-green-500"
                            : event.outcome === "failed"
                              ? "bg-red-500 border-red-500"
                              : event.outcome === "referred"
                                ? "bg-amber-500 border-amber-500"
                                : "bg-blue-500 border-blue-500"
                        }`}
                      />
                      {index < arr.length - 1 && <div className="w-0.5 h-full min-h-[60px] bg-border" />}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{event.action}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs ${
                                event.outcome === "passed"
                                  ? "bg-green-100 text-green-700"
                                  : event.outcome === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : event.outcome === "referred"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {event.outcome.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.agent} • {event.stage}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-muted-foreground">
                            {formatTimelineTime(event.timestamp)}
                          </p>
                          {event.confidence && (
                            <p className="text-xs text-muted-foreground">Confidence: {event.confidence}</p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mt-2">{event.details}</p>

                      {event.fieldsAffected && event.fieldsAffected.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {event.fieldsAffected.map((field, fIdx) => (
                            <span key={fIdx} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                              {field}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-muted/30">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Total processing time: {(Math.random() * 5 + 2).toFixed(2)}s
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowDecisionLog(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {" "}
        {/* CHANGED max-w-6xl to max-w-4xl */}
        {/* Header */}
        <div className={isPreview ? "space-y-4" : "flex items-center justify-between mb-6"}>
          <div>
            <h2 className="text-2xl font-bold">
              {!agent?.id && !isPreview ? "Create Agent" : agent?.name || "Agent Configuration"}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              {(agent || editingAgent || agentName) && (
                <span className={`inline-flex items-center gap-1.5 text-sm ${
                  agentMode === "observe"
                    ? "text-blue-600 dark:text-blue-400"
                    : agentMode === "suggest"
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    agentMode === "observe" ? "bg-blue-500" : agentMode === "suggest" ? "bg-yellow-400" : "bg-red-500"
                  }`} />
                  {agentMode === "auto-apply" ? "Auto-Apply" : agentMode.charAt(0).toUpperCase() + agentMode.slice(1)}
                </span>
              )}
              {stage && (agent || editingAgent || agentName) && (
                <>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-sm text-muted-foreground">{stages.find(s => s.id === stage)?.name}</span>
                </>
              )}
              {lane && (agent || editingAgent || agentName) && (
                <>
                  <span className="text-muted-foreground text-sm">•</span>
                  <span className="text-sm text-muted-foreground">{lane}</span>
                </>
              )}
              {!(agent || editingAgent || agentName) && (
                <p className="text-sm text-muted-foreground">
                  {isPreview ? "Review agent configuration" : "Build and test your agent"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPreview && agent?.id && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (agent?.id) {
                      handleToggleActive()
                    }
                  }}
                  className={`gap-2 ${isActive ? "border-green-500 text-green-600" : ""}`}
                >
                  <Power className="w-4 h-4" />
                  {isActive ? "Active" : "Inactive"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 bg-transparent"
                  onClick={() => setInternalShowTestModal(true)}
                >
                  <Play className="w-5 h-5" />
                  Test
                </Button>
                <Button onClick={onEdit} variant="outline" className="gap-2 bg-transparent">
                  <Edit className="w-4 h-4" />
                  Edit Agent
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
        {conflicts.length > 0 && (
          <Card className="p-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100">
                    Potential Conflicts Detected ({conflicts.length})
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    This agent may conflict with other agents in your workflow. Review before deploying.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-3">
                {conflicts.map((conflict, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      conflict.severity === "high"
                        ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                        : conflict.severity === "medium"
                          ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
                          : "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          conflict.severity === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
                            : conflict.severity === "medium"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-100"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
                        }`}
                      >
                        {conflict.severity.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Conflicts with: {conflict.conflictingAgentName}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{conflict.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
        <div className="space-y-6">
          {/* Step 1: Design with AI */}
          {!isPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Design with AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">Describe what you want your agent to do</p>
                </div>
              </div>
              <Card ref={chatCardRef} className="p-0 overflow-hidden flex flex-col" style={{ height: "600px" }}>
                <ChatInterface
                onPromptGenerated={handlePromptGenerated}
                onStageDetected={(detectedStage) => {
                  console.log("[AgentBuilder] Stage detected by AI:", detectedStage)
                  isAIGeneratingRef.current = true // Mark AI generation in progress
                  setStage(detectedStage)
                }}
                onLaneDetected={(detectedLane) => {
                  console.log("[AgentBuilder] Lane detected by AI:", detectedLane)
                  setLane(detectedLane)
                }}
                currentPrompt={prompt}
                agentId={agent?.id || "new"}
                currentAgent={currentAgent}
              />
            </Card>
            </div>
          )}

          {/* Step 2: Configure */}
          {!isPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  prompt ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100" : "bg-muted text-muted-foreground"
                }`}>
                  {prompt ? "✓" : "2"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Configure Agent</h3>
                  <p className="text-sm text-muted-foreground">Set deployment stage, lane, and behavior mode</p>
                </div>
              </div>
              <Card className="p-6">
            <h3 className="text-lg font-medium mb-6">Configuration</h3>
            <div className="space-y-6">
              {/* Agent Identity */}
              <div>
                <Label htmlFor="agent-name" className="text-sm font-medium">
                  Agent Name
                </Label>
                <Input
                  ref={nameInputRef}
                  id="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="e.g., Invoice Ingestion Agent"
                  disabled={isPreview}
                  className="mt-2"
                />
              </div>

              {/* Deployment Configuration */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Deployment</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="stage" className="text-sm font-medium">
                      Stage
                    </Label>
                    <Select value={stage} onValueChange={setStage} disabled={isPreview}>
                      <SelectTrigger id="stage" className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="lane" className="text-sm font-medium">
                      Lane
                    </Label>
                    <Select value={lane} onValueChange={setLane} disabled={isPreview}>
                      <SelectTrigger id="lane" className="mt-2">
                        <SelectValue placeholder="Select a lane" />
                      </SelectTrigger>
                      <SelectContent>
                        {stage && STAGE_LANES[stage]?.map((laneOption) => (
                          <SelectItem key={laneOption} value={laneOption}>
                            {laneOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Behavior Configuration */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Behavior</div>
                <div>
                  <Label htmlFor="agent-mode" className="text-sm font-medium">
                    Mode
                  </Label>
                  <Select value={agentMode} onValueChange={(value: any) => setAgentMode(value)} disabled={isPreview}>
                    <SelectTrigger id="agent-mode" className="mt-2">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${agentMode === "observe" ? "bg-blue-500" : agentMode === "suggest" ? "bg-yellow-400" : "bg-red-500"}`}
                          />
                          <span className="capitalize">{agentMode === "auto-apply" ? "Auto-Apply" : agentMode}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="observe">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Observe</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="suggest">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-400" />
                          <span>Suggest</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="auto-apply">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span>Auto-Apply</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className={`text-xs mt-2 flex items-center gap-1.5 ${
                    agentMode === "observe"
                      ? "text-blue-600 dark:text-blue-400"
                      : agentMode === "suggest"
                      ? "text-yellow-700 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                  }`}>
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${agentMode === "observe" ? "bg-blue-500" : agentMode === "suggest" ? "bg-yellow-400" : "bg-red-500"}`}
                    />
                    {getModeDescription(agentMode)}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-border">
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={!agentName || !stage || !prompt} className="gap-2">
                    <Save className="w-4 h-4" />
                    Save Agent
                  </Button>
                </div>
              </div>
            </div>
          </Card>
            </div>
          )}

          {/* Step 3: Review (shown in preview mode) */}
          {isPreview && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  agent?.active 
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {agent?.active ? "✓" : "○"}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {agent?.active ? "Agent Active" : "Agent Inactive"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {agent?.active 
                      ? "Review configuration and monitor performance" 
                      : "This agent is saved but not yet activated"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prompt and Skills are now rendered in the right sidebar in AgentBuilderPage */}

          {/* Version History Section */}
          {agent?.id && versionHistory.length > 0 && (
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Version History</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Track all changes and roll back to previous versions if needed
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {versionHistory.map((entry, index) => (
                  <Card
                    key={entry.id}
                    className={`p-4 transition-colors ${
                      selectedVersion === entry.id ? "border-primary bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              entry.action === "created"
                                ? "bg-green-100 text-green-700"
                                : entry.action === "edited"
                                  ? "bg-blue-100 text-blue-700"
                                  : entry.action === "activated"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {entry.action === "created"
                              ? "Created"
                              : entry.action === "edited"
                                ? "Edited"
                                : entry.action === "activated"
                                  ? "Activated"
                                  : "Deactivated"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {index === 0 ? "Latest" : `Version ${versionHistory.length - index}`}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="font-medium">{entry.editor}</span>
                          <span className="text-muted-foreground mx-1">•</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(entry.timestamp).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {entry.changes.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {entry.changes.map((change, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>{change}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {index > 0 && !isPreview && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(entry.id)
                            handleRollback(entry.id)
                          }}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {versionHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No version history yet. Save changes to start tracking versions.
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
