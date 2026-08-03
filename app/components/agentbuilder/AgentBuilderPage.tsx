"use client"

import { useEffect, useRef } from "react"
import { useState } from "react"
import { Button } from "@/app/components/ui/button"
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
import { groupAgentsByStage } from "./stageUtils"

type Mode = "chat" | "observe" | "build2" | "executive-dashboard" | "documents"

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
  basicPromptOverride?: string
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
  lockMode?: boolean; // when true, always use defaultMode and ignore sessionStorage
}

export default function AgentBuilderPage({ hideNavigation = false, defaultMode = "observe", lockMode = false }: AgentBuilderPageProps = {}) {
  const [mode, setMode] = useState<Mode>(() => {
    if (!lockMode && typeof window !== 'undefined') {
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
      name: "OCR and Field Extraction Agent",
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
      id: "11",
      name: "Plant ID Prefix Agent",
      stage: "data-capture",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Plant ID Prefix Agent - standardizes extracted field values to ensure consistent formatting across all invoices

INPUTS:
- Raw extracted data from OCR Agent
- Field normalization rules and patterns
- Standard formatting templates

STEPS:
1. Identify fields requiring normalization (dates, IDs, references, codes)
2. Apply standardization rules based on field type
3. Add prefixes/suffixes for consistency (e.g., country codes, location identifiers)
4. Validate normalized values against expected patterns
5. Flag any values that cannot be automatically normalized

FIELD NORMALIZATION RULES:
- Plant IDs: Add country prefix (e.g., "4432" → "UK-4432")
- Date formats: Standardize to ISO format (YYYY-MM-DD)
- Phone numbers: Add country codes and standard formatting
- Currency codes: Ensure 3-letter ISO codes (USD, GBP, EUR)
- Tax IDs: Apply country-specific formatting rules

VALIDATIONS:
- Normalized value must match expected pattern for field type
- Original value must be preserved for audit trail
- Confidence score must be >= 90% for auto-application

OUTPUT:
- Normalized field values in standard format
- Original values stored in backup fields
- Confidence score for each normalization

ERROR HANDLING:
- If normalization rule uncertain → Suggest correction for manual review
- If value doesn't match any pattern → Flag for human review
- If multiple normalization options exist → Present alternatives`,
      basicPromptOverride: `ROLE: Check Plant ID field format and normalise depending on receiving mailbox

INSTRUCTIONS:
- The Plant ID field needs a prefix of one of "UK-", "US-", "EU-".
- If a Plant ID is missing the prefix (e.g., it's just 4 digits), add the correct prefix based on the receiving mailbox:
  Invoices sent to accounts.payable.us@xelix.com → prefix Plant ID with US-
  Invoices sent to accounts.payable.uk@xelix.com → prefix Plant ID with UK-
  Invoices sent to accounts.payable.eu@xelix.com → prefix Plant ID with EU-
- Do not change Plant IDs that already match the required pattern.`,
      lane: "Field Normalisation",
      skills: ["Extract Text", "Verify Data", "Process Documents"],
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
      id: "15",
      name: "Substitution Agent",
      stage: "matching",
      active: true,
      mode: "suggest",
      prompt: `ROLE: Substitution Agent - identifies likely product substitutions where part numbers or descriptions differ but other line item attributes match closely

INPUTS:
- Invoice line item descriptions, part numbers, unit of measure, unit price, quantity
- Purchase order line items with equivalent fields

STEPS:
1. For each invoice line item, attempt exact match on part number and description against PO lines
2. If no exact match found, compare remaining attributes: unit of measure, unit price, quantity
3. If non-description attributes match and descriptions are semantically similar, treat as a potential substitution
4. Compute an overall confidence score for the substitution match
5. Apply confidence threshold to determine action

CONFIDENCE THRESHOLDS:
- >= 90%: Flag as likely substitution and auto-suggest for review
- < 90%: Flag for manual review — do not auto-assign

VALIDATIONS:
- Unit of measure must match exactly
- Unit price must match within standard tolerance (+/- 2%)
- Quantity must match exactly
- Description similarity must be assessed semantically, not just character match

OUTPUT:
- Match status per line: "substitution" or "review"
- Confidence score (0–100%)
- Suggested PO line reference
- Reason for review flag where applicable

ERROR HANDLING:
- If no candidate PO line found → Mark as unmatched and escalate
- If multiple candidates score similarly → Present top 3 for manual selection`,
      basicPromptOverride: `ROLE: Substitution Agent — identifies likely product substitutions on invoice line items where the part number or description differs but other attributes match

INSTRUCTIONS:
Where a part number or description differs from the PO but unit of measure, unit price and quantity are the same, flag as a potential substitution
Only auto-suggest the match if confidence is 90% or above — flag anything below 90% for manual review`,
      lane: "Tolerance Application",
      skills: ["Intelligent Matching", "Verify Data", "Flag Issues"],
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
      name: "TechSupply Customer ID",
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
      basicPromptOverride: `ROLE: Customer Reference Number Extraction Agent - extracts the customer reference number from invoice data for TechSupply Solutions

INSTRUCTIONS:
- Any invoice from TechSupply must contain a Customer ID
- If a Customer ID is not extracted from the invoice, raise it as an exception`,
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
      basicPromptOverride: `ROLE: Bank details checker - verifies vendor banking information for accuracy and fraud prevention

INSTRUCTIONS:
- If the bank details on the invoice are not present in the Master Vendor data for the given supplier, raise an exception`,
      lane: "Data Quality",
      skills: ["Verify Data", "Find Vendor Information", "Flag Issues"],
    },
    {
      id: "12",
      name: "PO Matching Agent",
      stage: "matching",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: PO Matching Agent - automatically matches invoices to existing Purchase Orders when no PO reference is provided

INPUTS:
- Invoice data from Data Capture phase (vendor, amount, line items, dates)
- Purchase Order database with active and historical POs
- Vendor master data

STEPS:
1. Check if invoice contains a PO reference number
2. If PO reference exists, pass to standard PO matching workflow
3. If no PO reference, extract key invoice attributes: vendor name, invoice amount, line item descriptions, invoice date
4. Query PO database for open POs matching the vendor
5. Score each candidate PO against invoice attributes using weighted matching criteria
6. Calculate overall confidence score (0-100%) for each potential match
7. If confidence >= 90%: auto-suggest the match for approval
8. If confidence < 90%: reject the invoice and flag for manual review with reason

MATCHING CRITERIA (weighted):
- Vendor name match: 30%
- Amount match (within 5% tolerance): 25%
- Line item description similarity: 25%
- Date range (invoice date within PO validity period): 10%
- Currency match: 10%

CONFIDENCE THRESHOLDS:
- >= 90%: Suggest match, route for approval
- 70–89%: Flag for manual review with suggested match
- < 70%: Reject invoice, no match found

VALIDATIONS:
- PO must be active and not fully consumed
- Invoice amount must not exceed remaining PO value
- Vendor must match PO vendor record

OUTPUT:
- Match status: "matched", "rejected", or "review"
- Confidence score (0–100%)
- Matched PO number (if found)
- Reason for rejection or review flag

ERROR HANDLING:
- If vendor not found in master data → Flag for manual review
- If multiple POs match with similar confidence → Present top 3 for manual selection
- If PO is expired → Reject and notify approver`,
      basicPromptOverride: `ROLE: PO matching - tries to match invoices to existing PO's if no PO is referenced

INSTRUCTIONS:
Reject any invoice without a Purchase Order, unless there is a greater than 90% confidence we can find a match in the system`,
      lane: "PO Match",
      skills: ["Match Documents", "Verify Data", "Flag Issues"],
    },
    {
      id: "13",
      name: "Semantic Match Agent",
      stage: "matching",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Semantic Match Agent - identifies Purchase Order line items that are semantically equivalent to invoice line items, even when the exact wording differs

INPUTS:
- Invoice line item descriptions from Data Capture phase
- Open PO line item descriptions from Purchase Order database
- Vendor master data

STEPS:
1. For each invoice line item, check for an exact text match against PO line descriptions
2. If no exact match found, compute semantic similarity scores between the invoice line and all candidate PO lines
3. Rank candidate PO lines by similarity score
4. Apply confidence thresholds to determine action per line
5. Output match status, confidence score, and suggested PO line reference for each invoice line

SEMANTIC EQUIVALENCE EXAMPLES:
- "Grounds maintenance" → "Landscaping services"
- "IT support" → "Information Technology Services"
- "Courier" → "Delivery charges"
- "Office supplies" → "Printer paper and stationery"
- "Daily rate" → "Per diem charge"
- Abbreviations, synonyms, category vs specific item descriptions

CONFIDENCE THRESHOLDS:
- >= 95%: Auto-suggest match, route for approval
- 90–94%: Suggest match, route for approval with confidence score displayed
- < 90%: Flag for manual review — present best candidate(s) but require human confirmation
- No candidate found: Treat line as unmatched, block invoice progression until resolved

VALIDATIONS:
- Matched PO line must be active and not fully consumed
- Invoice line amount must not exceed remaining PO line value
- Vendor must match PO vendor record

OUTPUT:
- Match status per line: "exact", "semantic", "review", or "unmatched"
- Confidence score (0–100%) for each suggested match
- Suggested PO line reference and description
- Reason for review flag where applicable

ERROR HANDLING:
- If multiple PO lines score similarly → Present top 3 candidates for manual selection
- If no PO line scores above 50% → Mark as unmatched and escalate
- If PO line is already fully consumed → Exclude from candidates and notify reviewer`,
      basicPromptOverride: `ROLE: Semantic Match Agent — identifies Purchase Order line items that are semantically equivalent to invoice line items, even when the exact wording differs

INSTRUCTIONS:
Match invoice line item descriptions to PO line items using semantic similarity, not just exact text
Flag any invoice lines where no exact match exists but a likely semantic match is found
Any match below 90% confidence is flagged for manual review - only matches at or above 90% confidence are auto-assigned`,
      lane: "Tolerance Application",
      skills: ["Match Documents", "Verify Data", "Flag Issues"],
    },
    {
      id: "14",
      name: "Company Code (Global) Agent",
      stage: "verification",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE: Company Code (Global) Agent — assigns the correct company code to invoices based on the receiving AP mailbox and bill-to entity

INPUTS:
- Incoming invoice email metadata (receiving mailbox address)
- Bill-to field extracted from invoice document
- Company code master list

STEPS:
1. Identify the AP mailbox that received the invoice email
2. Apply mailbox-to-company-code mapping rules
3. Check if the bill-to value on the invoice document differs from the mailbox-derived company code
4. If bill-to differs, override the mailbox rule and use the bill-to value instead
5. Assign the resolved company code to the invoice

MAILBOX MAPPING RULES:
- us_accountspayable@xelix → GSPV Inc
- uk_accountspayable@xelix.com → GSPV Ltd

OVERRIDE RULE:
- If the "bill to" value on the invoice document differs from the mailbox-derived entity, override the mailbox rule and assign the bill-to value to the Company code field

OUTPUT:
- Assigned company code
- Source of assignment: "mailbox" or "bill-to override"
- Confidence score

ERROR HANDLING:
- If mailbox not in mapping → Flag for manual review
- If bill-to value is ambiguous or unrecognised → Flag for manual review`,
      basicPromptOverride: `ROLE: Company Code (Global) Agent

INSTRUCTIONS:
— Check all emails coming into AP mailboxes
— If email is sent to us_accountspayable@xelix then assign company code GSPV Inc
— If email is sent to uk_accountspayable@xelix.com then assign company code GSPV Ltd
— If the "bill to" value differs, then override the mailbox settings and assign the "bill to" value to the Company code field`,
      lane: "Supplier Master Validation",
      skills: ["Verify Data", "Find Vendor Information"],
    },
    {
      id: "18",
      name: "Unit Conversion Matching Agent",
      stage: "matching",
      active: true,
      mode: "auto-apply",
      prompt: `ROLE:\nUnit Conversion Matching Agent — adjusts the unit of measure of Landscaping Sand from JanServ Plc (WO-2025-445) from "each" to KG.\n\nINSTRUCTIONS:\n- Identify any line items for Landscaping Sand from JanServ Plc (WO-2025-445), that have a unit of measure of "each"\n- Update the line item on the invoice to reflect that "each" actually refers to 1 bag of 50kg\n- E.g. it means 10 x each will be converted to 500kg`,
      lane: "Unit Conversion",
      skills: ["Match Documents", "Verify Data", "Flag Issues"],
    },
    ]
    
    // Seed only Data Capture agents; user-created agents add their own sections
    const seedAgents = defaultAgents.filter((a) => a.stage === "data-capture")

    // Client-side only - check localStorage and merge with defaults
    if (typeof window !== 'undefined') {
      try {
        // Version-based cache invalidation: bump this when default agent prompts change
        const AGENTS_VERSION = 'v23-dynamic-sections'
        const storedVersion = localStorage.getItem('agents-version')
        if (storedVersion !== AGENTS_VERSION) {
          console.log('[AgentBuilderPage] Agent version mismatch, resetting to defaults')
          localStorage.removeItem('agents')
          localStorage.setItem('agents-version', AGENTS_VERSION)
          return seedAgents
        }

        const stored = localStorage.getItem('agents')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // CORRUPTION DETECTION
            if (parsed.length > 100) {
              console.error('[AgentBuilderPage] CORRUPTION DETECTED:', parsed.length, 'agents. Resetting.')
              localStorage.removeItem('agents')
              return seedAgents
            }

            // Ensure seed Data Capture agents exist; keep any user-created agents as-is
            const missingAgents = []
            
            for (const seed of seedAgents) {
              if (!parsed.some((a: { id: string }) => a.id === seed.id)) {
                missingAgents.push(seed)
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
    
    // Return seed agents if localStorage is empty or on server
    console.log('[AgentBuilderPage] Using seed agents:', seedAgents.length)
    return seedAgents
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
    const currentUrl = window.location.href
    const params = new URLSearchParams(window.location.search)
    const view = params.get('view')
    const agentName = params.get('agent')
    const isNewAgent = params.get('newAgent') === 'true'
    const modeParam = params.get('mode')
    
    console.log('[AgentBuilderPage] URL processing check:', {
      agentName,
      agentsCount: agents.length,
      currentUrl,
      editingAgentName: editingAgent?.name
    })
    
    // On a normal load (no newAgent param), clear any stale transient sessionStorage
    if (!isNewAgent) {
      sessionStorage.removeItem('agentbuilder-editing-agent')
      sessionStorage.removeItem('agentbuilder-mode')
    }

    // If creating a new agent from floating chat (priority check - do this first)
    if (isNewAgent) {
      // Guard: only process once per unique URL to prevent duplicate agents on re-renders
      const processedKey = `agentbuilder-processed-${currentUrl}`
      if (sessionStorage.getItem(processedKey) === 'true') {
        console.log('[AgentBuilderPage] New agent URL already processed, skipping')
        return
      }

      const prompt = params.get('prompt') || ''
      const stage = params.get('stage') || 'data-capture'
      const agentMode = params.get('agentMode') || 'suggest'
      const skillsStr = params.get('skills') || ''
      const skills = skillsStr ? skillsStr.split(',').filter(s => s.trim()) : []
      const lane = params.get('lane') || 'Data Quality'
      const name = params.get('name') || 'New Agent'
      
      console.log('[AgentBuilderPage] Creating new agent from URL params:', {
        name,
        stage,
        mode: agentMode,
        skillsCount: skills.length,
        lane,
        promptLength: prompt.length
      })
      
      // Create new agent with pre-filled data
      const newAgent: Agent = {
        id: Date.now().toString(),
        name: name,
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
      
      // Strip newAgent params from URL so back-navigation / re-renders don't retrigger
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('newAgent')
      cleanUrl.searchParams.delete('prompt')
      cleanUrl.searchParams.delete('stage')
      cleanUrl.searchParams.delete('agentMode')
      cleanUrl.searchParams.delete('skills')
      cleanUrl.searchParams.delete('lane')
      cleanUrl.searchParams.delete('name')
      window.history.replaceState({}, '', cleanUrl.toString())

      // Clear the transient sessionStorage keys now that state is in React
      sessionStorage.removeItem('agentbuilder-editing-agent')
      sessionStorage.removeItem('agentbuilder-mode')
      
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
      // Only process if we're not already viewing this agent
      if (editingAgent?.name !== agentName) {
        console.log('[AgentBuilderPage] Looking for agent:', agentName)
        console.log('[AgentBuilderPage] Available agents:', agents.map(a => a.name))
        
        // Try exact match first, then case-insensitive contains
        let agent = agents.find(a => a.name === agentName)
        if (!agent) {
          agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase())
        }
        if (!agent) {
          agent = agents.find(a => a.name.toLowerCase().includes(agentName.toLowerCase()))
        }
        
        if (agent) {
          console.log('[AgentBuilderPage] Found agent:', agent.name, 'id:', agent.id)
          setEditingAgent(agent)
          setIsPreviewMode(false) // Set to false so user can edit
          setMode('build2') // Use Agent Builder 2 UI
          
          // Expand the stage containing this agent
          if (agent.stage) {
            setExpandedStages(prev => {
              const newSet = new Set(prev)
              newSet.add(agent.stage)
              return newSet
            })
          }
          
          console.log('[AgentBuilderPage] Agent selected successfully')
        } else {
          console.warn('[AgentBuilderPage] Agent not found:', agentName)
        }
      } else {
        console.log('[AgentBuilderPage] Agent already selected:', agentName)
      }
    }
  }, [agents]) // Removed editingAgent to prevent URL override when manually clicking agents

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


  const [isPreviewMode, setIsPreviewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('agentbuilder-preview-mode')
      return stored === 'true'
    }
    return false
  })
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(["data-capture"]))
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

  const [agentMetrics, setAgentMetrics] = useState<Record<string, AgentMetrics>>({
    // Initial metrics for OCR Agent (id: "2")
    "2": {
      evaluated: 8500,
      actedOn: 7820,
      referred: 680,
      createdDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
      lastRunDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      avgRuntimeMs: 185,
      invoicesProcessed: 567
    },
    // Initial metrics for Plant ID Prefix Agent (id: "11")
    "11": {
      evaluated: 7200,
      actedOn: 6840,
      referred: 360,
      createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      lastRunDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      avgRuntimeMs: 95,
      invoicesProcessed: 480
    }
  })

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
        let baseEvaluated: number
        let createdDate: Date
        let avgRuntimeMs: number
        
        // Special metrics for OCR Agent (id: "2") - show substantial activity
        if (agent.id === "2") {
          // OCR Agent has been very active - processes most invoices
          baseEvaluated = Math.floor(8500 * baseMultiplier) // High volume
          
          // Created 75 days ago (established agent)
          createdDate = new Date()
          createdDate.setDate(createdDate.getDate() - 75)
          
          // Fast runtime for OCR processing
          avgRuntimeMs = 185 // ~185ms average
        } else if (agent.id === "11") {
          // Plant ID Prefix Agent - moderate activity
          baseEvaluated = Math.floor(7200 * baseMultiplier)
          
          // Created 60 days ago
          createdDate = new Date()
          createdDate.setDate(createdDate.getDate() - 60)
          
          // Very fast runtime for field normalization
          avgRuntimeMs = 95 // ~95ms average
        } else {
          // Regular metrics for other agents
          baseEvaluated = Math.floor((Math.random() * 3000 + 1000) * baseMultiplier)
          
          // Generate created date (30-90 days ago)
          const daysAgo = Math.floor(Math.random() * 60) + 30
          createdDate = new Date()
          createdDate.setDate(createdDate.getDate() - daysAgo)
          
          // Generate average runtime (50ms-500ms range)
          avgRuntimeMs = Math.floor(Math.random() * 450) + 50
        }
        
        const actedOnPercent = agent.mode === "auto-apply" ? 0.92 : agent.mode === "suggest" ? 0.6 : 0
        const actedOn = Math.floor(baseEvaluated * actedOnPercent)
        const referred = baseEvaluated - actedOn

        // Generate last run date (within last 24 hours for active agents, null for inactive)
        let lastRunDate: string | null = null
        if (agent.active) {
          // OCR Agent runs very frequently - last run within 2 hours
          const hoursAgo = agent.id === "2" ? Math.random() * 2 : Math.floor(Math.random() * 24)
          const lastRun = new Date()
          lastRun.setHours(lastRun.getHours() - hoursAgo)
          lastRunDate = lastRun.toISOString()
        }

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

  const agentsByStage = groupAgentsByStage(agents)

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
    setMode("build2")
    
    // Clear URL agent parameter to prevent interference with manual selection
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('agent')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent)
    setIsPreviewMode(false)
    setMode("build2")
    
    // Clear URL agent parameter to prevent interference with manual selection
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('agent')
      window.history.replaceState({}, '', url.toString())
    }
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
      const newAgent = {
        ...updatedAgent,
        id: updatedAgent.id || `agent-${Date.now()}`,
        active: updatedAgent.active ?? false,
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
    setEditingAgent({ id: newAgentId, name: "", stage: "", active: true, mode: "observe", prompt: "", model: "", skills: [] }) // Added mode field
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
      active: true,
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
      basicPrompt += `INSTRUCTIONS:\n${keyActions}`
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

          </div>
        </main>
      </div>
    </div>
  )
}
