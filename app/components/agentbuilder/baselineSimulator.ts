/**
 * Baseline Simulator for Agent Builder
 * Simulates manual/no-agent invoice processing to establish a baseline for comparison
 */

import { TestScenario } from './testScenarioGenerator';

export interface BaselineResult {
  invoiceId: string;
  vendor: string;
  amount: number;
  
  // Processing outcomes
  outcome: "passed" | "blocked" | "delayed" | "error";
  processingTimeMinutes: number;
  
  // Manual intervention
  requiresManualReview: boolean;
  manualTouches: number;
  manualReviewTimeMinutes: number;
  
  // Accuracy
  processingAccuracy: number; // 0-1 (likelihood of correct processing)
  errorType?: string;
  
  // Status and details
  status: string;
  details: string;
  flaggedIssues: string[];
}

export interface BaselineStats {
  totalInvoices: number;
  
  // Outcomes
  passed: number;
  blocked: number;
  delayed: number;
  errors: number;
  
  // Time metrics
  totalProcessingTimeMinutes: number;
  avgProcessingTimeMinutes: number;
  totalManualReviewTimeMinutes: number;
  avgManualReviewTimeMinutes: number;
  
  // Manual intervention
  requiresManualReview: number;
  totalManualTouches: number;
  avgManualTouchesPerInvoice: number;
  
  // Accuracy
  avgAccuracy: number;
  
  // FTE costs (assuming 8-hour workday, 20 working days per month)
  totalFTEHours: number;
  estimatedMonthlyFTE: number;
  estimatedAnnualFTE: number;
}

/**
 * Simulate baseline (manual/no-agent) processing for a single invoice
 */
export function simulateBaselineProcessing(scenario: TestScenario): BaselineResult {
  const {
    id,
    vendor,
    amount,
    hasIssue,
    issueType,
    issueSeverity,
    issueDescription,
    baseline,
  } = scenario;

  // Use baseline expectations from scenario
  let outcome: "passed" | "blocked" | "delayed" | "error" = baseline.likelyOutcome;
  let processingTimeMinutes = baseline.estimatedManualTimeMinutes;
  let requiresManualReview = baseline.requiresManualReview;
  let manualTouches = baseline.manualTouches;
  let manualReviewTimeMinutes = requiresManualReview ? processingTimeMinutes : 0;

  // For clean invoices that will post, ~60% still require 1-2 manual touches
  // (AP clerk review, coding check, approval sign-off on normal invoices)
  if (!hasIssue && outcome === "passed") {
    // Deterministic pseudo-random from invoice ID so results are consistent
    const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const roll = (hash % 100) / 100
    if (roll < 0.60) {
      manualTouches = (hash % 3) === 0 ? 2 : 1
      requiresManualReview = true
      manualReviewTimeMinutes = manualTouches * 3 // ~3 min per touch for routine review
    }
  }
  
  // Calculate processing accuracy (manual processing has baseline error rates)
  let processingAccuracy = 0.95; // 95% base accuracy for clean invoices
  
  if (hasIssue) {
    // Manual processing accuracy decreases with issue complexity
    switch (issueSeverity) {
      case "low":
        processingAccuracy = 0.92;
        break;
      case "medium":
        processingAccuracy = 0.85;
        break;
      case "high":
        processingAccuracy = 0.75;
        break;
    }
  }

  // Build flagged issues list
  const flaggedIssues: string[] = [];
  if (hasIssue && issueDescription) {
    flaggedIssues.push(issueDescription);
  }

  // Add additional context based on outcome
  let status = "processed";
  let details = "";
  let errorType: string | undefined;

  switch (outcome) {
    case "passed":
      status = hasIssue ? "passed_with_review" : "passed";
      details = hasIssue 
        ? `Manual review completed: ${issueDescription || "Issues resolved"}`
        : "Invoice processed without issues";
      break;
    
    case "blocked":
      status = "blocked";
      details = `Invoice blocked: ${issueDescription || "Requires resolution"}`;
      flaggedIssues.push("Blocked from further processing");
      break;
    
    case "delayed":
      status = "delayed";
      details = `Processing delayed: ${issueDescription || "Awaiting additional review"}`;
      // Add delay time
      processingTimeMinutes += 60; // Add 1 hour delay
      manualReviewTimeMinutes += 30; // Additional review time
      manualTouches += 1; // Additional touch for follow-up
      break;
    
    case "error":
      status = "error";
      errorType = issueType || "processing_error";
      details = `Processing error: ${issueDescription || "Failed to process"}`;
      flaggedIssues.push("Processing error encountered");
      // Errors require additional manual intervention
      processingTimeMinutes += 45;
      manualReviewTimeMinutes += 45;
      manualTouches += 2; // Initial review + error resolution
      processingAccuracy = 0.5; // Low accuracy for error cases
      break;
  }

  return {
    invoiceId: id,
    vendor,
    amount,
    outcome,
    processingTimeMinutes,
    requiresManualReview,
    manualTouches,
    manualReviewTimeMinutes,
    processingAccuracy,
    errorType,
    status,
    details,
    flaggedIssues,
  };
}

