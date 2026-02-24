"use client"

import { useEffect, useRef } from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
import { AgentBuilder } from "./AgentBuilder"
import { AgentBuilder2 } from "./AgentBuilder2"
import { WorkflowVisualizer } from "./WorkflowVisualizer"
import { DocumentsLibrary } from "./DocumentsLibrary"
import { PromptFlowchart } from "./PromptFlowchart"
import Navigation from "@/app/components/Navigation"
import UserMenu from "@/app/components/UserMenu"
import { Plus, Pencil, ChevronDown, ChevronRight, ChevronLeft, Power, FileText, PanelLeftClose, PanelLeftOpen, Copy, Check } from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { Checkbox } from "@/app/components/ui/checkbox"
import ExecutiveDashboardClient from "@/app/components/executive-dashboard/ExecutiveDashboardClient"
import { clearInvoiceCache } from "@/app/services/agentInvoiceService"
import { useToast } from "@/app/components/ui/Toast"

type Mode = "chat" | "observe" | "build" | "build2" | "executive-dashboard" | "documents"

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

interface AgentBuilderPageProps {
  hideNavigation?: boolean;
  defaultMode?: Mode;
}

export default function AgentBuilderPage({ hideNavigation = false, defaultMode = "observe" }: AgentBuilderPageProps = {}) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('agentbuilder-mode')
      if (stored && ['observe', 'build', 'build2', 'executive-dashboard', 'documents'].includes(stored)) {
        return stored as Mode
      }
    }
    return defaultMode
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { showToast } = useToast()

  // Initialize agents from localStorage if available, otherwise use default agents
  const getInitialAgents = (): Agent[] => {
    const defaultAgents = [
    {
      id: "2",
      name: "OCR Agent",
      stage: "data-capture",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Optical Character Recognition and Field Extraction Agent - exclusively extracts structured data from invoice documents using OCR technology

INPUTS:
- Validated documents from Invoice Import stage (PDF, XLSX, CSV, PNG/JPG)
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

1. If any invoice is above $100k, raise it as an exception for review

INPUTS:
- Extracted invoice data from OCR Agent stage
- Invoice total amount
- Currency information

STEPS:
1. Retrieve invoice total amount from extracted data
2. Convert to USD if invoice is in different currency (using current exchange rates)
3. Compare invoice total against $100,000 threshold
4. If invoice total exceeds $100,000, raise exception flag
5. Create exception record with invoice details and reason
6. Route invoice to exception review queue

VALIDATIONS:
- Invoice total must be a valid numeric value
- Currency conversion must use accurate exchange rates
- Exception flag must be raised for any invoice above $100,000 USD

OUTPUT:
- Exception status: Exception Raised / No Exception
- Exception reason: "Invoice value exceeds $100k threshold"
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
    {
      id: "9",
      name: "TechSupply Customer Reference no. extraction",
      stage: "data-capture",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Customer Reference Number Extraction Agent - exclusively extracts the customer reference number from invoice data for TechSupply Solutions

INPUTS: Extracted invoice data from the Data Capture phase

STEPS:
1. Search the extracted invoice data for the customer reference number pattern (2 letters + 6 numbers)
2. Validate the extracted customer reference number to ensure it matches the expected format
3. If the customer reference number is found, output it in a structured format (e.g., JSON)

VALIDATIONS:
- The customer reference number should be in the format of 2 letters followed by 6 numbers
- The extracted number should be 8 characters long

OUTPUT: Extracted customer reference number in a structured format (e.g., JSON)

ERROR HANDLING:
- If the customer reference number is not found, flag the invoice for manual review
- If the extracted number does not match the expected format, log an error and notify the administrator

REFERENCED_DOCUMENTS: None`,
      lane: "Header vs Line Split",
      skills: ["Verify Data", "Find Vendor Information"],
    },
    {
      id: "10",
      name: "Bank details checker",
      stage: "verification",
      active: true,
      mode: "suggest",
      prompt: `ROLE: Bank Details Validation Agent - verifies vendor banking information for accuracy and fraud prevention

INPUTS:
- Invoice payment details from Data Capture phase
- Vendor master database with verified bank details
- Historical payment records

STEPS:
1. Extract bank account details from invoice (account number, sort code, IBAN, SWIFT/BIC)
2. Compare against verified vendor banking information in master database
3. Check for suspicious changes or mismatches
4. Validate format and checksums for IBAN, account numbers
5. Flag any discrepancies for manual review
6. Suggest correction if minor formatting issue detected

VALIDATIONS:
- Bank details must match vendor master record
- IBAN/SWIFT codes must pass checksum validation
- Account numbers must match expected format for country
- Flag if bank details changed recently (< 30 days)

OUTPUT:
- Validation status: "verified", "mismatch", or "suspicious"
- List of discrepancies if any found
- Suggested corrections for formatting issues

ERROR HANDLING:
- If bank details mismatch → Flag for manual verification
- If vendor not in master database → Request bank details verification
- If suspicious changes detected → Escalate to fraud team`,
      lane: "Data Quality",
      skills: ["Verify Data", "Find Vendor Information", "Flag Issues"],
    },
    ]
    
    // Client-side only - check localStorage and merge with defaults
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('agents')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check if pre-built agents (IDs "9", "10") exist in stored agents
            const missingAgents = []
            
            const hasTechSupplyAgent = parsed.some(a => a.id === "9")
            if (!hasTechSupplyAgent) {
              const techSupplyAgent = defaultAgents.find(a => a.id === "9")
              if (techSupplyAgent) {
                console.log('[AgentBuilderPage] Adding TechSupply agent to stored agents')
                missingAgents.push(techSupplyAgent)
              }
            }
            
            const hasBankDetailsAgent = parsed.some(a => a.id === "10")
            if (!hasBankDetailsAgent) {
              const bankDetailsAgent = defaultAgents.find(a => a.id === "10")
              if (bankDetailsAgent) {
                console.log('[AgentBuilderPage] Adding Bank details checker agent to stored agents')
                missingAgents.push(bankDetailsAgent)
              }
            }
            
            if (missingAgents.length > 0) {
              return [...parsed, ...missingAgents]
            }
            
            console.log('[AgentBuilderPage] Loaded agents from localStorage:', parsed.length)
            return parsed
          }
        }
      } catch (e) {
        console.error('[AgentBuilderPage] Failed to load agents from localStorage:', e)
      }
    }
    
    // Return default agents if localStorage is empty or on server
    console.log('[AgentBuilderPage] Using default agents')
    return defaultAgents
  }

  const [agents, setAgents] = useState<Agent[]>(getInitialAgents())
  
  // Restore editingAgent from sessionStorage if it exists (for handling remounts)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('agentbuilder-editing-agent')
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch (e) {
          console.error('Failed to parse editingAgent from sessionStorage:', e)
        }
      }
    }
    return null
  })

  // Check URL for view parameter on mount - ONLY RUN ONCE (use sessionStorage to persist across remounts)
  useEffect(() => {
    // Check sessionStorage to see if we've already processed the current URL params
    const currentUrl = window.location.href
    const processedKey = `agentbuilder-processed-${currentUrl}`
    const hasProcessed = sessionStorage.getItem(processedKey) === 'true'
    
    // If we've already processed these URL params, don't process again
    if (hasProcessed) {
      return;
    }
    
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    const agentName = params.get('agent')
    const isNewAgent = params.get('newAgent') === 'true'
    const modeParam = params.get('mode')
    
    // If creating a new agent from floating chat (priority check - do this first)
    if (isNewAgent) {
      const prompt = params.get('prompt') || ''
      const stage = params.get('stage') || 'data-capture'
      const agentMode = params.get('agentMode') || 'suggest'
      const skillsStr = params.get('skills') || ''
      const skills = skillsStr ? skillsStr.split(',').filter(s => s.trim()) : []
      const lane = params.get('lane') || 'Data Quality'
      
      console.log('[AgentBuilderPage] Creating new agent from URL params:', {
        stage,
        mode: agentMode,
        skillsCount: skills.length,
        lane,
        promptLength: prompt.length
      })
      
      // Create new agent with pre-filled data
      const newAgent: Agent = {
        id: Date.now().toString(),
        name: 'New Agent',
        stage: stage,
        mode: agentMode as 'auto-apply' | 'suggest' | 'observe',
        prompt: prompt,
        skills: skills,
        active: false,
        lane: lane
      }
      
      // DON'T clear URL params - let the sessionStorage flag prevent re-processing
      
      // CRITICAL: Save ALL state to storage BEFORE React state updates
      // This ensures state is available when component remounts (triggered by Settings page)
      const updatedAgents = [...agents, newAgent]
      if (typeof window !== 'undefined') {
        localStorage.setItem('agents', JSON.stringify(updatedAgents))
        sessionStorage.setItem('agentbuilder-editing-agent', JSON.stringify(newAgent))
        sessionStorage.setItem('agentbuilder-mode', 'build2')
        sessionStorage.setItem('agentbuilder-preview-mode', 'false')
      }
      
      // Now trigger React state updates (these may cause remounts, but storage is already saved)
      setAgents(updatedAgents)
      setEditingAgent(newAgent)
      setMode('build2')
      setIsPreviewMode(false)
      
      // Expand the relevant stage
      setExpandedStages(prev => {
        const newSet = new Set(prev)
        newSet.add(stage)
        return newSet
      })
      
      console.log('[AgentBuilderPage] New agent set, mode set to build2')
      
      // Mark URL as processed in sessionStorage to prevent re-processing on remounts
      sessionStorage.setItem(`agentbuilder-processed-${currentUrl}`, 'true')
      
      return // Don't process agent name parameter if we're creating new
    }
    
    // Check for explicit mode parameter in URL
    if (modeParam === 'executive-dashboard') {
      setMode('executive-dashboard')
      sessionStorage.setItem(`agentbuilder-processed-${currentUrl}`, 'true')
      return
    }
    
    // Legacy view parameter support
    if (view === 'executive-dashboard') {
      setMode('executive-dashboard')
      sessionStorage.setItem(`agentbuilder-processed-${currentUrl}`, 'true')
      return
    }
    
    // If agent parameter is provided, find and preview that agent
    if (agentName && agents.length > 0) {
      const agent = agents.find(a => a.name.toLowerCase().includes(agentName.toLowerCase()))
      if (agent) {
        setEditingAgent(agent)
        setIsPreviewMode(true)
        setMode('build2') // Use Agent Builder 2 UI
        // Expand the stage containing this agent
        if (agent.stage) {
          setExpandedStages(prev => {
            const newSet = new Set(prev)
            newSet.add(agent.stage)
            return newSet
          })
        }
        sessionStorage.setItem(`agentbuilder-processed-${currentUrl}`, 'true')
      }
    }
  }, [agents])

  // Save agents to localStorage and sync to server whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && agents.length > 0) {
      console.log('[AgentBuilderPage] Saving agents to localStorage:', agents.length, 'agents')
      localStorage.setItem('agents', JSON.stringify(agents))
      
      // Clear invoice cache when agents change (force regeneration)
      try {
        clearInvoiceCache()
        console.log('[AgentBuilderPage] Invoice cache cleared after agent update')
      } catch (e) {
        console.warn('[AgentBuilderPage] Could not clear invoice cache:', e)
      }
      
      // Sync active agents to server for invoice generation
      const activeAgents = agents
        .filter(a => a.active)
        .map(a => ({
          name: a.name,
          stage: a.stage,
          lane: a.lane,
          mode: a.mode || 'observe',
          prompt: a.prompt || '',
          skills: a.skills || []
        }))
      
      console.log('[AgentBuilderPage] Syncing active agents to server:', activeAgents.length)
      
      // Fire-and-forget sync to server
      fetch('/api/agents/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents: activeAgents })
      })
        .then(() => console.log('[AgentBuilderPage] Successfully synced agents to server'))
        .catch(err => console.error('[AgentBuilderPage] Failed to sync agents to server:', err))
    }
  }, [agents])

  // Effect to auto-create new agent when switching to build mode with no agent selected
  useEffect(() => {
    if (mode === "build" && !editingAgent && !testingAgent) {
      console.log("[v0] Auto-creating new agent when entering build mode")
      handleCreateNewAgent()
    }
  }, [mode])

  const [isPreviewMode, setIsPreviewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('agentbuilder-preview-mode')
      return stored === 'true'
    }
    return false
  })
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null)
  const [dateRange, setDateRange] = useState<"7days" | "30days" | "3months">("7days")
  
  // State for Prompt and Skills to render in right sidebar
  const [currentPrompt, setCurrentPrompt] = useState<string>("")
  const [currentSkills, setCurrentSkills] = useState<string[]>([])
  const [promptView, setPromptView] = useState<"basic" | "advanced" | "flowchart">("basic")
  const [promptCopied, setPromptCopied] = useState(false)
  
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
      // Only generate metrics for pre-loaded agents (IDs 2-10), not newly created ones
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
    { id: "ingestion", name: "Invoice Import" },
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
    console.log("[AgentBuilderPage] handleSaveAgent called with:", {
      id: updatedAgent.id,
      name: updatedAgent.name,
      stage: updatedAgent.stage,
      active: updatedAgent.active
    })
    
    // Check if this is an existing agent by looking in the agents array
    const existingAgent = agents.find((a) => a.id === updatedAgent.id)
    console.log("[AgentBuilderPage] Existing agent found:", !!existingAgent, "Current agents:", agents.length)

    if (updatedAgent.id && existingAgent) {
      // Update existing agent
      console.log("[AgentBuilderPage] Updating existing agent:", updatedAgent.id, updatedAgent.name, "Stage:", updatedAgent.stage)
      setAgents((prev) => {
        const updated = prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a))
        console.log("[AgentBuilderPage] Agents after update:", updated.map((a) => `${a.name} (${a.stage})`))
        return updated
      })
      setEditingAgent(updatedAgent)
      showToast(`Agent "${updatedAgent.name}" updated successfully`, 'success')
    } else {
      // Create new agent (ID should already be set from handleCreateNewAgent)
      // Set active: true by default so new agents are immediately synced and used
      const newAgent = {
        ...updatedAgent,
        id: updatedAgent.id || `agent-${Date.now()}`,
        active: true,
      }
      console.log("[AgentBuilderPage] Creating new agent:", newAgent.name, "Stage:", newAgent.stage, "ID:", newAgent.id, "Active:", newAgent.active)
      setAgents((prev) => {
        const updated = [...prev, newAgent]
        console.log("[AgentBuilderPage] Agent count after creation:", updated.length)
        console.log("[AgentBuilderPage] All agents:", updated.map((a) => `${a.name} (${a.stage}) [${a.active ? 'active' : 'inactive'}]`))
        return updated
      })
      setEditingAgent(newAgent)
      showToast(`Agent "${newAgent.name}" created successfully`, 'success')
      // Auto-expand the stage where the new agent was created
      if (newAgent.stage) {
        console.log("[AgentBuilderPage] Auto-expanding stage:", newAgent.stage)
        setExpandedStages((prev) => {
          const newSet = new Set(prev)
          newSet.add(newAgent.stage)
          console.log("[AgentBuilderPage] Expanded stages:", Array.from(newSet))
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
      setEditingAgent(updatedAgent)
    }
  }

  const handlePromptAndSkillsUpdate = (prompt: string, skills: string[]) => {
    setCurrentPrompt(prompt)
    setCurrentSkills(skills)
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

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt)
      setPromptCopied(true)
      setTimeout(() => setPromptCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }
  
  /**
   * Generate a simplified/basic version of the prompt for easier reading
   * Shows only ROLE and KEY ACTIONS
   */
  const generateBasicPrompt = (fullPrompt: string): string => {
    if (!fullPrompt) return ""
    
    // Extract main sections
    const roleMatch = fullPrompt.match(/ROLE:([^]*?)(?=\n\n[A-Z]+:|$)/i)
    
    // Build simplified prompt with just the essentials
    let basicPrompt = ""
    
    if (roleMatch) {
      basicPrompt += `ROLE:${roleMatch[1].trim()}\n\n`
    }
    
    // Extract key actions (from STEPS or AGENT INSTRUCTIONS)
    const stepsMatch = fullPrompt.match(/(?:STEPS?|AGENT INSTRUCTIONS):([^]*?)(?=\n\n[A-Z]+:|$)/i)
    if (stepsMatch) {
      const steps = stepsMatch[1].trim()
      // Extract only top-level numbered steps, no sub-steps
      const keyActions = steps.split('\n')
        .filter(line => /^\d+\./.test(line.trim()))
        .slice(0, 5) // Limit to first 5 steps
        .join('\n')
      basicPrompt += `KEY ACTIONS:\n${keyActions}`
    }
    
    return basicPrompt || "No simplified version available"
  }

  return (
    <div className={`flex ${hideNavigation ? 'w-full h-full' : 'h-screen'} bg-background text-foreground`}>
      {/* Main App Navigation Sidebar */}
      {!hideNavigation && <Navigation activeModule="settings" />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Matching main app styling */}
        {!hideNavigation && (
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
                    {/* Original Agent Builder - Hidden but still functional */}
                    {/* <button
                      onClick={() => setMode("build")}
                      className={`${
                        mode === "build"
                          ? "bg-purple-900 text-white"
                          : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                      } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                      aria-current={mode === "build" ? "page" : undefined}
                    >
                      Agent Builder
                    </button> */}
                    <button
                      onClick={() => setMode("build2")}
                      className={`${
                        mode === "build2"
                          ? "bg-purple-900 text-white"
                          : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                      } rounded-lg px-3 py-1.5 text-base font-medium transition-colors`}
                      aria-current={mode === "build2" ? "page" : undefined}
                    >
                      Agent Builder 2
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
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex bg-background">
          {/* Left Panel: Agent List/Sidebar */}
          {mode === "build" && sidebarOpen && (
            <aside className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground uppercase tracking-wide">Agents</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="h-8 w-8 p-0"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
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

          {/* Collapsed Sidebar Toggle Button */}
          {mode === "build" && !sidebarOpen && (
            <div className="border-r border-border bg-card flex flex-col items-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-10 w-10 p-0"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
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
              {mode === "build2" && (() => {
                return (
                  <AgentBuilder2
                    agents={agents}
                    onCreateAgent={handleCreateAgentForStage}
                    currentAgent={editingAgent}
                    onAgentSelect={setEditingAgent}
                    onSaveAgent={handleSaveAgent}
                  isPreviewMode={isPreviewMode}
                  onToggleActive={toggleAgentActive}
                  onEditAgent={handleEditAgent}
                  onDeleteAgent={handleDeleteAgent}
                  onOpenTest={() => editingAgent && handleTestAgent(editingAgent)}
                  testingAgent={testingAgent}
                  onCloseTest={handleCloseTest}
                  agentMetrics={agentMetrics}
                />
                );
              })()}
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
              <div className="w-[580px] bg-card flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <h2 className="text-lg font-bold text-foreground">Agent Summary</h2>
                  {/* Agent Statistics - show for agents with metrics */}
                  {editingAgent?.id && agentMetrics[editingAgent.id] && (
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Performance</h4>
                        <span className="text-xs text-muted-foreground">Last 24 hours</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Evaluated</span>
                          <span className="text-sm font-semibold">{formatNumber(agentMetrics[editingAgent.id].evaluated)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Acted On</span>
                          <span className="text-sm font-semibold text-green-600 dark:text-green-400">{formatNumber(agentMetrics[editingAgent.id].actedOn)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Referred</span>
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{formatNumber(agentMetrics[editingAgent.id].referred)}</span>
                        </div>
                      </div>
                    </Card>
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
                  <Card className="p-6 flex flex-col" style={{ height: "500px" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="system-prompt" className="text-sm font-semibold">System Prompt</Label>
                        <button
                          onClick={handleCopyPrompt}
                          className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                          title="Copy prompt to clipboard"
                        >
                          {promptCopied ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex rounded-md border border-border overflow-hidden">
                          <button
                            onClick={() => setPromptView("basic")}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                              promptView === "basic"
                                ? "bg-purple-900 text-white"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            Basic
                          </button>
                          <button
                            onClick={() => setPromptView("advanced")}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                              promptView === "advanced"
                                ? "bg-purple-900 text-white"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            Advanced
                          </button>
                          <button
                            onClick={() => setPromptView("flowchart")}
                            className={`px-3 py-1 text-xs font-medium transition-colors ${
                              promptView === "flowchart"
                                ? "bg-purple-900 text-white"
                                : "bg-background text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            Flowchart
                          </button>
                        </div>
                      </div>
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

                    {promptView === "flowchart" ? (
                      <PromptFlowchart 
                        prompt={currentPrompt} 
                        stage={editingAgent?.stage}
                        mode={editingAgent?.mode}
                      />
                    ) : promptView === "basic" ? (
                      <div className="space-y-2 flex-1 flex flex-col min-h-0">
                        <Textarea
                          id="system-prompt-basic"
                          value={generateBasicPrompt(currentPrompt)}
                          readOnly
                          placeholder="Simplified view of the agent's key instructions..."
                          className="font-mono text-sm bg-muted/50 cursor-not-allowed flex-1 resize-none"
                          disabled={true}
                        />
                        <p className="text-xs text-muted-foreground">
                          This is a simplified view showing only the essential instructions. Switch to <strong>Advanced</strong> to see the complete prompt with all details, validations, and error handling.
                        </p>
                      </div>
                    ) : (
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
                    )}
                  </Card>

                  {/* Skills Section */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold">Skills & Capabilities</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {currentSkills.length} of {AVAILABLE_SKILLS.length} selected
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SKILLS.map((skill) => {
                        const isSelected = currentSkills.includes(skill)
                        return (
                          <button
                            key={skill}
                            onClick={() => {
                              if (!isPreviewMode) {
                                const newSkills = isSelected
                                  ? currentSkills.filter((s) => s !== skill)
                                  : [...currentSkills, skill]
                                setCurrentSkills(newSkills)
                                if (editingAgent) {
                                  setEditingAgent({ ...editingAgent, skills: newSkills })
                                }
                              }
                            }}
                            disabled={isPreviewMode}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                            } ${isPreviewMode ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {isSelected && <span className="mr-1">✓</span>}
                            {skill}
                          </button>
                        )
                      })}
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
