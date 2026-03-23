/**
 * Comparison Metrics Calculator for Agent Builder
 * Calculates value metrics comparing baseline (without agent) vs agent-assisted processing
 */

import { BaselineResult, BaselineStats } from './baselineSimulator';
import { AgentResult, AgentStats } from './agentSimulator';
import { TestScenario } from './testScenarioGenerator';

export interface ComparisonMetrics {
  // Time savings
  avgProcessingTimeWithout: number; // minutes
  avgProcessingTimeWith: number; // minutes
  timeReductionMinutes: number;
  timeReductionPercentage: number;
  
  // Exception reduction
  exceptionsWithout: number;
  exceptionsWith: number;
  exceptionReduction: number;
  exceptionReductionPercentage: number;
  autoResolvedCount: number;
  
  // Accuracy improvements
  accuracyWithout: number; // percentage
  accuracyWith: number; // percentage
  accuracyImprovement: number; // percentage points
  
  // Cost savings
  manualTouchesWithout: number;
  manualTouchesWith: number;
  manualTouchReduction: number;
  manualTouchReductionPercentage: number;
  
  fteHoursWithout: number;
  fteHoursWith: number;
  fteHoursSaved: number;
  fteHoursSavedPercentage: number;
  
  // Extrapolated savings
  monthlyFTEWithout: number;
  monthlyFTEWith: number;
  monthlyFTESavings: number;
  
  annualFTEWithout: number;
  annualFTEWith: number;
  annualFTESavings: number;
  
  // Cost impact (assuming $35/hour AP clerk rate)
  costPerInvoiceWithout: number;
  costPerInvoiceWith: number;
  costSavingsPerInvoice: number;
  
  totalCostWithout: number;
  totalCostWith: number;
  totalCostSavings: number;
  
  annualCostWithout: number;
  annualCostWith: number;
  annualCostSavings: number;
  
  // ROI metrics
  processingSpeedupFactor: number; // e.g., 15x faster
  exceptionReductionFactor: number; // e.g., 92% fewer exceptions

  // Straight-through processing rates (0-100)
  stpRateWithout: number;
  stpRateWith: number;
  stpImprovement: number; // percentage points gained
}

export interface InvoiceComparison {
  invoiceId: string;
  vendor: string;
  amount: number;
  date: string;
  importSource: string;
  hasIssue: boolean;
  issueDescription?: string;
  exceptionType?: string;

  // Without agent
  withoutAgent: {
    outcome: string;
    pipelineStage: string;
    failureStage?: string;        // set when not "Posted"
    isSTP: boolean;
    processingTimeMinutes: number;
    requiresManualReview: boolean;
    manualTouches: number;
    status: string;
    details: string;
  };
  
  // With agent
  withAgent: {
    outcome: string;
    pipelineStage: string;
    isSTP: boolean;
    processingTimeMinutes: number;
    agentAction: string;
    agentConfidence: number;
    captureAccuracy?: number;     // 0-1 OCR confidence when applicable
    matchConfidence?: number;     // 0-1 match confidence when applicable
    requiresManualReview: boolean;
    manualTouches: number;
    status: string;
    details: string;
    agentReasoning: string;
  };
  
  // Improvement
  improvement: {
    timeReductionMinutes: number;
    timeReductionPercentage: number;
    manualTouchReduction: number;
    outcome: "better" | "same" | "worse";
    highlights: string[];
  };
}

const HOURLY_RATE = 35; // Average AP clerk hourly rate
const HOURS_PER_FTE_MONTH = 160; // 8 hours/day * 20 working days

/**
 * Calculate comprehensive comparison metrics
 */
