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
}

export interface InvoiceComparison {
  invoiceId: string;
  vendor: string;
  amount: number;
  hasIssue: boolean;
  issueDescription?: string;
  
  // Without agent
  withoutAgent: {
    outcome: string;
    processingTimeMinutes: number;
    requiresManualReview: boolean;
    manualTouches: number;
    status: string;
    details: string;
  };
  
  // With agent
  withAgent: {
    outcome: string;
    processingTimeMinutes: number;
    agentAction: string;
    agentConfidence: number;
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
  totalInvoices: number
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
  };
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
    
    return {
      invoiceId: scenario.id,
      vendor: scenario.vendor,
      amount: scenario.amount,
      hasIssue: scenario.hasIssue,
      issueDescription: scenario.issueDescription,
      
      withoutAgent: {
        outcome: baseline.outcome,
        processingTimeMinutes: baseline.processingTimeMinutes,
        requiresManualReview: baseline.requiresManualReview,
        manualTouches: baseline.manualTouches,
        status: baseline.status,
        details: baseline.details,
      },
      
      withAgent: {
        outcome: agent.outcome,
        processingTimeMinutes: agent.processingTimeMinutes + agent.manualReviewTimeMinutes,
        agentAction: agent.agentAction,
        agentConfidence: agent.agentConfidence,
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
