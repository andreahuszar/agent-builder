"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, Check, X, Clock, User, Zap, AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"

const STORAGE_KEY = "xelix-back-test-history"
const STORAGE_VERSION = "v3" // bump when InvoiceComparison shape changes
const STORAGE_VERSION_KEY = "xelix-back-test-history-version"
const MAX_COMPARISONS_PER_RUN = 500

// ─── Types (mirrors comparisonMetrics.ts InvoiceComparison) ──────────────────

interface InvoiceComparison {
  invoiceId: string
  vendor: string
  amount: number
  date: string
  importSource: string
  hasIssue: boolean
  issueDescription?: string
  exceptionType?: string
  withoutAgent: {
    outcome: string
    pipelineStage?: string
    failureStage?: string
    isSTP?: boolean
    processingTimeMinutes: number
    manualTouches: number
  }
  withAgent: {
    agentAction: string
    pipelineStage?: string
    isSTP?: boolean
    processingTimeMinutes: number
    manualTouches: number
    captureAccuracy?: number
    matchConfidence?: number
  }
  improvement: { outcome: string; highlights: string[] }
  hasIssueField?: boolean
}

interface ComparisonMetrics {
  avgProcessingTimeWithout: number
  avgProcessingTimeWith: number
  exceptionsWithout: number
  exceptionsWith: number
  manualTouchesWithout: number
  manualTouchesWith: number
  costPerInvoiceWithout: number
  costPerInvoiceWith: number
  timeReductionPercentage: number
  exceptionReductionPercentage: number
  manualTouchReductionPercentage: number
  costSavingsPerInvoice: number
  fteHoursSaved: number
  annualFTESavings: number
  annualCostSavings: number
  processingSpeedupFactor: number
  autoResolvedCount: number
  accuracyWith: number
  accuracyImprovement: number
  stpRateWithout?: number
  stpRateWith?: number
  stpImprovement?: number
}

interface BackTestRun {
  id: string
  agentName: string
  timePeriod: string
  startedAt: string
  completedAt: string | null
  status: "running" | "completed"
  progress: number
  metrics: ComparisonMetrics | null
  invoiceComparisons: InvoiceComparison[]
  displayInvoiceCount?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timePeriodLabel(period: string): string {
  return (
    { "7days": "Last 7 days", "30days": "Last 30 days", "3months": "Last 3 months" }[period] ?? period
  )
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function saveRuns(runs: BackTestRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs))
    localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
  } catch (e) {
    console.warn("[BackTestPanel] Failed to save to localStorage:", e)
  }
}

function fmtPct(n: number, decimals = 0) {
  return `${n.toFixed(decimals)}%`
}

function fmtTime(mins: number) {
  return mins < 60 ? `${mins.toFixed(0)}m` : `${(mins / 60).toFixed(1)}h`
}

function exceptionTypeLabel(t: string): string {
  const map: Record<string, string> = {
    duplicate: "Duplicate",
    wrong_format: "Wrong Format",
    missing_metadata: "Missing Metadata",
    poor_quality: "Poor Quality",
    low_ocr_confidence: "Low OCR",
    missing_fields: "Missing Fields",
    field_errors: "Field Errors",
    manual_entry_required: "Manual Entry",
    validation_error: "Validation Error",
    anomaly: "Anomaly",
    policy_violation: "Policy Violation",
    vendor_unverified: "Unverified Vendor",
    price_variance: "Price Variance",
    quantity_variance: "Qty Variance",
    no_po_match: "No PO Match",
    no_po: "No PO",
    tolerance_exceeded: "Tolerance Exceeded",
    routing_unclear: "Routing Unclear",
    threshold_exceeded: "Threshold Exceeded",
    escalation_needed: "Escalation",
    missing_approver: "Missing Approver",
    missing_gl_code: "Missing GL Code",
    erp_validation_failed: "ERP Validation",
    reconciliation_mismatch: "Reconciliation",
  }
  return map[t] ?? t
}

// ─── Pipeline Stage Chip ─────────────────────────────────────────────────────

const STAGE_STYLES: Record<string, string> = {
  "Imported":      "bg-gray-100 text-gray-600 border-gray-200",
  "Data Captured": "bg-blue-50 text-blue-700 border-blue-200",
  "Verified":      "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Matched":       "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Approved":      "bg-amber-50 text-amber-700 border-amber-200",
  "Posted":        "bg-green-50 text-green-700 border-green-200",
  "Rejected":      "bg-red-50 text-red-600 border-red-200",
}

function PipelineStageChip({ stage }: { stage: string }) {
  const styles = STAGE_STYLES[stage] ?? "bg-gray-100 text-gray-600 border-gray-200"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {stage}
    </span>
  )
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────

const PIPELINE_ORDER = ["Imported", "Data Captured", "Verified", "Matched", "Approved", "Posted", "Rejected"]

