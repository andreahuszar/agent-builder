"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight, TrendingDown, Check } from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"

const STORAGE_KEY = "xelix-back-test-history"
const MAX_COMPARISONS_PER_RUN = 500

interface InvoiceComparison {
  invoiceId: string
  vendor: string
  amount: number
  withoutAgent: { outcome: string; processingTimeMinutes: number; manualTouches: number }
  withAgent: { agentAction: string; processingTimeMinutes: number; manualTouches: number }
  improvement: { outcome: string; highlights: string[] }
  hasIssue: boolean
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
}

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
  } catch (e) {
    console.warn("[BackTestPanel] Failed to save to localStorage:", e)
  }
}

// ─── Expanded Results View ────────────────────────────────────────────────────

function RunResults({ run }: { run: BackTestRun }) {
  const [withoutFilter, setWithoutFilter] = useState("all")
  const [withFilter, setWithFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [page, setPage] = useState(1)
  const rowsPerPage = 50

  const { metrics, invoiceComparisons } = run

  const filtered = invoiceComparisons.filter(c => {
    if (withoutFilter !== "all" && c.withoutAgent.outcome !== withoutFilter) return false
    if (withFilter !== "all" && c.withAgent.agentAction !== withFilter) return false
    if (statusFilter === "pass" && c.improvement.outcome !== "better") return false
    if (statusFilter === "fail" && !c.hasIssue) return false
    return true
  })

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      {metrics && (
        <>
          {/* 3-column metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Without Agent</p>
              <div className="space-y-2">
                <div><p className="text-xs text-gray-400">Avg Time</p><p className="text-lg font-bold text-gray-900">{metrics.avgProcessingTimeWithout.toFixed(1)} min</p></div>
                <div><p className="text-xs text-gray-400">Exceptions</p><p className="text-lg font-bold text-gray-900">{metrics.exceptionsWithout.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-400">Manual Touches</p><p className="text-lg font-bold text-gray-900">{metrics.manualTouchesWithout.toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-400">Cost/Invoice</p><p className="text-lg font-bold text-gray-900">${metrics.costPerInvoiceWithout.toFixed(2)}</p></div>
              </div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">With Agent</p>
              <div className="space-y-2">
                <div><p className="text-xs text-purple-500">Avg Time</p><p className="text-lg font-bold text-purple-900">{metrics.avgProcessingTimeWith.toFixed(1)} min</p></div>
                <div><p className="text-xs text-purple-500">Exceptions</p><p className="text-lg font-bold text-purple-900">{metrics.exceptionsWith.toLocaleString()}</p></div>
                <div><p className="text-xs text-purple-500">Manual Touches</p><p className="text-lg font-bold text-purple-900">{metrics.manualTouchesWith.toLocaleString()}</p></div>
                <div><p className="text-xs text-purple-500">Cost/Invoice</p><p className="text-lg font-bold text-purple-900">${metrics.costPerInvoiceWith.toFixed(2)}</p></div>
              </div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Improvement</p>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-green-600 shrink-0" /><div><p className="text-xs text-green-600">Time Saved</p><p className="text-lg font-bold text-green-900">{metrics.timeReductionPercentage.toFixed(0)}%</p></div></div>
                <div className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-green-600 shrink-0" /><div><p className="text-xs text-green-600">Fewer Exceptions</p><p className="text-lg font-bold text-green-900">{metrics.exceptionReductionPercentage.toFixed(0)}%</p></div></div>
                <div className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-green-600 shrink-0" /><div><p className="text-xs text-green-600">Fewer Touches</p><p className="text-lg font-bold text-green-900">{metrics.manualTouchReductionPercentage.toFixed(0)}%</p></div></div>
                <div className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5 text-green-600 shrink-0" /><div><p className="text-xs text-green-600">Cost Savings</p><p className="text-lg font-bold text-green-900">${metrics.costSavingsPerInvoice.toFixed(2)}</p></div></div>
              </div>
            </div>
          </div>

          {/* 2-column summary */}
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
        </>
      )}

      {/* Invoice table */}
      {invoiceComparisons.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-950">
              Invoice-by-Invoice Comparison
              {invoiceComparisons.length >= MAX_COMPARISONS_PER_RUN && (
                <span className="ml-2 text-xs font-normal text-gray-400">(first {MAX_COMPARISONS_PER_RUN} invoices shown)</span>
              )}
            </p>
            <div className="flex gap-1.5">
              <Select value={withoutFilter} onValueChange={v => { setWithoutFilter(v); setPage(1) }}>
                <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue placeholder="Without Agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="pass">Passed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={withFilter} onValueChange={v => { setWithFilter(v); setPage(1) }}>
                <SelectTrigger className="h-7 text-xs w-[120px]"><SelectValue placeholder="With Agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="auto_resolved">Auto-resolved</SelectItem>
                  <SelectItem value="suggested_resolution">Suggested</SelectItem>
                  <SelectItem value="observed">Observed</SelectItem>
                  <SelectItem value="escalated_to_human">Escalated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="h-7 text-xs w-[100px]"><SelectValue placeholder="Result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pass">Improved</SelectItem>
                  <SelectItem value="fail">With Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 text-gray-600">Invoice ID</th>
                  <th className="text-left p-2 text-gray-600">Vendor</th>
                  <th className="text-right p-2 text-gray-600">Amount</th>
                  <th className="text-left p-2 text-gray-600">Without Agent</th>
                  <th className="text-left p-2 text-gray-600">With Agent</th>
                  <th className="text-left p-2 text-gray-600">Improvement</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-6 text-center text-gray-400">No invoices match the filter.</td></tr>
                ) : (
                  filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage).map((c, idx) => (
                    <tr key={idx} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-2 font-mono text-gray-950">{c.invoiceId}</td>
                      <td className="p-2 text-gray-950">{c.vendor}</td>
                      <td className="p-2 text-right font-medium text-gray-950">${c.amount.toFixed(2)}</td>
                      <td className="p-2">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded inline-block w-fit ${c.withoutAgent.outcome === "pass" ? "bg-green-100 text-green-700" : c.withoutAgent.outcome === "blocked" ? "bg-red-100 text-red-700" : c.withoutAgent.outcome === "delayed" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                            {c.withoutAgent.outcome === "pass" ? "passed" : c.withoutAgent.outcome}
                          </span>
                          <span className="text-xs text-gray-400">{c.withoutAgent.processingTimeMinutes.toFixed(0)}min · {c.withoutAgent.manualTouches} touch{c.withoutAgent.manualTouches !== 1 ? "es" : ""}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded inline-block w-fit ${c.withAgent.agentAction === "auto_resolved" ? "bg-purple-100 text-purple-700" : c.withAgent.agentAction === "suggested_resolution" ? "bg-yellow-100 text-yellow-700" : c.withAgent.agentAction === "observed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                            {c.withAgent.agentAction === "auto_resolved" ? "✓ Auto-resolved" : c.withAgent.agentAction === "suggested_resolution" ? "→ Suggested" : c.withAgent.agentAction === "observed" ? "○ Observed" : "↑ Escalated"}
                          </span>
                          <span className="text-xs text-gray-400">{c.withAgent.processingTimeMinutes.toFixed(0)}min · {c.withAgent.manualTouches} touch{c.withAgent.manualTouches !== 1 ? "es" : ""}</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {c.improvement.highlights.map((h, hi) => <span key={hi} className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{h}</span>)}
                          {c.improvement.highlights.length === 0 && <span className="text-xs text-gray-400">No change</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {Math.ceil(filtered.length / rowsPerPage) > 1 && (
            <div className="flex items-center justify-between mt-2 text-xs">
              <span className="text-gray-500">Showing {((page - 1) * rowsPerPage) + 1}–{Math.min(page * rowsPerPage, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(Math.ceil(filtered.length / rowsPerPage), p + 1))} disabled={page === Math.ceil(filtered.length / rowsPerPage)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function BackTestPanel() {
  const [runs, setRuns] = useState<BackTestRun[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const activeComparisons = useRef<Record<string, InvoiceComparison[]>>({})

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as BackTestRun[]
        // Any run still marked "running" after a page refresh is incomplete
        const cleaned = parsed.map(r =>
          r.status === "running"
            ? { ...r, status: "completed" as const, completedAt: r.completedAt ?? new Date().toISOString() }
            : r
        )
        setRuns(cleaned)
        saveRuns(cleaned)
      }
    } catch (e) {
      console.error("[BackTestPanel] Failed to load history:", e)
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
      // Defensive: initialise accumulator if back-test-started was missed
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
      <div className="max-w-4xl mx-auto p-6">
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
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : run.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Expand chevron */}
                    <span className="text-gray-400 shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>

                    {/* Status badge */}
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

                    {/* Agent name & period */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-950 truncate">
                        {run.agentName}
                        <span className="ml-2 text-gray-400 font-normal">· {timePeriodLabel(run.timePeriod)}</span>
                      </p>
                    </div>

                    {/* Timestamp */}
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(run.startedAt)}</span>
                  </div>

                  {/* Progress bar (in-progress only) */}
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

                  {/* Quick summary (completed, collapsed) */}
                  {!isRunning && !isExpanded && run.metrics && (
                    <div className="mt-2 ml-7 flex items-center gap-4 text-xs text-gray-500">
                      <span className="text-green-600 font-medium">↓ {run.metrics.timeReductionPercentage.toFixed(0)}% faster</span>
                      <span>·</span>
                      <span className="text-green-600 font-medium">↓ {run.metrics.exceptionReductionPercentage.toFixed(0)}% fewer exceptions</span>
                      <span>·</span>
                      <span>{run.invoiceComparisons.length.toLocaleString()} invoices tested</span>
                    </div>
                  )}
                </button>

                {/* Expanded content */}
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
