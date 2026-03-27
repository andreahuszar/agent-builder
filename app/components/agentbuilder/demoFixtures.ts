/**
 * Demo fixtures for specific agents used in live demos.
 * When isDemoAgent() returns true, runBulkTest() bypasses the simulation
 * and dispatches pre-built results so the numbers are always predictable.
 */

import type { ComparisonMetrics, InvoiceComparison } from './comparisonMetrics'

// ─── Agent name matching ──────────────────────────────────────────────────────

const DEMO_AGENT_NAMES = [
  "Reject Word Formatted Invoices",
  "Reject Word Formatted Invoices Agent",
  "Reject word formatted invoices",
  "Reject word formatted invoices Agent",
]

export function isDemoAgent(name: string): boolean {
  return DEMO_AGENT_NAMES.some(n => n.toLowerCase() === name.toLowerCase().trim())
}

// ─── Seeded RNG (deterministic, no external deps) ────────────────────────────

class SeededRng {
  private s: number
  constructor(seed: number) { this.s = seed }
  next(): number {
    this.s = (this.s * 9301 + 49297) % 233280
    return this.s / 233280
  }
  int(min: number, max: number) { return Math.floor(this.next() * (max - min + 1)) + min }
  float(min: number, max: number) { return this.next() * (max - min) + min }
  pick<T>(arr: T[]): T { return arr[this.int(0, arr.length - 1)] }
}

// ─── Static data pools ───────────────────────────────────────────────────────

const VENDORS = [
  "Acme Corporation", "TechSupply Inc", "Global Services Ltd", "Office Depot",
  "CloudHost Services", "SecurePay Systems", "DataFlow Solutions", "Prime Vendor Co",
  "Mega Supplies LLC", "Quick Logistics", "Elite Services", "ProTech Industries",
  "Alpha Manufacturing", "Beta Distributors", "Gamma Solutions",
]

const IMPORT_SOURCES = ["email", "portal", "api", "scan"]

const HELD_STAGES_WITHOUT = [
  "Matched", "Matched", "Matched",        // most common — processing gets through matching before failure
  "Verified", "Verified",
  "Data Captured",
  "Approved",
  "Rejected",
] as const

const HELD_STAGES_GROUP_C = [
  "Verified", "Verified",
  "Matched", "Matched",
  "Data Captured",
  "Rejected",
] as const

// ─── Invoice count per time period ───────────────────────────────────────────

function invoiceCount(timePeriod: string): number {
  return ({ "7days": 1500, "30days": 6200, "3months": 18500, "6months": 37000 } as Record<string, number>)[timePeriod] ?? 1500
}

function formatDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split("T")[0]
}

const VENDOR_PREFIXES = ["HES","NCL","CES","VFM","ADM","RCC","PPM","CTA","IBF","AMS","SLG","TOI","KSS","HL","BCS"]

function generateInvoiceNumber(rng: SeededRng): string {
  const fmt = rng.int(0, 10)
  switch (fmt) {
    case 0:  return `INV-2025-${rng.int(10000, 99999)}`
    case 1:  return `SINV/${rng.int(1000, 9999)}`
    case 2:  return `PI-25-${String(rng.int(100, 9999)).padStart(4, "0")}`
    case 3:  return `AP${rng.int(100000, 999999)}`
    case 4:  return `${rng.int(1000000, 9999999)}`
    case 5:  return `INV${rng.int(1000000, 9999999)}`
    case 6:  return `${rng.pick(VENDOR_PREFIXES)}-${rng.int(2024, 2025)}-${rng.int(1000, 9999)}`
    case 7:  return `${rng.int(2024, 2025)}/${String(rng.int(1000, 9999))}`
    case 8:  return `REF-${rng.int(10000, 99999)}-A`
    case 9:  return `${rng.pick(VENDOR_PREFIXES)}/INV/${rng.int(10, 99)}-${rng.int(1000, 9999)}`
    default: return `INV-2025-${String(rng.int(100, 9999)).padStart(5, "0")}`
  }
}

// ─── Build demo results ───────────────────────────────────────────────────────

