"use client"

import { useEffect } from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { AgentBuilder } from "./AgentBuilder"
import { WorkflowVisualizer } from "./WorkflowVisualizer"
import { DocumentsLibrary } from "./DocumentsLibrary"
import Navigation from "@/app/components/Navigation"
import UserMenu from "@/app/components/UserMenu"
import { Plus, Pencil, ChevronDown, ChevronRight, Power, FileText } from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { Checkbox } from "@/app/components/ui/checkbox"
import ExecutiveDashboardClient from "@/app/components/executive-dashboard/ExecutiveDashboardClient"

type Mode = "chat" | "observe" | "build" | "executive-dashboard" | "documents"

export type AgentDocument = {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  filePath: string
}

export type Agent = {
  id: string
  name: string
  stage: string
  active: boolean
  mode?: "observe" | "suggest" | "auto-apply"
  prompt?: string
  lane?: string
  skills?: string[]
  documents?: AgentDocument[]
}

export type AgentMetrics = {
  evaluated: number
  actedOn: number
  referred: number
  createdDate: string
  lastRunDate: string | null
  avgRuntimeMs: number
  invoicesProcessed: number
}

export default function AgentBuilderPage() {
  const [mode, setMode] = useState<Mode>("observe")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Check URL for view parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    if (view === 'executive-dashboard') {
      setMode('executive-dashboard')
    }

    // Load agents from localStorage on client mount
    const stored = localStorage.getItem('agents')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAgents(parsed)
        }
      } catch (e) {
        console.error('Failed to parse stored agents:', e)
      }
    }
  }, [])

  // Initialize agents with mock data (consistent for SSR)
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "Document Format",
      stage: "ingestion",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Document Format Validation Agent - rejects invoices in Microsoft Word format

AGENT DESCRIPTION:
Reject invoices in Word format

AGENT INSTRUCTIONS:

1. If any invoice is received in Microsoft Word format (docx) format, automatically reject the invoice.
2. Send the following reject email:
3. Email template: <Incorrect invoice format>

INPUTS:
- Raw invoice documents (PDF, XLSX, CSV, PNG/JPG, DOCX)
- Document metadata (filename, sender, timestamp, file size, file extension)

STEPS:
1. Receive incoming document and check file format/extension
2. If document is in Microsoft Word format (.docx or .doc), immediately reject the invoice
3. Send rejection email using template "Incorrect invoice format"
4. Log rejection reason in audit trail
5. For all other supported formats (PDF, XLSX, CSV, PNG/JPG), proceed with normal processing
6. Assign unique document ID and timestamp for accepted documents
7. Route accepted documents to Data Capture stage

VALIDATIONS:
- File format must NOT be Microsoft Word (.docx or .doc)
- File size must not exceed 25MB
- Document must pass virus scan
- Document must not be corrupted or unreadable

OUTPUT:
- For Word format: Rejection email sent with "Incorrect invoice format" template
- For accepted formats: Document intake record with unique ID and routing to Data Capture stage