export function calculateComparisonMetrics(
  baselineStats: BaselineStats,
  agentStats: AgentStats,
  totalInvoices: number,
  stpCountWithout = 0,
  stpCountWith = 0,
): ComparisonMetrics {
  // Time savings
  const avgProcessingTimeWithout = baselineStats.avgProcessingTimeMinutes;
  const avgProcessingTimeWith = agentStats.avgProcessingTimeMinutes + agentStats.avgManualReviewTimeMinutes;
  const timeReductionMinutes = avgProcessingTimeWithout - avgProcessingTimeWith;
  const timeReductionPercentage = (timeReductionMinutes / avgProcessingTimeWithout) * 100;
  
  // Exception reduction
  const exceptionsWithout = baselineStats.requiresManualReview;
  const exceptionsWith = agentStats.requiresManualReview;
  const exceptionReduction = exceptionsWithout - exceptionsWith;
  const exceptionReductionPercentage = (exceptionReduction / exceptionsWithout) * 100;
  const autoResolvedCount = agentStats.autoResolved;
  
  // Accuracy improvements
  const accuracyWithout = baselineStats.avgAccuracy * 100;
  const accuracyWith = agentStats.avgAccuracy * 100;
  const accuracyImprovement = accuracyWith - accuracyWithout;
  
  // Manual touch reduction
  const manualTouchesWithout = baselineStats.totalManualTouches;
  const manualTouchesWith = agentStats.totalManualTouches;
  const manualTouchReduction = manualTouchesWithout - manualTouchesWith;
  const manualTouchReductionPercentage = (manualTouchReduction / manualTouchesWithout) * 100;
  
  // FTE hours
  const fteHoursWithout = baselineStats.totalFTEHours;
  const fteHoursWith = agentStats.totalFTEHours;
  const fteHoursSaved = fteHoursWithout - fteHoursWith;
  const fteHoursSavedPercentage = (fteHoursSaved / fteHoursWithout) * 100;
  
  // Monthly/Annual FTE
  const monthlyFTEWithout = baselineStats.estimatedMonthlyFTE;
  const monthlyFTEWith = agentStats.estimatedMonthlyFTE;
  const monthlyFTESavings = monthlyFTEWithout - monthlyFTEWith;
  
  const annualFTEWithout = baselineStats.estimatedAnnualFTE;
  const annualFTEWith = agentStats.estimatedAnnualFTE;
  const annualFTESavings = annualFTEWithout - annualFTEWith;
  
  // Cost calculations
  const costPerInvoiceWithout = (fteHoursWithout * HOURLY_RATE) / totalInvoices;
  const costPerInvoiceWith = (fteHoursWith * HOURLY_RATE) / totalInvoices;
  const costSavingsPerInvoice = costPerInvoiceWithout - costPerInvoiceWith;
  
  const totalCostWithout = fteHoursWithout * HOURLY_RATE;
  const totalCostWith = fteHoursWith * HOURLY_RATE;
  const totalCostSavings = totalCostWithout - totalCostWith;
  
  const annualCostWithout = monthlyFTEWithout * HOURS_PER_FTE_MONTH * 12 * HOURLY_RATE;
  const annualCostWith = monthlyFTEWith * HOURS_PER_FTE_MONTH * 12 * HOURLY_RATE;
  const annualCostSavings = annualCostWithout - annualCostWith;
  
  // ROI metrics
  const processingSpeedupFactor = avgProcessingTimeWithout / avgProcessingTimeWith;
  const exceptionReductionFactor = exceptionReductionPercentage / 100;

  // STP rates
  const stpRateWithout = totalInvoices > 0 ? (stpCountWithout / totalInvoices) * 100 : 0;
  const stpRateWith = totalInvoices > 0 ? (stpCountWith / totalInvoices) * 100 : 0;
  const stpImprovement = stpRateWith - stpRateWithout;

  return {
    avgProcessingTimeWithout,
    avgProcessingTimeWith,
    timeReductionMinutes,
    timeReductionPercentage,
    
    exceptionsWithout,
    exceptionsWith,
    exceptionReduction,
    exceptionReductionPercentage,
    autoResolvedCount,
    
    accuracyWithout,
    accuracyWith,
    accuracyImprovement,
    
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
    monthlyFTESavings,
    
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
    
    processingSpeedupFactor,
    exceptionReductionFactor,

    stpRateWithout,
    stpRateWith,
    stpImprovement,
  };
}

type PipelineStage = "Imported" | "Data Captured" | "Verified" | "Matched" | "Approved" | "Posted" | "Rejected";

/**
 * Derive the highest pipeline stage reached for an invoice (without agent)
 * "passed" invoices completed the full pipeline; blocked/error invoices show where they were stopped.
 */
function deriveBaselinePipelineStage(
  outcome: string,
  issueType: string | undefined,
  hasIssue: boolean
): PipelineStage {
  if (outcome === "passed") return "Posted";

  if (outcome === "error") {
    // Errors at ingestion/data-capture → rejected early
    if (issueType && ["format_error", "duplicate", "corrupted", "file_format"].includes(issueType)) {
      return "Rejected";
    }
    return "Data Captured";
  }

  if (outcome === "blocked" || outcome === "delayed") {
    if (!issueType) return "Rejected";

    if (["format_error", "duplicate", "corrupted", "file_format", "word_format"].includes(issueType)) {
      return "Rejected";
    }
    if (["missing_fields", "ocr_error", "field_extraction", "customer_id_missing", "bank_details"].includes(issueType)) {
      return "Data Captured";
    }
    if (["policy_violation", "vendor_unverified", "high_value", "missing_po_reference"].includes(issueType)) {
      return "Verified";
    }
    if (["price_variance", "quantity_variance", "no_match", "tolerance_exceeded", "unit_mismatch"].includes(issueType)) {
      return "Matched";
    }
    if (["budget_exceeded", "missing_approval", "approval_timeout"].includes(issueType)) {
      return "Approved";
    }
    if (["gl_code_error", "erp_error", "posting_failed"].includes(issueType)) {
      return "Verified";
    }

    // Default for blocked with unknown issue type
    return "Verified";
  }

  return "Posted";
}