/**
 * Simulate baseline processing for multiple invoices and calculate statistics
 */
export function simulateBaselineProcessingBatch(
  scenarios: TestScenario[]
): { results: BaselineResult[]; stats: BaselineStats } {
  const results = scenarios.map(scenario => simulateBaselineProcessing(scenario));
  
  // Calculate statistics
  const stats: BaselineStats = calculateBaselineStats(results, scenarios.length);
  
  return { results, stats };
}

/**
 * Calculate comprehensive statistics from baseline results
 */
function calculateBaselineStats(results: BaselineResult[], totalInvoices: number): BaselineStats {
  // Outcome counts
  const passed = results.filter(r => r.outcome === "passed").length;
  const blocked = results.filter(r => r.outcome === "blocked").length;
  const delayed = results.filter(r => r.outcome === "delayed").length;
  const errors = results.filter(r => r.outcome === "error").length;
  
  // Time metrics
  const totalProcessingTimeMinutes = results.reduce((sum, r) => sum + r.processingTimeMinutes, 0);
  const avgProcessingTimeMinutes = totalProcessingTimeMinutes / results.length;
  
  const totalManualReviewTimeMinutes = results.reduce((sum, r) => sum + r.manualReviewTimeMinutes, 0);
  const avgManualReviewTimeMinutes = totalManualReviewTimeMinutes / results.length;
  
  // Manual intervention metrics
  const requiresManualReview = results.filter(r => r.requiresManualReview).length;
  const totalManualTouches = results.reduce((sum, r) => sum + r.manualTouches, 0);
  const avgManualTouchesPerInvoice = totalManualTouches / results.length;
  
  // Accuracy
  const avgAccuracy = results.reduce((sum, r) => sum + r.processingAccuracy, 0) / results.length;
  
  // FTE calculations
  const totalFTEHours = totalProcessingTimeMinutes / 60;
  
  // Extrapolate to monthly/annual FTE (assuming this is a representative sample)
  // Standard assumptions: 8 hours/day, 20 working days/month = 160 hours/month
  const hoursPerFTEMonth = 160;
  const hoursPerFTEYear = hoursPerFTEMonth * 12;
  
  // Calculate monthly FTE based on sample
  // This assumes the sample represents typical volume
  const estimatedMonthlyFTE = totalFTEHours / hoursPerFTEMonth;
  const estimatedAnnualFTE = (totalFTEHours / hoursPerFTEMonth) * 12;
  
  return {
    totalInvoices,
    passed,
    blocked,
    delayed,
    errors,
    totalProcessingTimeMinutes,
    avgProcessingTimeMinutes,
    totalManualReviewTimeMinutes,
    avgManualReviewTimeMinutes,
    requiresManualReview,
    totalManualTouches,
    avgManualTouchesPerInvoice,
    avgAccuracy,
    totalFTEHours,
    estimatedMonthlyFTE,
    estimatedAnnualFTE,
  };
}

/**
 * Calculate exception rate for baseline processing
 */
export function calculateBaselineExceptionRate(results: BaselineResult[]): {
  exceptionCount: number;
  exceptionRate: number;
  exceptionsByType: Record<string, number>;
} {
  const exceptions = results.filter(
    r => r.outcome === "blocked" || r.outcome === "delayed" || r.outcome === "error" || r.requiresManualReview
  );
  
  const exceptionCount = exceptions.length;
  const exceptionRate = (exceptionCount / results.length) * 100;
  
  // Count exceptions by type
  const exceptionsByType: Record<string, number> = {};
  
  exceptions.forEach(result => {
    const key = result.errorType || result.outcome;
    exceptionsByType[key] = (exceptionsByType[key] || 0) + 1;
  });
  
  return {
    exceptionCount,
    exceptionRate,
    exceptionsByType,
  };
}

/**
 * Estimate cost impact of baseline processing
 */
export function estimateBaselineCosts(
  stats: BaselineStats,
  hourlyRate: number = 35 // Average AP clerk hourly rate
): {
  totalCost: number;
  monthlyCost: number;
  annualCost: number;
  costPerInvoice: number;
} {
  const totalCost = stats.totalFTEHours * hourlyRate;
  const costPerInvoice = totalCost / stats.totalInvoices;
  
  // Extrapolate to monthly/annual
  const monthlyCost = stats.estimatedMonthlyFTE * 160 * hourlyRate;
  const annualCost = stats.estimatedAnnualFTE * 160 * hourlyRate;
  
  return {
    totalCost,
    monthlyCost,
    annualCost,
    costPerInvoice,
  };
}