ERROR HANDLING:
- If file is Word format (.docx or .doc) → Automatically reject and send "Incorrect invoice format" email
- If file type unsupported (other than Word) → Reject with supported format list
- If file corrupted → Request resubmission
- If virus detected → Quarantine and alert security team`,
      lane: "File Triage",
      skills: ["Process Documents", "Send Messages"],
    },
    {
      id: "2",
      name: "OCR Agent",
      stage: "data-capture",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Optical Character Recognition and Field Extraction Agent - exclusively extracts structured data from invoice documents using OCR technology

INPUTS:
- Validated documents from Ingestion stage (PDF, XLSX, CSV, PNG/JPG)
- OCR engine output
- Vendor-specific extraction templates

STEPS:
1. Process document through OCR engine to extract all text and numbers
2. Identify and extract invoice header fields
3. Extract additional invoice details
4. Extract line items with all associated fields
5. Calculate confidence score for each extracted field
6. Flag fields with confidence < 85% for manual review

INVOICE HEADER FIELDS TO EXTRACT:
- invoice_number (required): Unique invoice identifier
- invoice_date (required): Date invoice was issued
- due_date (required): Payment due date
- vendor_name_snapshot: Vendor/supplier name
- po_numbers_cached: Purchase order number(s) referenced on invoice
- job_number: Job or reference number
- currency: Invoice currency code (e.g., USD, GBP, EUR)
- subtotal: Subtotal amount before tax
- tax_total: Total tax amount
- total: Final invoice total amount

ADDITIONAL INVOICE DETAILS TO EXTRACT:
Payment Section:
- payment_method: Method of payment (bank_transfer, check, credit_card, ach, wire, cash)
- terms_text: Payment terms text (e.g., "Net 30", "2/10 Net 30")
- vendor_address_snapshot: Billing address of vendor
- payment_bank_details: Bank information including:
  - bank_name: Name of bank
  - account_name: Account holder name
  - account_number: Bank account number
  - sort_code: Sort code (UK)
  - iban: International Bank Account Number
  - swift_bic: SWIFT/BIC code
  - routing_number: Routing number (US)

Coding Section:
- ledger: Ledger account classification
- cost_center: Cost center code
- gl_code: General ledger account code
- department: Department name
- accounting_notes: Additional accounting notes

LINE ITEMS FIELDS TO EXTRACT (for each line item):
- line_no: Line item number/sequence
- description: Item description
- qty: Quantity ordered/received
- uom: Unit of measure (e.g., EA, DAYS, HRS, KG)
- unit_price: Price per unit
- discount_amount: Discount amount if applicable
- net_amount: Net amount after discount
- tax_amount: Tax amount for line item
- line_total: Total amount for line item
- sku/product_code: SKU or product code
- po_line_id: Reference to matched purchase order line
- gr_line_id: Goods receipt line reference
- ses_line_id: SES line reference
- cost_center: Cost center for line item
- gl_account: GL account for line item
- project_code: Project code if applicable

VALIDATIONS:
- Invoice number must be present and non-empty
- Invoice date must be valid date format
- Due date must be valid date format and after invoice date
- Total amount must match sum of line items (subtotal + tax_total)
- OCR confidence for monetary amounts must exceed 85%
- All required header fields must be extracted
- Line items must have at minimum: description, quantity, unit_price, and net_amount

OUTPUT:
- Structured data object with all extracted fields organized by section (header, additional details, line items)
- Confidence scores per field (0-100%)
- List of fields requiring manual review (confidence < 85%)
- OCR extraction metadata (processing time, page count, quality metrics)

ERROR HANDLING:
- If OCR confidence < 70% for critical fields → Route to manual data entry
- If critical field missing (invoice_number, invoice_date, total) → Halt and flag for manual review
- If total mismatch > $5 or 1% → Flag calculation error for review
- If line item totals don't sum to invoice total → Flag for verification
- If date formats are inconsistent → Attempt normalization, flag if ambiguous`,
      lane: "OCR Extraction",
      skills: ["Extract text", "Verify Data"],
    },
    {
      id: "3",
      name: "High value invoices",
      stage: "verification",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: High Value Invoice Exception Agent - exclusively flags high value invoices for review

AGENT DESCRIPTION:
Flag high value invoices for review

AGENT INSTRUCTIONS:

1. If any invoice is above $10m, raise it as an exception for review

INPUTS:
- Extracted invoice data from OCR Agent stage
- Invoice total amount
- Currency information

STEPS:
1. Retrieve invoice total amount from extracted data
2. Convert to USD if invoice is in different currency (using current exchange rates)
3. Compare invoice total against $10,000,000 threshold
4. If invoice total exceeds $10,000,000, raise exception flag
5. Create exception record with invoice details and reason
6. Route invoice to exception review queue

VALIDATIONS:
- Invoice total must be a valid numeric value
- Currency conversion must use accurate exchange rates
- Exception flag must be raised for any invoice above $10,000,000 USD

OUTPUT:
- Exception status: Exception Raised / No Exception
- Exception reason: "Invoice value exceeds $10m threshold"
- Invoice total amount (in USD)
- Routing to exception review queue

ERROR HANDLING:
- If invoice total cannot be determined → Flag for manual review
- If currency conversion fails → Use invoice currency and flag for manual conversion
- If exception raised → Ensure invoice is routed to review queue and approver is notified`,
      lane: "Policy Checks",
      skills: ["Verify Data", "Flag Issues"],
    },
    {
      id: "4",
      name: "Bulk commodities tolerance",
      stage: "matching",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Bulk Commodities Matching Tolerance Agent - exclusively adjusts matching tolerance for perishable goods and foodstuffs

AGENT INSTRUCTIONS:

1. If a line item relates to perishable goods / food stuffs, increase the matching tolerance level to +/- 5%
2. Please convert all units of measure to KG for the calculation

INPUTS:
- Invoice line items from OCR Agent stage
- Purchase order line items
- Line item descriptions
- Quantities and units of measure
- Unit prices

STEPS:
1. Analyze each invoice line item description to identify if it relates to perishable goods or foodstuffs
2. Identify keywords and categories that indicate perishable goods (e.g., fresh produce, dairy, meat, seafood, frozen foods, beverages, etc.)
3. For line items identified as perishable goods/foodstuffs:
   a. Convert all units of measure to KG (kilograms) for both invoice and PO line items
   b. Apply conversion factors for common units (e.g., LBS to KG, OZ to KG, TON to KG, etc.)
   c. Increase matching tolerance to +/- 5% for quantity and price comparisons
4. For non-perishable line items, use standard matching tolerance (typically +/- 1-2%)
5. Perform matching comparison with adjusted tolerances
6. Flag any variances that exceed the applicable tolerance threshold

VALIDATIONS:
- Unit of measure conversion must be accurate (use standard conversion factors)
- Perishable goods identification must be based on description keywords and categories
- Tolerance adjustment must only apply to identified perishable goods/foodstuffs
- All quantity comparisons must use KG as the base unit for perishable goods

OUTPUT:
- Matching results with adjusted tolerances for perishable goods
- Unit conversions applied (original unit → KG)
- Tolerance level applied per line item (+/- 5% for perishables, standard for others)
- Variance calculations in KG
- Match status: Matched / Variance Within Tolerance / Variance Exceeds Tolerance

ERROR HANDLING:
- If unit of measure cannot be converted to KG → Flag for manual review
- If perishable goods identification is ambiguous → Apply conservative tolerance (+/- 3%)
- If conversion factor is unknown → Flag line item for manual conversion
- If matching fails due to conversion errors → Route to manual matching queue`,
      lane: "Tolerance Application",
      skills: ["Find Purchase Orders", "Intelligent Matching", "Verify Data"],
    },
    {
      id: "8",
      name: "Routing approval for IT spend",
      stage: "approval",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: IT Spend Approval Routing Agent - exclusively routes non-PO invoices for software and IT services to designated approver

AGENT INSTRUCTIONS:

If any non PO invoice relates to the procurement of software / IT services, route for approval to Thomas Eaton (thomas.eaton@xx.com)

INPUTS:
- Invoice data from previous stages
- Purchase order information (to determine if invoice is PO-backed or non-PO)
- Line item descriptions
- Vendor information
- Invoice category/classification

STEPS:
1. Check if invoice is PO-backed (has associated purchase order)
2. If invoice is non-PO (no purchase order), proceed to step 3; otherwise, skip routing
3. Analyze invoice line items and descriptions to identify software/IT services:
   - Software licenses, subscriptions, SaaS products
   - IT services (consulting, support, maintenance)
   - Cloud services, hosting, infrastructure
   - Software development, implementation services
   - IT hardware if bundled with services
   - Technology consulting and advisory services
4. Check vendor name and category for IT-related indicators
5. If invoice relates to software/IT services:
   a. Route invoice for approval to Thomas Eaton (thomas.eaton@xx.com)
   b. Set approver assignment in workflow
   c. Send notification to approver
   d. Log routing decision and reason
6. If invoice does not relate to software/IT services, continue with standard approval routing

VALIDATIONS:
- Invoice must be non-PO (no purchase order associated)
- Invoice must relate to software or IT services
- Approver email must be valid: thomas.eaton@xx.com
- Routing must be logged in audit trail

OUTPUT:
- Approval routing status: Routed to IT Approver / Standard Routing
- Assigned approver: Thomas Eaton (thomas.eaton@xx.com) for IT spend invoices
- Routing reason: "Non-PO invoice for software/IT services"
- Notification sent to approver

ERROR HANDLING:
- If invoice classification is ambiguous → Route to Thomas Eaton for review (better safe than miss IT spend)
- If approver email invalid → Flag for manual routing
- If routing fails → Retry routing, escalate if persistent failure
- If PO status unclear → Check PO lookup service, route to IT approver if non-PO`,
      lane: "Approver Routing",
      skills: ["Route for Approval", "Run Workflows", "Find Vendor Information", "Find Purchase Orders"],
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
      lane: "ERP Payload Creation",
      skills: ["Connect to ERP System", "Map to General Ledger"],
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
      lane: "Reconciliation",
      skills: ["Send Messages", "Run Workflows", "Connect to ERP System"],
    },
  ])

  // Save agents to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && agents.length > 0) {
      localStorage.setItem('agents', JSON.stringify(agents))
    }
  }, [agents])

  // Effect to auto-create new agent when switching to build mode with no agent selected
  useEffect(() => {
    if (mode === "build" && !editingAgent && !testingAgent) {
      console.log("[v0] Auto-creating new agent when entering build mode")
      handleCreateNewAgent()
    }
  }, [mode])

  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null)
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "3months">("7days")
  
  // State for Prompt and Skills to render in right sidebar
  const [currentPrompt, setCurrentPrompt] = useState<string>("")
  const [currentSkills, setCurrentSkills] = useState<string[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedYaml, setAdvancedYaml] = useState<string>("")
  
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

  const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetrics>>({})

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num)
  }

  // Generate metrics client-side only to avoid hydration issues
  useEffect(() => {
    const metrics: Record<string, AgentMetrics> = {}
    const baseMultiplier = dateRange === "7days" ? 1 : dateRange === "30days" ? 4.3 : 13

    agents.forEach((agent) => {
      // Only generate metrics for pre-loaded agents (IDs 1-7), not newly created ones
      if (agent.id && agent.id.length <= 2) {
        const baseEvaluated = Math.floor((Math.random() * 3000 + 1000) * baseMultiplier)
        const actedOnPercent = agent.mode === "auto-apply" ? 0.85 : agent.mode === "suggest" ? 0.6 : 0
        const actedOn = Math.floor(baseEvaluated * actedOnPercent)
        const referred = baseEvaluated - actedOn

        // Generate created date (30-90 days ago)
        const daysAgo = Math.floor(Math.random() * 60) + 30
        const createdDate = new Date()
        createdDate.setDate(createdDate.getDate() - daysAgo)

        // Generate last run date (within last 24 hours for active agents, null for inactive)
        let lastRunDate: string | null = null
        if (agent.active) {
          const hoursAgo = Math.floor(Math.random() * 24)
          const lastRun = new Date()
          lastRun.setHours(lastRun.getHours() - hoursAgo)
          lastRunDate = lastRun.toISOString()
        }

        // Generate average runtime (50ms-500ms range)
        const avgRuntimeMs = Math.floor(Math.random() * 450) + 50

        // Calculate invoices processed (assuming ~15 lines per invoice)
        const invoicesProcessed = Math.floor(baseEvaluated / 15)

        metrics[agent.id] = {
          evaluated: baseEvaluated,
          actedOn: actedOn,
          referred: referred,
          createdDate: createdDate.toISOString(),
          lastRunDate: lastRunDate,
          avgRuntimeMs: avgRuntimeMs,
          invoicesProcessed: invoicesProcessed,
        }
      }
    })

    setAgentMetrics(metrics)
  }, [agents, dateRange])

  // Save agent metrics to localStorage for Executive Dashboard
  useEffect(() => {
    if (Object.keys(agentMetrics).length > 0) {
      localStorage.setItem('agentMetrics', JSON.stringify(agentMetrics))
    }
  }, [agentMetrics])

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
      // Create new agent (ID should already be set from handleCreateNewAgent)
      const newAgent = {
        ...updatedAgent,
        id: updatedAgent.id || `agent-${Date.now()}`,
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
    // Generate ID upfront so documents can be stored immediately
    const newAgentId = `agent-${Date.now()}`
    setEditingAgent({ id: newAgentId, name: "", stage: "", active: false, mode: "observe", prompt: "", model: "", skills: [] }) // Added mode field
    setIsPreviewMode(false)
    setMode("build")
  }

  const handleCreateAgentForStage = (stageId: string) => {
    // Generate ID upfront so documents can be stored immediately
    const newAgentId = `agent-${Date.now()}`
    setEditingAgent({
      id: newAgentId,
      name: "",
      stage: stageId,
      active: false,
      mode: "observe",
      prompt: "",
      model: "",
      skills: [],
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

  const handlePromptGenerated = (generatedPrompt: string, skills: string[], documents?: AgentDocument[]) => {
    console.log("[AgentBuilderPage v7] handlePromptGenerated called with documents:", documents)
    setCurrentPrompt(generatedPrompt)
    setCurrentSkills(skills)
    if (editingAgent) {
      // Update the editing agent with the generated prompt, skills, and documents
      const updatedAgent = {
        ...editingAgent,
        prompt: generatedPrompt,
        skills: skills,
        documents: documents || editingAgent.documents || [],
      }
      console.log("[AgentBuilderPage v7] Updated agent documents:", updatedAgent.documents)
      setEditingAgent(updatedAgent)
    }
  }

  const handlePromptAndSkillsUpdate = (prompt: string, skills: string[], advancedYaml?: string) => {
    setCurrentPrompt(prompt)
    setCurrentSkills(skills)
    if (advancedYaml !== undefined) {
      setAdvancedYaml(advancedYaml)
    }
  }

  // Sync state when editing agent changes
  useEffect(() => {
    if (editingAgent) {
      setCurrentPrompt(editingAgent.prompt || "")
      setCurrentSkills(editingAgent.skills || [])
    } else {
      setCurrentPrompt("")
      setCurrentSkills([])
    }
  }, [editingAgent?.id, editingAgent?.prompt, editingAgent?.skills])

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
                    onClick={() => setMode("executive-dashboard")}
                    className={`${
                      mode === "executive-dashboard"
                        ? "bg-purple-900 text-white"
                        : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                    } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                    aria-current={mode === "executive-dashboard" ? "page" : undefined}
                  >
                    Dashboard
                  </button>
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
                  <button
                    onClick={() => setMode("documents")}
                    className={`${
                      mode === "documents"
                        ? "bg-purple-900 text-white"
                        : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                    } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                    aria-current={mode === "documents" ? "page" : undefined}
                  >
                    Documents
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
                    lane: (testingAgent || editingAgent)?.lane || ""
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
                  onPromptGenerated={handlePromptGenerated}
                  currentAgent={editingAgent}
                  onStateChange={handlePromptAndSkillsUpdate}
                />
              )}
              {mode === "executive-dashboard" && (
                <div className="w-full h-full overflow-y-auto">
                  <ExecutiveDashboardClient />
                </div>
              )}
              {mode === "documents" && (
                <div className="w-full h-full overflow-y-auto">
                  <DocumentsLibrary agents={agents} />
                </div>
              )}
            </div>

            {/* Right: Prompt and Skills */}
            {mode === "build" && (
              <div className="w-[480px] border-l border-border bg-card flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Agent Statistics - show for agents with metrics */}
                  {editingAgent?.id && agentMetrics[editingAgent.id] && (
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Lines Evaluated</div>
                          <div className="text-2xl font-bold">{formatNumber(agentMetrics[editingAgent.id].evaluated)}</div>
                          <div className="text-xs text-muted-foreground">Last 24 hours</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Lines Acted On</div>
                          <div className="text-2xl font-bold">{formatNumber(agentMetrics[editingAgent.id].actedOn)}</div>
                          <div className="text-xs text-muted-foreground">Last 24 hours</div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">Lines Referred</div>
                          <div className="text-2xl font-bold">{formatNumber(agentMetrics[editingAgent.id].referred)}</div>
                          <div className="text-xs text-muted-foreground">Last 24 hours</div>
                        </div>
                      </Card>
                    </div>
                  )}
                  
                  {/* Show stats pending message for saved agents without metrics */}
                  {editingAgent?.id && !agentMetrics[editingAgent.id] && isPreviewMode && (
                    <Card className="p-4 bg-muted/50">
                      <div className="flex items-start gap-3">
                        <div className="text-muted-foreground">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm text-muted-foreground">Stats will be shown once agent has been live for 24 hours</p>
                      </div>
                    </Card>
                  )}
                  
                  {/* Prompt Section */}
                  <Card className="p-6 flex flex-col" style={{ height: "600px" }}>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      {!isPreviewMode && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                          {showAdvanced ? "Basic view" : "Advanced view"}
                        </Button>
                      )}
                    </div>

                    {/* Referenced Documents Chips */}
                    {editingAgent?.documents && editingAgent.documents.length > 0 && (
                      <div className="mt-3 mb-3">
                        <span className="text-xs text-muted-foreground mb-2 block">Referenced Documents:</span>
                        <div className="flex flex-wrap gap-2">
                          {editingAgent.documents.map((doc) => (
                            <button
                              key={doc.id}
                              onClick={() => {
                                const link = document.createElement('a')
                                link.href = doc.filePath
                                link.download = doc.name
                                link.click()
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border rounded-md text-xs hover:bg-accent transition-colors group"
                              title="Click to download"
                            >
                              <FileText className="w-3 h-3 text-muted-foreground" />
                              <span className="max-w-[120px] truncate">{doc.name}</span>
                              <svg className="w-3 h-3 text-muted-foreground group-hover:text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!showAdvanced ? (
                      <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <Textarea
                          id="system-prompt"
                          value={currentPrompt}
                          readOnly
                          placeholder="Define the agent's behavior and instructions..."
                          className="font-mono text-sm bg-muted/50 cursor-not-allowed flex-1 resize-none"
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          This prompt defines how the agent will process data at its deployment stage. <strong>This field can only be updated using the "Apply to Prompt" button in the AI Configuration Assistant</strong> to ensure security and prevent malicious prompt injection.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <Textarea
                          value={advancedYaml}
                          readOnly
                          className="border rounded-lg p-4 bg-slate-950 text-green-400 font-mono text-xs whitespace-pre overflow-x-auto flex-1 resize-none cursor-not-allowed opacity-75"
                          disabled={true}
                          placeholder="# No prompt defined yet"
                        />
                        <p className="text-xs text-muted-foreground">
                          Advanced view shows detailed YAML configuration. <strong>This field can only be updated using the "Apply to Prompt" button in the AI Configuration Assistant</strong> to ensure security and prevent malicious prompt injection.
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Skills Section */}
                  <Card className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Available Skills</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {isPreviewMode ? "Skills enabled for this agent" : "Select the skills this agent can use during execution"}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABLE_SKILLS.map((skill) => (
                          <Card
                            key={skill}
                            className={`p-3 transition-colors ${
                              isPreviewMode ? "cursor-default" : "cursor-pointer hover:bg-accent"
                            } ${currentSkills.includes(skill) ? "border-primary bg-primary/5" : ""}`}
                            onClick={() => {
                              if (!isPreviewMode) {
                                const newSkills = currentSkills.includes(skill)
                                  ? currentSkills.filter((s) => s !== skill)
                                  : [...currentSkills, skill]
                                setCurrentSkills(newSkills)
                                // Update the agent if editing
                                if (editingAgent) {
                                  setEditingAgent({ ...editingAgent, skills: newSkills })
                                }
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={currentSkills.includes(skill)}
                                onCheckedChange={() => {
                                  if (!isPreviewMode) {
                                    const newSkills = currentSkills.includes(skill)
                                      ? currentSkills.filter((s) => s !== skill)
                                      : [...currentSkills, skill]
                                    setCurrentSkills(newSkills)
                                    // Update the agent if editing
                                    if (editingAgent) {
                                      setEditingAgent({ ...editingAgent, skills: newSkills })
                                    }
                                  }
                                }}
                                className="cursor-pointer"
                                disabled={isPreviewMode}
                              />
                              <span className="text-sm font-medium">{skill}</span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