/**
 * Derive the pipeline stage reached with the agent's help
 */
function deriveAgentPipelineStage(
  agentAction: string,
  baselineStage: PipelineStage,
  outcome: string
): PipelineStage {
  // Posted is always the final stage. Any "passed" outcome means the invoice completed the pipeline.
  if (outcome === "passed" || agentAction === "auto_resolved") return "Posted";
  // suggested_resolution where the invoice is still awaiting human sign-off → sits in Approved queue
  // (only applies to non-PO / high-value invoices that genuinely need approval; outcome would be "escalated")
  if (agentAction === "suggested_resolution") {
    // Move one stage forward from where baseline stopped, up to Approved
    const stageOrder: PipelineStage[] = ["Imported", "Data Captured", "Verified", "Matched", "Approved", "Posted"];
    const baseIdx = stageOrder.indexOf(baselineStage);
    const nextIdx = Math.min(baseIdx + 1, stageOrder.indexOf("Approved"));
    return stageOrder[nextIdx] ?? "Approved";
  }
  if (agentAction === "observed") return baselineStage === "Rejected" ? "Verified" : baselineStage;
  if (agentAction === "escalated_to_human") return baselineStage;
  return baselineStage;
}

/**
 * Create invoice-by-invoice comparison
 */
export function createInvoiceComparisons(
  scenarios: TestScenario[],
  baselineResults: BaselineResult[],
  agentResults: AgentResult[]
): InvoiceComparison[] {
  return scenarios.map((scenario, index) => {
    const baseline = baselineResults[index];
    const agent = agentResults[index];
    
    // Calculate improvement
    const timeReductionMinutes = baseline.processingTimeMinutes - agent.processingTimeMinutes;
    const timeReductionPercentage = (timeReductionMinutes / baseline.processingTimeMinutes) * 100;
    const manualTouchReduction = baseline.manualTouches - agent.manualTouches;
    
    // Determine overall outcome
    let outcome: "better" | "same" | "worse" = "same";
    if (timeReductionMinutes > 1 || manualTouchReduction > 0) {
      outcome = "better";
    } else if (timeReductionMinutes < -1 || manualTouchReduction < 0) {
      outcome = "worse";
    }
    
    // Generate highlights
    const highlights: string[] = [];
    
    if (agent.agentAction === "auto_resolved") {
      highlights.push("Fully automated");
    }
    
    if (timeReductionPercentage > 80) {
      highlights.push(`${timeReductionPercentage.toFixed(0)}% faster`);
    }
    
    if (baseline.outcome === "blocked" && agent.outcome === "pass") {
      highlights.push("Unblocked");
    }
    
    if (baseline.outcome === "delayed" && agent.outcome === "pass") {
      highlights.push("No delay");
    }
    
    if (manualTouchReduction > 0) {
      highlights.push(`${manualTouchReduction} fewer touch${manualTouchReduction > 1 ? 'es' : ''}`);
    }
    
    if (agent.agentConfidence > 0.9) {
      highlights.push("High confidence");
    }
    
    const baselinePipelineStage = deriveBaselinePipelineStage(
      baseline.outcome, scenario.issueType, scenario.hasIssue
    );
    const agentPipelineStage = deriveAgentPipelineStage(
      agent.agentAction, baselinePipelineStage, agent.outcome
    );

    // BaselineResult uses "passed" (not "pass")
    const isSTPWithout = baseline.outcome === "passed" && baseline.manualTouches === 0;
    // STP with agent: auto-resolved OR fully passed with zero manual touches (e.g. suggest-mode on clean invoices)
    const isSTPWith = agent.manualTouches === 0 && (agent.agentAction === "auto_resolved" || agent.outcome === "passed");

    return {
      invoiceId: scenario.id,
      vendor: scenario.vendor,
      amount: scenario.amount,
      date: scenario.date,
      importSource: scenario.stageData.ingestion?.sourceChannel ?? "unknown",
      hasIssue: scenario.hasIssue,
      issueDescription: scenario.issueDescription,
      exceptionType: scenario.issueType,

      withoutAgent: {
        outcome: baseline.outcome,
        pipelineStage: baselinePipelineStage,
        failureStage: baselinePipelineStage !== "Posted" ? baselinePipelineStage : undefined,
        isSTP: isSTPWithout,
        processingTimeMinutes: baseline.processingTimeMinutes,
        requiresManualReview: baseline.requiresManualReview,
        manualTouches: baseline.manualTouches,
        status: baseline.status,
        details: baseline.details,
      },
      
      withAgent: {
        outcome: agent.outcome,
        pipelineStage: agentPipelineStage,
        isSTP: isSTPWith,
        processingTimeMinutes: agent.processingTimeMinutes + agent.manualReviewTimeMinutes,
        agentAction: agent.agentAction,
        agentConfidence: agent.agentConfidence,
        captureAccuracy: scenario.stageData.dataCapture?.ocrConfidence,
        matchConfidence: agent.agentAction !== "observed" ? agent.agentConfidence : undefined,
        requiresManualReview: agent.requiresManualReview,
        manualTouches: agent.manualTouches,
        status: agent.status,
        details: agent.details,
        agentReasoning: agent.agentReasoning,
      },
      
      improvement: {
        timeReductionMinutes,
        timeReductionPercentage,
        manualTouchReduction,
        outcome,
        highlights,
      },
    };
  });
}