export function buildDemoResults(timePeriod: string): {
  comparisons: InvoiceComparison[]
  metrics: ComparisonMetrics
} {
  const total = Math.min(invoiceCount(timePeriod), 500) // cap at 500 for the table
  const rng = new SeededRng(42) // fixed seed = same results every run

  // Group sizes
  const groupA = Math.round(total * 0.40) // 40% — Posted without, Posted STP with
  const groupB = Math.round(total * 0.33) // 33% — Held without (Word), Rejected with
  const groupC = total - groupA - groupB  // 27% — Held without (other), Posted with

  const groupARows: InvoiceComparison[] = []
  const groupBRows: InvoiceComparison[] = []
  const groupCRows: InvoiceComparison[] = []

  // ── Group A: Posted without agent (1–2 touches) → Rejected at Invoice Import with agent ──
  for (let i = 0; i < groupA; i++) {
    const touches = rng.next() < 0.6 ? rng.int(1, 2) : 0
    const timeWithout = rng.float(8, 22)
    groupARows.push({
      invoiceId: `INV-2024-${String(10000 + i).padStart(5, "0")}`,
      invoiceNumber: generateInvoiceNumber(rng),
      vendor: rng.pick(VENDORS),
      amount: parseFloat(rng.float(120, 48000).toFixed(2)),
      date: formatDate(rng.int(0, 89)),
      importSource: rng.pick(IMPORT_SOURCES),
      hasIssue: false,
      withoutAgent: {
        outcome: "passed",
        pipelineStage: "Posted",
        isSTP: touches === 0,
        processingTimeMinutes: timeWithout,
        manualTouches: touches,
      },
      withAgent: {
        agentAction: "auto_resolved",
        pipelineStage: "Rejected",
        isSTP: false,
        processingTimeMinutes: 0.5,
        manualTouches: 0,
      },
      improvement: {
        outcome: "better",
        highlights: ["Caught at ingestion", "Vendor notified", "Rejected at Invoice Import"],
      },
    })
  }

  // ── Group B: Held without (Word format) → Rejected with agent ──
  for (let i = 0; i < groupB; i++) {
    const heldStage = rng.pick(HELD_STAGES_WITHOUT)
    const timeWithout = rng.float(18, 45)
    const touchesWithout = rng.int(1, 3)
    groupBRows.push({
      invoiceId: `INV-2024-${String(10000 + groupA + i).padStart(5, "0")}`,
      invoiceNumber: generateInvoiceNumber(rng),
      vendor: rng.pick(VENDORS),
      amount: parseFloat(rng.float(200, 25000).toFixed(2)),
      date: formatDate(rng.int(0, 89)),
      importSource: rng.pick(["email", "email", "portal", "scan"]),
      hasIssue: true,
      issueDescription: "Invoice submitted in unsupported .docx format",
      exceptionType: "file_format",
      withoutAgent: {
        outcome: "blocked",
        pipelineStage: heldStage,
        isSTP: false,
        processingTimeMinutes: timeWithout,
        manualTouches: touchesWithout,
      },
      withAgent: {
        agentAction: "auto_resolved",
        pipelineStage: "Rejected",
        isSTP: false,
        processingTimeMinutes: 1,
        manualTouches: 0,
      },
      improvement: {
        outcome: "better",
        highlights: ["Caught at ingestion", `${touchesWithout} fewer touch${touchesWithout > 1 ? "es" : ""}`, "Vendor notified"],
      },
    })
  }

  // ── Group C: Held without (non-Word issues) → Rejected at Invoice Import with agent ──
  for (let i = 0; i < groupC; i++) {
    const heldStage = rng.pick(HELD_STAGES_GROUP_C)
    const timeWithout = rng.float(20, 60)
    const touchesWithout = rng.int(1, 4)
    const timeWith = rng.float(2, 6)
    groupCRows.push({
      invoiceId: `INV-2024-${String(10000 + groupA + groupB + i).padStart(5, "0")}`,
      invoiceNumber: generateInvoiceNumber(rng),
      vendor: rng.pick(VENDORS),
      amount: parseFloat(rng.float(500, 35000).toFixed(2)),
      date: formatDate(rng.int(0, 89)),
      importSource: rng.pick(IMPORT_SOURCES),
      hasIssue: true,
      withoutAgent: {
        outcome: "blocked",
        pipelineStage: heldStage,
        isSTP: false,
        processingTimeMinutes: timeWithout,
        manualTouches: touchesWithout,
      },
      withAgent: {
        agentAction: "auto_resolved",
        pipelineStage: "Rejected",
        isSTP: false,
        processingTimeMinutes: timeWith,
        manualTouches: 0,
      },
      improvement: {
        outcome: "better",
        highlights: ["Caught at ingestion", `${touchesWithout} fewer touch${touchesWithout > 1 ? "es" : ""}`, "Vendor notified"],
      },
    })
  }

  // Interleave all three groups so each page of the table shows a realistic mix
  const comparisons: InvoiceComparison[] = []
  const maxLen = Math.max(groupARows.length, groupBRows.length, groupCRows.length)
  for (let i = 0; i < maxLen; i++) {
    if (i < groupARows.length) comparisons.push(groupARows[i])
    if (i < groupBRows.length) comparisons.push(groupBRows[i])
    if (i < groupCRows.length) comparisons.push(groupCRows[i])
  }

  // ─── Per-invoice overrides ────────────────────────────────────────────────
  // Force specific invoices to a known state for demo clarity

  // Without the agent, Word-format invoices wouldn't be explicitly rejected —
  // they'd get stuck in the pipeline. Replace any "Rejected" without-agent stage
  // with "Matched" so the story makes sense.
  for (let idx = 0; idx < comparisons.length; idx++) {
    if (comparisons[idx].withoutAgent.pipelineStage === "Rejected") {
      comparisons[idx] = {
        ...comparisons[idx],
        withoutAgent: {
          ...comparisons[idx].withoutAgent,
          pipelineStage: "Matched",
          outcome: "blocked",
        },
      }
    }
  }

  const inv10201 = comparisons.findIndex(c => c.invoiceId === "INV-2024-10201")
  if (inv10201 !== -1) {
    comparisons[inv10201] = {
      ...comparisons[inv10201],
      hasIssue: false,
      issueDescription: undefined,
      exceptionType: undefined,
      withoutAgent: {
        ...comparisons[inv10201].withoutAgent,
        outcome: "passed",
        pipelineStage: "Posted",
        isSTP: false,
      },
      improvement: {
        outcome: comparisons[inv10201].withAgent.isSTP ? "better" : "same",
        highlights: [],
      },
    }
  }

  // ─── Compute metrics from the fixture data ───────────────────────────────

  const avgTimeWithout = comparisons.reduce((s, c) => s + c.withoutAgent.processingTimeMinutes, 0) / total
  const avgTimeWith = comparisons.reduce((s, c) => s + c.withAgent.processingTimeMinutes, 0) / total
  const timeReductionMinutes = avgTimeWithout - avgTimeWith
  const timeReductionPercentage = (timeReductionMinutes / avgTimeWithout) * 100

  const exceptionsWithout = comparisons.filter(c => c.withoutAgent.pipelineStage !== "Posted").length
  const exceptionsWith = comparisons.filter(c => c.withAgent.pipelineStage !== "Posted" && c.withAgent.pipelineStage !== "Rejected").length
  const exceptionReduction = exceptionsWithout - exceptionsWith
  const exceptionReductionPercentage = exceptionsWithout > 0 ? (exceptionReduction / exceptionsWithout) * 100 : 0
  const autoResolvedCount = comparisons.filter(c => c.withAgent.agentAction === "auto_resolved").length

  const manualTouchesWithout = comparisons.reduce((s, c) => s + c.withoutAgent.manualTouches, 0)
  const manualTouchesWith = comparisons.reduce((s, c) => s + c.withAgent.manualTouches, 0)
  const manualTouchReduction = manualTouchesWithout - manualTouchesWith
  const manualTouchReductionPercentage = manualTouchesWithout > 0 ? (manualTouchReduction / manualTouchesWithout) * 100 : 0

  const HOURLY_RATE = 35
  const HOURS_PER_FTE_MONTH = 160
  const fteHoursWithout = (comparisons.reduce((s, c) => s + c.withoutAgent.processingTimeMinutes, 0)) / 60
  const fteHoursWith = (comparisons.reduce((s, c) => s + c.withAgent.processingTimeMinutes, 0)) / 60
  const fteHoursSaved = fteHoursWithout - fteHoursWith
  const fteHoursSavedPercentage = fteHoursWithout > 0 ? (fteHoursSaved / fteHoursWithout) * 100 : 0

  const monthlyFTEWithout = fteHoursWithout / HOURS_PER_FTE_MONTH
  const monthlyFTEWith = fteHoursWith / HOURS_PER_FTE_MONTH
  const annualFTEWithout = monthlyFTEWithout * 12
  const annualFTEWith = monthlyFTEWith * 12
  const annualFTESavings = annualFTEWithout - annualFTEWith

  const costPerInvoiceWithout = (fteHoursWithout * HOURLY_RATE) / total
  const costPerInvoiceWith = (fteHoursWith * HOURLY_RATE) / total
  const costSavingsPerInvoice = costPerInvoiceWithout - costPerInvoiceWith
  const totalCostWithout = fteHoursWithout * HOURLY_RATE
  const totalCostWith = fteHoursWith * HOURLY_RATE
  const totalCostSavings = totalCostWithout - totalCostWith
  const annualCostWithout = annualFTEWithout * HOURS_PER_FTE_MONTH * HOURLY_RATE
  const annualCostWith = annualFTEWith * HOURS_PER_FTE_MONTH * HOURLY_RATE
  const annualCostSavings = annualCostWithout - annualCostWith

  const stpRateWithout = (comparisons.filter(c => c.withoutAgent.isSTP).length / total) * 100
  const stpRateWith = (comparisons.filter(c => c.withAgent.isSTP).length / total) * 100

  // Override avg processing time without agent to a realistic 14m for this rejection agent
  // (previously computed from simulation groups which skewed too high)
  const overrideTimeWithout = 14
  const overrideTimeReductionMinutes = overrideTimeWithout - avgTimeWith
  const overrideTimeReductionPercentage = (overrideTimeReductionMinutes / overrideTimeWithout) * 100

  // STP should decrease for a rejection agent — invoices that previously trickled through
  // are now caught and rejected, reducing the straight-through rate
  const overrideStpWithout = 51
  const overrideStpWith = 43

  const metrics: ComparisonMetrics = {
    avgProcessingTimeWithout: overrideTimeWithout,
    avgProcessingTimeWith: avgTimeWith,
    timeReductionMinutes: overrideTimeReductionMinutes,
    timeReductionPercentage: overrideTimeReductionPercentage,
    exceptionsWithout,
    exceptionsWith,
    exceptionReduction,
    exceptionReductionPercentage,
    autoResolvedCount,
    accuracyWithout: 82,
    accuracyWith: 97,
    accuracyImprovement: 15,
    manualTouchesWithout,
    manualTouchesWith,
    manualTouchReduction,
    manualTouchReductionPercentage,
    fteHoursWithout,
    fteHoursWith,
    fteHoursSaved,
    fteHoursSavedPercentage,
    monthlyFTEWithout,
    monthlyFTEWith,
    monthlyFTESavings: monthlyFTEWithout - monthlyFTEWith,
    annualFTEWithout,
    annualFTEWith,
    annualFTESavings,
    costPerInvoiceWithout,
    costPerInvoiceWith,
    costSavingsPerInvoice,
    totalCostWithout,
    totalCostWith,
    totalCostSavings,
    annualCostWithout,
    annualCostWith,
    annualCostSavings,
    processingSpeedupFactor: overrideTimeWithout / Math.max(avgTimeWith, 0.1),
    exceptionReductionFactor: exceptionReductionPercentage / 100,
    stpRateWithout: overrideStpWithout,
    stpRateWith: overrideStpWith,
    stpImprovement: overrideStpWith - overrideStpWithout,
  }

  return { comparisons, metrics }
}