function KpiStrip({ metrics, comparisons }: { metrics: ComparisonMetrics; comparisons: InvoiceComparison[] }) {
  const total = comparisons.length || 1

  // Compute STP from comparisons when metrics don't have it (e.g. old runs)
  const stpWithout = metrics.stpRateWithout ?? (comparisons.filter(c => c.withoutAgent.isSTP).length / total * 100)
  const stpWith = metrics.stpRateWith ?? (comparisons.filter(c => c.withAgent.isSTP).length / total * 100)
  const stpDelta = stpWith - stpWithout

  // Exception rate = invoices that didn't reach "Posted" or "Rejected" (Rejected is an intentional outcome, not an exception)
  const exWithoutCount = comparisons.filter(c => c.withoutAgent.pipelineStage !== "Posted").length
  const exWithCount = comparisons.filter(c => c.withAgent.pipelineStage !== "Posted" && c.withAgent.pipelineStage !== "Rejected").length
  const exWithout = (exWithoutCount / total) * 100
  const exWith = (exWithCount / total) * 100

  const tiles = [
    {
      label: "Straight-Through Rate",
      without: fmtPct(stpWithout, 1),
      with: fmtPct(stpWith, 1),
      delta: stpDelta >= 0 ? `+${stpDelta.toFixed(1)} pp` : `${stpDelta.toFixed(1)} pp`,
      better: stpDelta > 0,
      description: "Invoices processed with zero manual intervention",
    },
    {
      label: "Didn't Reach Posted",
      without: fmtPct(exWithout, 1),
      with: fmtPct(exWith, 1),
      delta: exWithout > exWith ? `−${(exWithout - exWith).toFixed(1)} pp` : `+${(exWith - exWithout).toFixed(1)} pp`,
      better: exWith < exWithout,
      description: "Invoices that did not fully post (blocked, rejected or stalled)",
    },
    {
      label: "Avg Processing Time",
      without: fmtTime(metrics.avgProcessingTimeWithout),
      with: fmtTime(metrics.avgProcessingTimeWith),
      delta: `−${metrics.timeReductionPercentage.toFixed(0)}%`,
      better: metrics.avgProcessingTimeWith < metrics.avgProcessingTimeWithout,
      description: "End-to-end time per invoice",
    },
    {
      label: "Manual Touches",
      without: (metrics.manualTouchesWithout / total).toFixed(1),
      with: (metrics.manualTouchesWith / total).toFixed(1),
      delta: `−${metrics.manualTouchReductionPercentage.toFixed(0)}%`,
      better: metrics.manualTouchesWith < metrics.manualTouchesWithout,
      description: "Average human interventions per invoice",
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500 mb-2">{t.label}</p>
          <div className="flex items-end justify-between mb-1">
            <div>
              <p className="text-[11px] text-gray-400 mb-0.5">Without</p>
              <p className="text-lg font-bold text-gray-500 leading-none">{t.without}</p>
            </div>
            <div className="text-gray-300 text-lg font-light">→</div>
            <div className="text-right">
              <p className="text-[11px] text-purple-500 mb-0.5">With Agent</p>
              <p className="text-lg font-bold text-purple-900 leading-none">{t.with}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 mt-2 ${t.better ? "text-green-600" : "text-red-500"}`}>
            {t.better ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
            <span className="text-xs font-semibold">{t.delta}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">{t.description}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Stage Funnel ─────────────────────────────────────────────────────────────

function StageFunnel({ comparisons }: { comparisons: InvoiceComparison[] }) {
  const total = comparisons.length || 1

  // Count how many invoices reached at least each stage
  // "reached" means pipelineStage is this stage or later in the order (excluding Rejected for now)
  const orderedStages = ["Imported", "Data Captured", "Verified", "Matched", "Approved", "Posted"]
  const rejectedStage = "Rejected"

  function reachedStage(stage: string, pipelineStage?: string): boolean {
    if (!pipelineStage) return false
    if (pipelineStage === rejectedStage) return false
    const idx = orderedStages.indexOf(stage)
    const reached = orderedStages.indexOf(pipelineStage)
    return reached >= idx
  }

  const rows = [
    ...orderedStages.map(stage => {
      const withoutCount = comparisons.filter(c => reachedStage(stage, c.withoutAgent.pipelineStage)).length
      const withCount = comparisons.filter(c => reachedStage(stage, c.withAgent.pipelineStage)).length
      return { stage, withoutCount, withCount, isRejected: false }
    }),
    {
      stage: "Rejected",
      withoutCount: comparisons.filter(c => c.withoutAgent.pipelineStage === "Rejected").length,
      withCount: comparisons.filter(c => c.withAgent.pipelineStage === "Rejected").length,
      isRejected: true,
    },
  ]

  return (
    <div>
      <p className="text-sm font-semibold text-gray-950 mb-3">Stage Progression</p>
      <div className="space-y-1.5">
        {rows.map(({ stage, withoutCount, withCount, isRejected }) => {
          const withoutPct = (withoutCount / total) * 100
          const withPct = (withCount / total) * 100
          return (
            <div key={stage} className="grid grid-cols-[80px_1fr_64px] items-center gap-2">
              <span className="text-xs text-gray-500 text-right shrink-0">{stage}</span>
              <div className="flex flex-col gap-0.5">
                {/* Without agent bar */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isRejected ? "bg-red-300" : "bg-gray-300"}`}
                      style={{ width: `${withoutPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{withoutCount.toLocaleString()}</span>
                </div>
                {/* With agent bar */}
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isRejected ? "bg-red-400" : "bg-purple-500"}`}
                      style={{ width: `${withPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-purple-600 w-8 text-right shrink-0">{withCount.toLocaleString()}</span>
                </div>
              </div>
              {/* Delta */}
              <div className="text-right">
                {!isRejected && withCount > withoutCount ? (
                  <span className="text-[10px] font-medium text-green-600">+{(withCount - withoutCount).toLocaleString()}</span>
                ) : isRejected && withCount < withoutCount ? (
                  <span className="text-[10px] font-medium text-green-600">−{(withoutCount - withCount).toLocaleString()}</span>
                ) : (
                  <span className="text-[10px] text-gray-300">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-gray-300" /> Without Agent</span>
        <span className="flex items-center gap-1"><span className="inline-block w-3 h-1.5 rounded-full bg-purple-500" /> With Agent</span>
      </div>
    </div>
  )
}

// ─── Exception Breakdown ──────────────────────────────────────────────────────

function ExceptionBreakdown({ comparisons }: { comparisons: InvoiceComparison[] }) {
  const withIssues = comparisons.filter(c => c.hasIssue && c.exceptionType)
  if (withIssues.length === 0) return null

  // Group by exception type
  const grouped: Record<string, { total: number; autoResolved: number }> = {}
  for (const c of withIssues) {
    const t = c.exceptionType!
    if (!grouped[t]) grouped[t] = { total: 0, autoResolved: 0 }
    grouped[t].total++
    if (c.withAgent.agentAction === "auto_resolved") grouped[t].autoResolved++
  }

  const rows = Object.entries(grouped)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)

  const maxTotal = Math.max(...rows.map(r => r[1].total))

  return (
    <div>
      <p className="text-sm font-semibold text-gray-950 mb-3">Exception Distribution</p>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 text-gray-500 font-medium">Exception Type</th>
              <th className="text-right p-2 text-gray-500 font-medium w-16">Count</th>
              <th className="p-2 text-gray-500 font-medium w-32">Volume</th>
              <th className="text-right p-2 text-gray-500 font-medium w-20">Auto-resolved</th>
              <th className="text-right p-2 text-gray-500 font-medium w-16">Rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([type, { total, autoResolved }]) => (
              <tr key={type} className="border-t border-gray-100">
                <td className="p-2 text-gray-950">{exceptionTypeLabel(type)}</td>
                <td className="p-2 text-right text-gray-700">{total.toLocaleString()}</td>
                <td className="p-2">
                  <div className="flex gap-0.5 h-3 rounded overflow-hidden">
                    <div className="bg-purple-500 rounded-sm" style={{ width: `${(autoResolved / maxTotal) * 100}%` }} />
                    <div className="bg-gray-200 rounded-sm" style={{ width: `${((total - autoResolved) / maxTotal) * 100}%` }} />
                  </div>
                </td>
                <td className="p-2 text-right text-purple-700 font-medium">{autoResolved.toLocaleString()}</td>
                <td className="p-2 text-right">
                  <span className={`font-medium ${autoResolved / total > 0.7 ? "text-green-600" : autoResolved / total > 0.3 ? "text-amber-600" : "text-red-500"}`}>
                    {fmtPct((autoResolved / total) * 100, 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Activity Modal ───────────────────────────────────────────────────────────

const ORDERED_STAGES = ["Imported", "Data Captured", "Verified", "Matched", "Approved", "Posted"]

interface TimelineEvent {
  type: "stage" | "touch" | "agent" | "outcome"
  label: string
  subLabel?: string
  timeMin?: number
  status: "completed" | "stuck" | "agent" | "rejected" | "posted"
}

function buildWithoutTimeline(c: InvoiceComparison): TimelineEvent[] {
  const stage = c.withoutAgent.pipelineStage ?? "Imported"
  const stageIdx = ORDERED_STAGES.indexOf(stage)
  const reachedStages = stageIdx >= 0 ? ORDERED_STAGES.slice(0, stageIdx + 1) : [stage]
  // Use small fixed per-step times (30s–2m) regardless of total processing time
  const STEP_TIMES = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5]

  const events: TimelineEvent[] = reachedStages.map((s, i) => {
    const isLast = i === reachedStages.length - 1
    const isPosted = s === "Posted"
    return {
      type: "stage",
      label: s,
      timeMin: STEP_TIMES[Math.min(i, STEP_TIMES.length - 1)],
      status: isPosted ? "posted" : isLast ? "stuck" : "completed",
      subLabel: isLast && !isPosted ? "Invoice held here" : undefined,
    }
  })

  return events
}

function buildWithTimeline(c: InvoiceComparison): TimelineEvent[] {
  const stage = c.withAgent.pipelineStage ?? "Posted"
  const totalTime = c.withAgent.processingTimeMinutes
  const isRejected = stage === "Rejected"
  const isPosted = stage === "Posted"

  if (isRejected) {
    return [
      { type: "stage", label: "Imported", timeMin: 0.2, status: "completed" },
      { type: "agent", label: "Agent triggered", subLabel: "Reject Word Formatted Invoices", timeMin: 0.5, status: "agent" },
      { type: "outcome", label: "Rejected", subLabel: "Vendor notified — unsupported format (.docx)", timeMin: 1, status: "rejected" },
    ]
  }

  if (isPosted) {
    const stageIdx = ORDERED_STAGES.indexOf(stage)
    const reachedStages = ORDERED_STAGES.slice(0, stageIdx + 1)
    const perStageTime = totalTime / Math.max(reachedStages.length, 1)
    return [
      ...reachedStages.slice(0, -1).map((s, i) => ({
        type: "stage" as const,
        label: s,
        timeMin: parseFloat(((i + 1) * perStageTime * 0.5).toFixed(1)),
        status: "completed" as const,
      })),
      { type: "agent", label: "Agent auto-resolved", subLabel: "Issue detected and resolved automatically", timeMin: parseFloat((totalTime * 0.7).toFixed(1)), status: "agent" as const },
      { type: "outcome", label: "Posted", subLabel: c.withAgent.isSTP ? "Straight-through — zero manual touches" : "Successfully posted", timeMin: parseFloat(totalTime.toFixed(1)), status: "posted" as const },
    ]
  }

  // Generic held
  const stageIdx = ORDERED_STAGES.indexOf(stage)
  const reachedStages = stageIdx >= 0 ? ORDERED_STAGES.slice(0, stageIdx + 1) : [stage]
  const perStageTime = totalTime / Math.max(reachedStages.length, 1)
  return reachedStages.map((s, i) => {
    const isLast = i === reachedStages.length - 1
    return {
      type: "stage" as const,
      label: s,
      timeMin: parseFloat(((i + 1) * perStageTime).toFixed(1)),
      status: isLast ? "stuck" as const : "completed" as const,
      subLabel: isLast ? "Still held" : undefined,
    }
  })
}

function TimelineNode({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const iconMap: Record<TimelineEvent["status"], React.ReactNode> = {
    completed:  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white ring-1 ring-gray-300" />,
    stuck:      <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />,
    agent:      <Zap className="w-3.5 h-3.5 text-purple-600" />,
    rejected:   <XCircle className="w-3.5 h-3.5 text-red-500" />,
    posted:     <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  }

  const labelColor: Record<TimelineEvent["status"], string> = {
    completed: "text-gray-600",
    stuck:     "text-orange-700 font-semibold",
    agent:     "text-purple-700 font-semibold",
    rejected:  "text-red-600 font-semibold",
    posted:    "text-green-700 font-semibold",
  }

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex items-center justify-center w-5 h-5 shrink-0">
          {iconMap[event.status]}
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-0.5" style={{ minHeight: "16px" }} />}
      </div>
      <div className="pb-3 min-w-0">
        <p className={`text-xs ${labelColor[event.status]}`}>{event.label}</p>
        {event.subLabel && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{event.subLabel}</p>}
        {event.timeMin !== undefined && (
          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />{event.timeMin < 1 ? `${(event.timeMin * 60).toFixed(0)}s` : Number.isInteger(event.timeMin) ? `${event.timeMin}m` : `${Math.floor(event.timeMin)}m ${Math.round((event.timeMin % 1) * 60)}s`}
          </p>
        )}
      </div>
    </div>
  )
}

function ActivityModal({ invoices, initialIndex, onClose }: { invoices: InvoiceComparison[]; initialIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(initialIndex)
  const invoice = invoices[idx]

  const withoutEvents = buildWithoutTimeline(invoice)
  const withEvents = buildWithTimeline(invoice)

  const withoutTotalTime = withoutEvents.reduce((sum, e) => sum + (e.timeMin ?? 0), 0)
  const withTotalTime = withEvents.reduce((sum, e) => sum + (e.timeMin ?? 0), 0)

  const hasPrev = idx > 0
  const hasNext = idx < invoices.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-950">{invoice.invoiceNumber ?? invoice.invoiceId}
              <span className="ml-2 text-xs font-normal text-gray-400">{idx + 1} of {invoices.length}</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{invoice.vendor} · £{invoice.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} · {invoice.date}</p>
            {invoice.issueDescription && (
              <p className="text-[11px] text-orange-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />{invoice.issueDescription}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 mt-0.5 shrink-0">
            <button
              onClick={() => setIdx(i => i - 1)}
              disabled={!hasPrev}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous invoice"
            >
              <ChevronRight className="w-4 h-4 text-gray-500 rotate-180" />
            </button>
            <button
              onClick={() => setIdx(i => i + 1)}
              disabled={!hasNext}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next invoice"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — two-column timeline */}
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          {/* Without Agent */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Without Agent</p>
            </div>
            <div>
              {withoutEvents.map((e, i) => (
                <TimelineNode key={i} event={e} isLast={i === withoutEvents.length - 1} />
              ))}
            </div>
            {/* Summary */}
            <div className="mt-2 pt-3 border-t border-gray-100 flex gap-4">
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Time</p>
                <p className="text-sm font-semibold text-gray-950">{fmtTime(withoutTotalTime)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Touches</p>
                <p className="text-sm font-semibold text-gray-950">{invoice.withoutAgent.manualTouches}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Outcome</p>
                <p className={`text-sm font-semibold ${invoice.withoutAgent.pipelineStage === "Posted" ? "text-green-600" : "text-orange-600"}`}>
                  {invoice.withoutAgent.pipelineStage === "Posted" ? "Posted" : `Held at ${invoice.withoutAgent.pipelineStage}`}
                </p>
              </div>
            </div>
          </div>

          {/* With Agent */}
          <div className="px-5 py-4 bg-purple-50/30">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">With Agent</p>
            </div>
            <div>
              {withEvents.map((e, i) => (
                <TimelineNode key={i} event={e} isLast={i === withEvents.length - 1} />
              ))}
            </div>
            {/* Summary */}
            <div className="mt-2 pt-3 border-t border-purple-100 flex gap-4">
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Time</p>
                <p className="text-sm font-semibold text-purple-900">{fmtTime(withTotalTime)}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Touches</p>
                <p className="text-sm font-semibold text-purple-900">{invoice.withAgent.manualTouches}</p>
              </div>
              <div className="text-center">
                <p className="text-[11px] text-gray-400">Outcome</p>
                <p className={`text-sm font-semibold ${
                  invoice.withAgent.pipelineStage === "Posted" ? "text-green-600" :
                  invoice.withAgent.pipelineStage === "Rejected" ? "text-red-600" : "text-orange-600"
                }`}>
                  {invoice.withAgent.pipelineStage === "Rejected" ? "Rejected" :
                   invoice.withAgent.pipelineStage === "Posted"
                     ? (invoice.withAgent.isSTP ? "Posted (STP)" : "Posted")
                     : `Held at ${invoice.withAgent.pipelineStage}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Invoice Comparison Table ─────────────────────────────────────────────────

function InvoiceTable({ comparisons, totalInvoices }: { comparisons: InvoiceComparison[]; totalInvoices: number }) {
  const [stpFilter, setStpFilter] = useState("all")
  const [resultFilter, setResultFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const rowsPerPage = 25

  // First 4 non-STP invoices — these rows open the activity modal on click
  const clickableInvoices = comparisons.filter(c => !c.withAgent.isSTP).slice(0, 4)
  const clickableIds = new Set(clickableInvoices.map(c => c.invoiceId))

  const filtered = comparisons.filter(c => {
    if (stpFilter === "stp" && !c.withAgent.isSTP) return false
    if (stpFilter === "non-stp" && c.withAgent.isSTP) return false
    if (resultFilter === "improved" && c.improvement.outcome !== "better") return false
    if (resultFilter === "same" && c.improvement.outcome !== "same") return false
    if (resultFilter === "worse" && c.improvement.outcome !== "worse") return false
    return true
  })

  // Always pin the 4 clickable invoices to the top of the list
  const sorted = [
    ...filtered.filter(c => clickableIds.has(c.invoiceId)),
    ...filtered.filter(c => !clickableIds.has(c.invoiceId)),
  ]

  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage)
  const totalPages = Math.ceil(sorted.length / rowsPerPage)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-950">
          Invoice-by-Invoice Comparison
          {totalInvoices >= MAX_COMPARISONS_PER_RUN && (
            <span className="ml-2 text-xs font-normal text-gray-400">(first {MAX_COMPARISONS_PER_RUN} invoices shown)</span>
          )}
        </p>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {/* STP filter */}
          <Select value={stpFilter} onValueChange={v => { setStpFilter(v); setPage(1) }}>
            <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue placeholder="STP" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="stp">STP only</SelectItem>
              <SelectItem value="non-stp">Non-STP</SelectItem>
            </SelectContent>
          </Select>
          {/* Result filter */}
          <Select value={resultFilter} onValueChange={v => { setResultFilter(v); setPage(1) }}>
            <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue placeholder="Result" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              <SelectItem value="improved">Improved</SelectItem>
              <SelectItem value="same">No change</SelectItem>
              <SelectItem value="worse">Worse</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2 text-gray-500 font-medium w-[130px]">Invoice</th>
              <th className="text-left p-2 text-gray-500 font-medium">Vendor</th>
              <th className="text-right p-2 text-gray-500 font-medium w-[80px]">Amount</th>
              <th className="text-left p-2 text-gray-500 font-medium w-[55px]">Date</th>
              <th className="text-left p-2 text-gray-500 font-medium w-[110px]">Without Agent</th>
              <th className="text-left p-2 text-gray-500 font-medium w-[120px]">With Agent</th>
              <th className="text-center p-2 text-gray-500 font-medium w-[90px]">Touches without</th>
              <th className="text-center p-2 text-gray-500 font-medium w-[80px]">Touches with</th>
              <th className="text-center p-2 text-gray-500 font-medium w-[70px]">Difference</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-center text-gray-400">No invoices match the filter.</td></tr>
            ) : (
              paginated.map((c, idx) => {
                const touchesWithout = c.withoutAgent.manualTouches
                const touchesWith = c.withAgent.manualTouches
                const touchDelta = touchesWith - touchesWithout

                const isClickable = clickableIds.has(c.invoiceId)
                return (
                  <tr
                    key={idx}
                    className={`border-t transition-colors ${isClickable ? "cursor-pointer hover:bg-purple-50/60" : "hover:bg-gray-50"}`}
                    onClick={isClickable ? () => setSelectedIdx(clickableInvoices.findIndex(ci => ci.invoiceId === c.invoiceId)) : undefined}
                  >
                    {/* Invoice ID */}
                    <td className="p-2 font-mono whitespace-nowrap">
                      <span className={`text-purple-700 underline underline-offset-2 decoration-dotted ${isClickable ? "cursor-pointer" : "cursor-default"}`}>{c.invoiceNumber ?? c.invoiceId}</span>
                    </td>
                    {/* Vendor */}
                    <td className="p-2 text-gray-700">{c.vendor}</td>
                    {/* Amount */}
                    <td className="p-2 text-right font-medium text-gray-950 whitespace-nowrap">£{c.amount.toFixed(0)}</td>
                    {/* Date */}
                    <td className="p-2 text-gray-500 whitespace-nowrap">{c.date ? c.date.slice(5) : "—"}</td>
                    {/* Without Agent */}
                    <td className="p-2">
                      <div className="flex flex-col gap-0.5">
                        {c.withoutAgent.pipelineStage === "Posted" ? (
                          <span className="text-xs font-medium text-gray-950">Posted</span>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-orange-700">Held</span>
                            {c.withoutAgent.pipelineStage && (
                              <span className="text-[10px] text-gray-600 mt-0.5">at {c.withoutAgent.pipelineStage}</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    {/* With Agent */}
                    <td className="p-2">
                      <div className="flex flex-col gap-0.5">
                        {c.withAgent.pipelineStage === "Posted" ? (
                          <>
                            <span className="text-xs font-medium text-gray-950">Posted</span>
                            {c.withAgent.isSTP && (
                              <span className="text-[10px] text-green-600 mt-0.5">STP</span>
                            )}
                          </>
                        ) : c.withAgent.pipelineStage === "Rejected" ? (
                          <>
                            <span className="text-xs font-medium text-red-600">Rejected</span>
                            <span className="text-[10px] text-gray-600 mt-0.5">at Invoice import</span>
                          </>
                        ) : c.withAgent.pipelineStage ? (
                          <>
                            <span className="text-xs font-medium text-orange-700">Held</span>
                            <span className="text-[10px] text-gray-600 mt-0.5">at {c.withAgent.pipelineStage}</span>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    {/* Touches without agent */}
                    <td className="p-2 text-center">
                      <span className="text-xs font-semibold text-gray-950">{touchesWithout}</span>
                    </td>
                    {/* Touches with agent */}
                    <td className="p-2 text-center">
                      <span className="text-xs font-semibold text-gray-950">{touchesWith}</span>
                    </td>
                    {/* Difference */}
                    <td className="p-2 text-center">
                      {touchDelta === 0
                        ? <span className="text-xs font-semibold text-gray-400">0</span>
                        : <span className={`text-xs font-semibold ${touchDelta < 0 ? "text-green-600" : "text-red-500"}`}>
                            {touchDelta < 0 ? touchDelta : `+${touchDelta}`}
                          </span>}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-gray-500">
            Showing {((page - 1) * rowsPerPage) + 1}–{Math.min(page * rowsPerPage, sorted.length)} of {sorted.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {selectedIdx !== null && (
        <ActivityModal invoices={clickableInvoices} initialIndex={selectedIdx} onClose={() => setSelectedIdx(null)} />
      )}
    </div>
  )
}

// ─── Expanded Results View ────────────────────────────────────────────────────

function RunResults({ run }: { run: BackTestRun }) {
  const { metrics, invoiceComparisons } = run

  return (
    <div className="space-y-5 pt-4 border-t border-gray-100">
      {/* 1 — KPI strip */}
      {metrics && (
        <KpiStrip metrics={metrics} comparisons={invoiceComparisons} />
      )}

      {/* 2 — Invoice table */}
      {invoiceComparisons.length > 0 && (
        <InvoiceTable comparisons={invoiceComparisons} totalInvoices={invoiceComparisons.length} />
      )}

      {/* 3 — FTE / Cost summary */}
      {metrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-950 mb-2">FTE Savings</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Hours Saved:</span><span className="font-medium text-gray-950">{metrics.fteHoursSaved.toFixed(1)} hrs</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Annual FTE:</span><span className="font-medium text-green-600">{metrics.annualFTESavings.toFixed(2)} FTE</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Annual Savings:</span><span className="font-medium text-green-600">${metrics.annualCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-950 mb-2">Processing Efficiency</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Speedup:</span><span className="font-medium text-gray-950">{metrics.processingSpeedupFactor.toFixed(1)}x faster</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Auto-Resolved:</span><span className="font-medium text-gray-950">{metrics.autoResolvedCount.toLocaleString()} invoices</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Accuracy:</span><span className="font-medium text-gray-950">{metrics.accuracyWith.toFixed(1)}% (+{metrics.accuracyImprovement.toFixed(1)}%)</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Preset Runs (pre-built agent baselines, always visible) ─────────────────

const PRESET_RUNS: BackTestRun[] = [
  {
    id: "preset-plant-id",
    agentName: "Plant ID Prefix Agent",
    timePeriod: "30days",
    startedAt: "2026-03-22T09:14:00.000Z",
    completedAt: "2026-03-22T09:16:22.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 1247,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 48, avgProcessingTimeWith: 18,
      exceptionsWithout: 474, exceptionsWith: 212,
      manualTouchesWithout: 2993, manualTouchesWith: 997,
      costPerInvoiceWithout: 28.0, costPerInvoiceWith: 10.5,
      timeReductionPercentage: 62, exceptionReductionPercentage: 55,
      manualTouchReductionPercentage: 67, costSavingsPerInvoice: 17.5,
      fteHoursSaved: 374, annualFTESavings: 2.16, annualCostSavings: 156480,
      processingSpeedupFactor: 2.67, autoResolvedCount: 262,
      accuracyWith: 97.4, accuracyImprovement: 9.8,
      stpRateWithout: 51, stpRateWith: 87, stpImprovement: 36,
    },
  },
  {
    id: "preset-po-matching-7d",
    agentName: "PO Matching Agent",
    timePeriod: "7days",
    startedAt: "2026-03-16T11:05:00.000Z",
    completedAt: "2026-03-16T11:06:41.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 1189,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 53, avgProcessingTimeWith: 21,
      exceptionsWithout: 428, exceptionsWith: 142,
      manualTouchesWithout: 3091, manualTouchesWith: 594,
      costPerInvoiceWithout: 30.92, costPerInvoiceWith: 12.25,
      timeReductionPercentage: 60, exceptionReductionPercentage: 67,
      manualTouchReductionPercentage: 81, costSavingsPerInvoice: 18.67,
      fteHoursSaved: 634, annualFTESavings: 4.88, annualCostSavings: 347000,
      processingSpeedupFactor: 2.52, autoResolvedCount: 286,
      accuracyWith: 97.3, accuracyImprovement: 12.0,
      stpRateWithout: 45, stpRateWith: 84, stpImprovement: 39,
    },
  },
  {
    id: "preset-bank-details-3m",
    agentName: "Bank details checker",
    timePeriod: "3months",
    startedAt: "2026-03-12T09:11:00.000Z",
    completedAt: "2026-03-12T09:14:22.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 5471,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 46, avgProcessingTimeWith: 20,
      exceptionsWithout: 1914, exceptionsWith: 931,
      manualTouchesWithout: 12030, manualTouchesWith: 4372,
      costPerInvoiceWithout: 26.83, costPerInvoiceWith: 11.67,
      timeReductionPercentage: 57, exceptionReductionPercentage: 51,
      manualTouchReductionPercentage: 64, costSavingsPerInvoice: 15.17,
      fteHoursSaved: 2381, annualFTESavings: 4.58, annualCostSavings: 317400,
      processingSpeedupFactor: 2.3, autoResolvedCount: 983,
      accuracyWith: 98.5, accuracyImprovement: 11.2,
      stpRateWithout: 50, stpRateWith: 77, stpImprovement: 27,
    },
  },
  {
    id: "preset-po-matching",
    agentName: "PO Matching Agent",
    timePeriod: "3months",
    startedAt: "2026-03-12T08:22:00.000Z",
    completedAt: "2026-03-12T08:27:33.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 5104,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 55, avgProcessingTimeWith: 23,
      exceptionsWithout: 2093, exceptionsWith: 765,
      manualTouchesWithout: 14291, manualTouchesWith: 3062,
      costPerInvoiceWithout: 32.08, costPerInvoiceWith: 13.42,
      timeReductionPercentage: 58, exceptionReductionPercentage: 63,
      manualTouchReductionPercentage: 79, costSavingsPerInvoice: 18.67,
      fteHoursSaved: 2722, annualFTESavings: 5.25, annualCostSavings: 363000,
      processingSpeedupFactor: 2.39, autoResolvedCount: 1328,
      accuracyWith: 96.9, accuracyImprovement: 11.4,
      stpRateWithout: 47, stpRateWith: 82, stpImprovement: 35,
    },
  },
  {
    id: "preset-bank-details",
    agentName: "Bank details checker",
    timePeriod: "30days",
    startedAt: "2026-03-08T15:44:00.000Z",
    completedAt: "2026-03-08T15:46:51.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 1831,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 44, avgProcessingTimeWith: 22,
      exceptionsWithout: 641, exceptionsWith: 329,
      manualTouchesWithout: 4029, manualTouchesWith: 1647,
      costPerInvoiceWithout: 25.67, costPerInvoiceWith: 12.83,
      timeReductionPercentage: 50, exceptionReductionPercentage: 49,
      manualTouchReductionPercentage: 59, costSavingsPerInvoice: 12.83,
      fteHoursSaved: 671, annualFTESavings: 3.87, annualCostSavings: 281880,
      processingSpeedupFactor: 2.0, autoResolvedCount: 312,
      accuracyWith: 98.2, accuracyImprovement: 10.6,
      stpRateWithout: 53, stpRateWith: 79, stpImprovement: 26,
    },
  },
  {
    id: "preset-semantic-match",
    agentName: "Semantic Match Agent",
    timePeriod: "3months",
    startedAt: "2026-03-03T10:18:00.000Z",
    completedAt: "2026-03-03T10:23:14.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 4217,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 51, avgProcessingTimeWith: 17,
      exceptionsWithout: 1645, exceptionsWith: 675,
      manualTouchesWithout: 10963, manualTouchesWith: 2952,
      costPerInvoiceWithout: 29.75, costPerInvoiceWith: 9.92,
      timeReductionPercentage: 67, exceptionReductionPercentage: 59,
      manualTouchReductionPercentage: 73, costSavingsPerInvoice: 19.83,
      fteHoursSaved: 2388, annualFTESavings: 4.60, annualCostSavings: 317940,
      processingSpeedupFactor: 3.0, autoResolvedCount: 970,
      accuracyWith: 97.1, accuracyImprovement: 12.1,
      stpRateWithout: 49, stpRateWith: 85, stpImprovement: 36,
    },
  },
  {
    id: "preset-gl-posting",
    agentName: "GL Posting Agent",
    timePeriod: "7days",
    startedAt: "2026-02-24T16:55:00.000Z",
    completedAt: "2026-02-24T16:57:03.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 438,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 37, avgProcessingTimeWith: 11,
      exceptionsWithout: 118, exceptionsWith: 26,
      manualTouchesWithout: 745, manualTouchesWith: 88,
      costPerInvoiceWithout: 21.58, costPerInvoiceWith: 6.42,
      timeReductionPercentage: 70, exceptionReductionPercentage: 78,
      manualTouchReductionPercentage: 88, costSavingsPerInvoice: 15.17,
      fteHoursSaved: 190, annualFTESavings: 2.19, annualCostSavings: 159600,
      processingSpeedupFactor: 3.36, autoResolvedCount: 92,
      accuracyWith: 98.7, accuracyImprovement: 13.5,
      stpRateWithout: 61, stpRateWith: 94, stpImprovement: 33,
    },
  },
  {
    id: "preset-high-value",
    agentName: "High value invoices",
    timePeriod: "3months",
    startedAt: "2026-02-17T13:29:00.000Z",
    completedAt: "2026-02-17T13:34:41.000Z",
    status: "completed",
    progress: 100,
    displayInvoiceCount: 2659,
    invoiceComparisons: [],
    metrics: {
      avgProcessingTimeWithout: 58, avgProcessingTimeWith: 35,
      exceptionsWithout: 877, exceptionsWith: 479,
      manualTouchesWithout: 6115, manualTouchesWith: 3485,
      costPerInvoiceWithout: 33.83, costPerInvoiceWith: 20.42,
      timeReductionPercentage: 40, exceptionReductionPercentage: 45,
      manualTouchReductionPercentage: 43, costSavingsPerInvoice: 13.42,
      fteHoursSaved: 1020, annualFTESavings: 2.94, annualCostSavings: 213000,
      processingSpeedupFactor: 1.66, autoResolvedCount: 398,
      accuracyWith: 95.3, accuracyImprovement: 6.8,
      stpRateWithout: 55, stpRateWith: 68, stpImprovement: 13,
    },
  },
]

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function BackTestPanel() {
  const [runs, setRuns] = useState<BackTestRun[]>(PRESET_RUNS)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const activeComparisons = useRef<Record<string, InvoiceComparison[]>>({})

  // Load history from localStorage on mount, merging with presets
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY)
      if (storedVersion !== STORAGE_VERSION) {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION)
        setRuns(PRESET_RUNS)
        return
      }
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as BackTestRun[]
        const cleaned = parsed.map(r =>
          r.status === "running"
            ? { ...r, status: "completed" as const, completedAt: r.completedAt ?? new Date().toISOString() }
            : r
        )
        // Always include presets that aren't already in stored history
        const storedIds = new Set(cleaned.map(r => r.id))
        const missingPresets = PRESET_RUNS.filter(p => !storedIds.has(p.id))
        const merged = [...cleaned, ...missingPresets]
        setRuns(merged)
        saveRuns(merged)
      } else {
        setRuns(PRESET_RUNS)
      }
    } catch (e) {
      console.error("[BackTestPanel] Failed to load history:", e)
      setRuns(PRESET_RUNS)
    }
  }, [])

  useEffect(() => {
    const onStarted = (e: Event) => {
      const { runId, agentName, timePeriod } = (e as CustomEvent).detail
      activeComparisons.current[runId] = []
      const newRun: BackTestRun = {
        id: runId,
        agentName,
        timePeriod,
        startedAt: new Date().toISOString(),
        completedAt: null,
        status: "running",
        progress: 0,
        metrics: null,
        invoiceComparisons: [],
      }
      setRuns(prev => {
        const updated = [newRun, ...prev]
        saveRuns(updated)
        return updated
      })
      setExpandedId(runId)
    }

    const onProgress = (e: Event) => {
      const { runId, progress, recentComparisons } = (e as CustomEvent).detail
      if (activeComparisons.current[runId] === undefined) {
        activeComparisons.current[runId] = []
      }
      activeComparisons.current[runId] = [
        ...activeComparisons.current[runId],
        ...recentComparisons,
      ].slice(0, MAX_COMPARISONS_PER_RUN)
      setRuns(prev => prev.map(r => r.id === runId ? { ...r, progress } : r))
    }

    const onComplete = (e: Event) => {
      const { runId, metrics, agentName, timePeriod } = (e as CustomEvent).detail
      const comparisons = activeComparisons.current[runId] ?? []
      delete activeComparisons.current[runId]
      setRuns(prev => {
        const exists = prev.some(r => r.id === runId)
        const finishedRun = {
          id: runId,
          agentName: agentName ?? "Unknown Agent",
          timePeriod: timePeriod ?? "unknown",
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          status: "completed" as const,
          progress: 100,
          metrics,
          invoiceComparisons: comparisons,
        }
        const updated = exists
          ? prev.map(r => r.id === runId ? { ...r, ...finishedRun } : r)
          : [finishedRun, ...prev]
        saveRuns(updated)
        return updated
      })
    }

    window.addEventListener("back-test-started", onStarted)
    window.addEventListener("back-test-progress", onProgress)
    window.addEventListener("back-test-complete", onComplete)
    return () => {
      window.removeEventListener("back-test-started", onStarted)
      window.removeEventListener("back-test-progress", onProgress)
      window.removeEventListener("back-test-complete", onComplete)
    }
  }, [])

  const handleRunNew = () => {
    window.dispatchEvent(new CustomEvent("back-test-run-new"))
  }

  if (runs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-12">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-950 mb-1.5">No back tests yet</h3>
          <p className="text-sm text-gray-500">
            Go to <span className="font-medium text-gray-700">Agent Builder</span>, select an agent, and click <span className="font-medium text-gray-700">Back-test agent</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-950">Back Test History</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (runs.some(r => r.status === "running")) return
                setRuns([])
                setExpandedId(null)
                try { localStorage.removeItem(STORAGE_KEY) } catch {}
              }}
              disabled={runs.some(r => r.status === "running")}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Clear history
            </button>
            <Button variant="outline" size="sm" onClick={handleRunNew}>
              Run New Test
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {runs.map(run => {
            const isExpanded = expandedId === run.id
            const isRunning = run.status === "running"

            return (
              <Card key={run.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    {isRunning ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        Running
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                        <Check className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-950 truncate">
                        {run.agentName}
                        <span className="ml-2 text-gray-400 font-normal">· {timePeriodLabel(run.timePeriod)}</span>
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(run.startedAt)}</span>
                  </div>

                  {isRunning && (
                    <div className="mt-3 ml-7">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all duration-300 rounded-full"
                          style={{ width: `${run.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{run.progress.toFixed(0)}% complete</p>
                    </div>
                  )}

                  {!isRunning && !isExpanded && run.metrics && (
                    <div className="mt-2 ml-7 flex items-center gap-4 text-xs text-gray-500">
                      {run.metrics.stpRateWith != null && (
                        <>
                          <span className="text-green-600 font-medium">STP {run.metrics.stpRateWith.toFixed(0)}%</span>
                          <span>·</span>
                        </>
                      )}
                      <span className="text-green-600 font-medium">↓ {run.metrics.timeReductionPercentage.toFixed(0)}% faster</span>
                      <span>·</span>
                      <span className="text-green-600 font-medium">↓ {run.metrics.exceptionReductionPercentage.toFixed(0)}% fewer exceptions</span>
                      <span>·</span>
                      <span>{(run.displayInvoiceCount ?? run.invoiceComparisons.length).toLocaleString()} invoices tested</span>
                    </div>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    {isRunning ? (
                      <div className="py-4 text-center text-sm text-gray-500">
                        Test in progress — results will appear here when complete.
                      </div>
                    ) : (
                      <RunResults run={run} />
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Export a hook so settings/page.tsx can track active test state for the tab indicator
export function useBackTestActive(): boolean {
  const [isActive, setIsActive] = useState(false)
  useEffect(() => {
    const onStart = () => setIsActive(true)
    const onComplete = () => setIsActive(false)
    window.addEventListener("back-test-started", onStart)
    window.addEventListener("back-test-complete", onComplete)
    return () => {
      window.removeEventListener("back-test-started", onStart)
      window.removeEventListener("back-test-complete", onComplete)
    }
  }, [])
  return isActive
}