/**
 * Format metrics for display
 */
export function formatMetricsForDisplay(metrics: ComparisonMetrics): {
  timeSavings: {
    label: string;
    value: string;
    improvement: string;
  }[];
  exceptionReduction: {
    label: string;
    value: string;
    improvement: string;
  }[];
  accuracy: {
    label: string;
    value: string;
    improvement: string;
  }[];
  costSavings: {
    label: string;
    value: string;
    improvement: string;
  }[];
} {
  return {
    timeSavings: [
      {
        label: "Avg Processing Time",
        value: `${metrics.avgProcessingTimeWith.toFixed(1)} min`,
        improvement: `${metrics.timeReductionPercentage.toFixed(0)}% faster`,
      },
      {
        label: "Total Time Saved",
        value: `${metrics.fteHoursSaved.toFixed(0)} hours`,
        improvement: `${metrics.fteHoursSavedPercentage.toFixed(0)}% reduction`,
      },
      {
        label: "Processing Speedup",
        value: `${metrics.processingSpeedupFactor.toFixed(1)}x`,
        improvement: "faster processing",
      },
    ],
    
    exceptionReduction: [
      {
        label: "Exceptions",
        value: `${metrics.exceptionsWith.toLocaleString()}`,
        improvement: `${metrics.exceptionReductionPercentage.toFixed(0)}% fewer`,
      },
      {
        label: "Auto-Resolved",
        value: `${metrics.autoResolvedCount.toLocaleString()}`,
        improvement: "zero human touch",
      },
      {
        label: "Manual Touches",
        value: `${metrics.manualTouchesWith.toLocaleString()}`,
        improvement: `${metrics.manualTouchReductionPercentage.toFixed(0)}% reduction`,
      },
    ],
    
    accuracy: [
      {
        label: "Processing Accuracy",
        value: `${metrics.accuracyWith.toFixed(1)}%`,
        improvement: `+${metrics.accuracyImprovement.toFixed(1)}%`,
      },
      {
        label: "Without Agent",
        value: `${metrics.accuracyWithout.toFixed(1)}%`,
        improvement: "baseline",
      },
    ],
    
    costSavings: [
      {
        label: "Cost per Invoice",
        value: `$${metrics.costPerInvoiceWith.toFixed(2)}`,
        improvement: `-$${metrics.costSavingsPerInvoice.toFixed(2)}`,
      },
      {
        label: "Total Cost Savings",
        value: `$${metrics.totalCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        improvement: `${((metrics.totalCostSavings / metrics.totalCostWithout) * 100).toFixed(0)}% reduction`,
      },
      {
        label: "Annual FTE Savings",
        value: `${metrics.annualFTESavings.toFixed(2)} FTE`,
        improvement: `$${metrics.annualCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      },
    ],
  };
}

/**
 * Generate executive summary text
 */
export function generateExecutiveSummary(metrics: ComparisonMetrics): string {
  const percentages = {
    time: metrics.timeReductionPercentage.toFixed(0),
    exceptions: metrics.exceptionReductionPercentage.toFixed(0),
    cost: ((metrics.totalCostSavings / metrics.totalCostWithout) * 100).toFixed(0),
  };
  
  const speedup = metrics.processingSpeedupFactor.toFixed(1);
  const annualFTE = metrics.annualFTESavings.toFixed(2);
  const annualSavings = metrics.annualCostSavings.toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  return `This agent delivers ${percentages.time}% faster processing (${speedup}x speedup) and reduces exceptions by ${percentages.exceptions}%. ` +
         `It auto-resolves ${metrics.autoResolvedCount.toLocaleString()} invoices that would otherwise require manual review, ` +
         `saving ${annualFTE} FTE annually ($${annualSavings}/year). ` +
         `Processing accuracy improved by ${metrics.accuracyImprovement.toFixed(1)} percentage points.`;
}
