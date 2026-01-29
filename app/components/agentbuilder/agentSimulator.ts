/**
 * Agent Simulator for Agent Builder
 * Simulates agent-assisted invoice processing based on agent configuration
 */

import { TestScenario } from './testScenarioGenerator';

export interface AgentConfig {
  name: string;
  stage: string;
  lane?: string;
  mode: "observe" | "suggest" | "auto-apply";
  prompt: string;
  skills: string[];
}

export interface AgentResult {
  invoiceId: string;
  vendor: string;
  amount: number;
  
  // Processing outcomes
  outcome: "passed" | "blocked" | "delayed" | "escalated";
  processingTimeMinutes: number;
  
  // Agent actions
  agentAction: "auto_resolved" | "suggested_resolution" | "observed" | "escalated_to_human";
  agentConfidence: number; // 0-1
  
  // Manual intervention (reduced by agent)
  requiresManualReview: boolean;
  manualTouches: number;
  manualReviewTimeMinutes: number;
  
  // Accuracy
  processingAccuracy: number; // 0-1
  
  // Details
  status: string;
  details: string;
  agentReasoning: string;
  flaggedIssues: string[];
  skillsUsed: string[];
}

export interface AgentStats {
  totalInvoices: number;
  
  // Outcomes
  passed: number;
  blocked: number;
  delayed: number;
  escalated: number;
  
  // Agent actions
  autoResolved: number;
  suggested: number;
  observed: number;
  escalatedToHuman: number;
  
  // Time metrics
  totalProcessingTimeMinutes: number;
  avgProcessingTimeMinutes: number;
  totalManualReviewTimeMinutes: number;
  avgManualReviewTimeMinutes: number;
  
  // Manual intervention (reduced)
  requiresManualReview: number;
  totalManualTouches: number;
  avgManualTouchesPerInvoice: number;
  
  // Accuracy
  avgAccuracy: number;
  avgConfidence: number;
  
  // FTE costs
  totalFTEHours: number;
  estimatedMonthlyFTE: number;
  estimatedAnnualFTE: number;
}

/**
 * Parse agent prompt to extract decision rules and capabilities
 */
function parseAgentPrompt(prompt: string): {
  hasAutoApprovalRules: boolean;
  hasToleranceRules: boolean;
  hasRoutingRules: boolean;
  hasValidationRules: boolean;
  toleranceThreshold?: number;
  amountThreshold?: number;
  handlesExceptions: boolean;
} {
  const promptLower = prompt.toLowerCase();
  
  // Check for various rule types
  const hasAutoApprovalRules = /auto(matically)?\s+(approve|process)/i.test(prompt);
  const hasToleranceRules = /tolerance|variance|threshold/i.test(prompt);
  const hasRoutingRules = /rout(e|ing)|assign|forward/i.test(prompt);
  const hasValidationRules = /validat(e|ion)|verify|check/i.test(prompt);
  const handlesExceptions = /exception|error|issue|problem/i.test(prompt);
  
  // Extract tolerance threshold if mentioned
  let toleranceThreshold: number | undefined;
  const toleranceMatch = prompt.match(/(\d+)%?\s+tolerance/i);
  if (toleranceMatch) {
    toleranceThreshold = parseInt(toleranceMatch[1]);
  }
  
  // Extract amount threshold if mentioned
  let amountThreshold: number | undefined;
  const amountMatch = prompt.match(/\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
  if (amountMatch) {
    amountThreshold = parseFloat(amountMatch[1].replace(/,/g, ''));
  }
  
  return {
    hasAutoApprovalRules,
    hasToleranceRules,
    hasRoutingRules,
    hasValidationRules,
    toleranceThreshold,
    amountThreshold,
    handlesExceptions,
  };
}

/**
 * Simulate agent-assisted processing for a single invoice
 */
export function simulateAgentProcessing(
  scenario: TestScenario,
  agentConfig: AgentConfig
): AgentResult {
  const {
    id,
    vendor,
    amount,
    hasIssue,
    issueType,
    issueSeverity,
    issueDescription,
    agentOpportunity,
    baseline,
  } = scenario;

  // Parse agent configuration
  const promptRules = parseAgentPrompt(agentConfig.prompt);
  
  // Determine agent capabilities based on skills and mode
  const canAutoResolve = agentConfig.mode === "auto-apply" && agentOpportunity.canAutoResolve;
  const canSuggest = agentConfig.mode === "suggest" || agentConfig.mode === "auto-apply";
  const observeOnly = agentConfig.mode === "observe";
  
  // Check if agent has required skills
  const hasRequiredSkills = agentOpportunity.requiredSkills.every(
    skill => agentConfig.skills.includes(skill)
  );
  
  // Calculate agent confidence
  let agentConfidence = agentOpportunity.resolutionConfidence;
  if (!hasRequiredSkills) {
    agentConfidence *= 0.7; // Reduce confidence if missing skills
  }
  
  // Initialize result
  let outcome: "passed" | "blocked" | "delayed" | "escalated" = "passed";
  let agentAction: "auto_resolved" | "suggested_resolution" | "observed" | "escalated_to_human";
  let processingTimeMinutes = agentOpportunity.estimatedAutomatedTimeMinutes;
  let requiresManualReview = false;
  let manualTouches = 0;
  let manualReviewTimeMinutes = 0;
  let processingAccuracy = agentConfidence;
  let status = "processed";
  let details = "";
  let agentReasoning = "";
  const flaggedIssues: string[] = [];
  const skillsUsed: string[] = [];

  // Clean invoices - easy path
  if (!hasIssue) {
    if (observeOnly) {
      agentAction = "observed";
      agentReasoning = "Invoice appears clean. No issues detected. Monitoring for anomalies.";
      processingTimeMinutes = baseline.estimatedManualTimeMinutes; // Still needs manual processing
      requiresManualReview = true;
      manualTouches = 1;
      manualReviewTimeMinutes = baseline.estimatedManualTimeMinutes;
    } else if (canSuggest) {
      agentAction = "suggested_resolution";
      agentReasoning = "Invoice validated successfully. Recommended for automatic processing.";
      processingTimeMinutes = 1;
      requiresManualReview = false;
    } else {
      agentAction = "auto_resolved";
      agentReasoning = "Invoice automatically processed. All validations passed.";
      processingTimeMinutes = 0.5;
      requiresManualReview = false;
    }
    
    skillsUsed.push("Process Documents", "Verify Data");
    details = "Invoice processed successfully without issues";
    processingAccuracy = 0.98;
  } 
  // Invoices with issues - agent intelligence required
  else {
    if (observeOnly) {
      // Observe mode: just flag and pass to human
      agentAction = "observed";
      outcome = "escalated";
      agentReasoning = `Observed issue: ${issueDescription}. Flagged for human review.`;
      flaggedIssues.push(issueDescription || "Issue detected");
      processingTimeMinutes = baseline.estimatedManualTimeMinutes;
      requiresManualReview = true;
      manualTouches = baseline.manualTouches;
      manualReviewTimeMinutes = baseline.estimatedManualTimeMinutes;
      skillsUsed.push("Flag Issues");
    } 
    else if (canAutoResolve && hasRequiredSkills && agentConfidence > 0.8) {
      // Auto-apply mode with high confidence: resolve automatically
      agentAction = "auto_resolved";
      outcome = "passed";
      
      // Apply stage-specific resolution logic
      const resolution = applyAgentResolution(scenario, agentConfig, promptRules);
      
      agentReasoning = resolution.reasoning;
      processingTimeMinutes = resolution.processingTimeMinutes;
      processingAccuracy = resolution.accuracy;
      skillsUsed.push(...resolution.skillsUsed);
      
      if (resolution.requiresFollowup) {
        requiresManualReview = true;
        manualTouches = 1;
        manualReviewTimeMinutes = 5; // Minimal review time
        details = `${resolution.action}. Follow-up review recommended.`;
      } else {
        requiresManualReview = false;
        details = resolution.action;
      }
    }
    else if (canSuggest) {
      // Suggest mode or auto-apply with lower confidence: provide recommendations
      agentAction = "suggested_resolution";
      outcome = "escalated";
      
      const suggestion = generateResolutionSuggestion(scenario, agentConfig, promptRules);
      
      agentReasoning = suggestion.reasoning;
      flaggedIssues.push(issueDescription || "Issue detected");
      
      // Suggestions reduce manual review time
      processingTimeMinutes = 2;
      requiresManualReview = true;
      manualTouches = 1;
      manualReviewTimeMinutes = baseline.estimatedManualTimeMinutes * 0.4; // 60% reduction with good suggestions
      processingAccuracy = 0.9; // High accuracy when human reviews suggestions
      
      skillsUsed.push(...suggestion.skillsUsed);
      details = `${suggestion.suggestion}. Requires human confirmation.`;
    }
    else {
      // Cannot resolve: escalate to human
      agentAction = "escalated_to_human";
      outcome = "escalated";
      agentReasoning = `Unable to resolve automatically: ${issueDescription}. Escalated to human reviewer.`;
      flaggedIssues.push(issueDescription || "Issue detected");
      flaggedIssues.push("Agent unable to resolve - requires human expertise");
      
      // Escalation still provides some benefit (pre-analysis)
      processingTimeMinutes = 1;
      requiresManualReview = true;
      manualTouches = baseline.manualTouches;
      manualReviewTimeMinutes = baseline.estimatedManualTimeMinutes * 0.8; // 20% reduction from pre-analysis
      processingAccuracy = baseline.likelyOutcome === "error" ? 0.7 : 0.85;
      
      skillsUsed.push("Flag Issues");
      details = `Escalated: ${issueDescription}`;
    }
  }

  return {
    invoiceId: id,
    vendor,
    amount,
    outcome,
    processingTimeMinutes,
    agentAction,
    agentConfidence,
    requiresManualReview,
    manualTouches,
    manualReviewTimeMinutes,
    processingAccuracy,
    status,
    details,
    agentReasoning,
    flaggedIssues,
    skillsUsed,
  };
}

/**
 * Apply agent resolution for auto-apply mode
 */
function applyAgentResolution(
  scenario: TestScenario,
  agentConfig: AgentConfig,
  promptRules: ReturnType<typeof parseAgentPrompt>
): {
  action: string;
  reasoning: string;
  processingTimeMinutes: number;
  accuracy: number;
  skillsUsed: string[];
  requiresFollowup: boolean;
} {
  const stage = agentConfig.stage;
  const stageData = scenario.stageData;
  const skillsUsed: string[] = [];
  let action = "";
  let reasoning = "";
  let processingTimeMinutes = 1;
  let accuracy = 0.9;
  let requiresFollowup = false;

  switch (stage) {
    case "ingestion":
      if (stageData.ingestion?.isDuplicate) {
        action = "Duplicate invoice rejected automatically";
        reasoning = "Matched existing invoice in system. Prevented duplicate processing.";
        accuracy = 0.98;
        skillsUsed.push("Process Documents", "Flag Issues");
      } else if (stageData.ingestion?.fileQuality === "poor") {
        action = "Applied enhanced OCR processing for low-quality scan";
        reasoning = "Detected poor image quality. Applied advanced OCR techniques.";
        processingTimeMinutes = 2;
        accuracy = 0.85;
        skillsUsed.push("Extract text", "Process Documents");
        requiresFollowup = true;
      }
      break;

    case "data-capture":
      if (stageData.dataCapture?.ocrConfidence && stageData.dataCapture.ocrConfidence > 0.7) {
        action = "Extracted data with confidence-based validation";
        reasoning = `OCR confidence ${(stageData.dataCapture.ocrConfidence * 100).toFixed(1)}%. Applied field validation rules.`;
        accuracy = stageData.dataCapture.ocrConfidence;
        skillsUsed.push("Extract text", "Verify Data");
        if (stageData.dataCapture.ocrConfidence < 0.85) {
          requiresFollowup = true;
        }
      }
      break;

    case "verification":
      if (stageData.verification?.anomalies.length) {
        action = "Anomaly reviewed and cleared based on historical patterns";
        reasoning = "Detected anomaly matches known vendor patterns. Validated against historical data.";
        accuracy = 0.85;
        skillsUsed.push("Verify Data", "Intelligent Matching");
      }
      break;

    case "matching":
      if (stageData.matching?.matchStatus === "within_tolerance" && promptRules.hasToleranceRules) {
        const variance = stageData.matching.priceVariance || stageData.matching.quantityVariance || 0;
        action = `Auto-matched with ${variance.toFixed(1)}% variance (within tolerance)`;
        reasoning = `Variance within acceptable tolerance limits. Applied intelligent matching rules.`;
        accuracy = 0.92;
        skillsUsed.push("Find Purchase Orders", "Intelligent Matching");
      } else if (stageData.matching?.hasPO && !stageData.matching?.toleranceExceeded) {
        action = "PO matched successfully";
        reasoning = "Exact or near-exact match to purchase order found.";
        accuracy = 0.95;
        skillsUsed.push("Find Purchase Orders", "Intelligent Matching");
      }
      break;

    case "approval":
      if (stageData.approval?.routingComplexity === "simple" && promptRules.hasRoutingRules) {
        action = `Routed to ${stageData.approval.suggestedApprover || "appropriate approver"}`;
        reasoning = "Applied routing rules based on amount and department.";
        processingTimeMinutes = 0.5;
        accuracy = 0.95;
        skillsUsed.push("Route for Approval", "Run Workflows");
      } else if (stageData.approval?.routingComplexity === "moderate") {
        action = `Routed with complexity analysis to ${stageData.approval.suggestedApprover || "senior approver"}`;
        reasoning = "Applied advanced routing logic for moderate complexity case.";
        processingTimeMinutes = 1;
        accuracy = 0.88;
        skillsUsed.push("Route for Approval", "Run Workflows");
        requiresFollowup = true;
      }
      break;

    case "posting":
      if (stageData.posting?.needsCoding && agentConfig.skills.includes("Map to General Ledger")) {
        action = "GL code assigned based on vendor and category patterns";
        reasoning = "Applied ML-based GL coding using historical patterns.";
        processingTimeMinutes = 2;
        accuracy = 0.85;
        skillsUsed.push("Map to General Ledger", "Connect to ERP System");
        requiresFollowup = true;
      } else if (!stageData.posting?.erpValidationIssues.length) {
        action = "Posted to ERP successfully";
        reasoning = "Validated against ERP rules and posted automatically.";
        accuracy = 0.96;
        skillsUsed.push("Connect to ERP System");
      }
      break;
  }

  return {
    action,
    reasoning,
    processingTimeMinutes,
    accuracy,
    skillsUsed,
    requiresFollowup,
  };
}

/**
 * Generate resolution suggestion for suggest mode
 */
function generateResolutionSuggestion(
  scenario: TestScenario,
  agentConfig: AgentConfig,
  promptRules: ReturnType<typeof parseAgentPrompt>
): {
  suggestion: string;
  reasoning: string;
  skillsUsed: string[];
} {
  const stage = agentConfig.stage;
  const stageData = scenario.stageData;
  const skillsUsed: string[] = ["Flag Issues"];
  let suggestion = "";
  let reasoning = "";

  switch (stage) {
    case "ingestion":
      suggestion = "Recommend manual verification of duplicate status";
      reasoning = "Possible duplicate detected. Human confirmation recommended.";
      break;

    case "data-capture":
      if (stageData.dataCapture?.missingFields.length) {
        suggestion = `Suggest requesting missing fields: ${stageData.dataCapture.missingFields.join(", ")}`;
        reasoning = "Identified specific missing fields that need to be populated.";
        skillsUsed.push("Verify Data");
      }
      break;

    case "verification":
      suggestion = "Recommend validation against vendor master data";
      reasoning = "Detected validation issues that may be resolvable with vendor data check.";
      skillsUsed.push("Verify Data", "Find Vendor Information");
      break;

    case "matching":
      if (stageData.matching?.toleranceExceeded) {
        suggestion = "Suggest approver override for tolerance exception";
        reasoning = "Variance exceeds tolerance but may be legitimate. Recommend senior review.";
        skillsUsed.push("Intelligent Matching");
      }
      break;

    case "approval":
      if (stageData.approval?.suggestedApprover) {
        suggestion = `Recommend routing to ${stageData.approval.suggestedApprover}`;
        reasoning = "Identified appropriate approver based on amount and rules.";
        skillsUsed.push("Route for Approval");
      }
      break;

    case "posting":
      suggestion = "Suggest GL code assignment based on vendor patterns";
      reasoning = "Analyzed historical coding patterns for this vendor.";
      skillsUsed.push("Map to General Ledger");
      break;
  }

  return {
    suggestion,
    reasoning,
    skillsUsed,
  };
}

/**
 * Simulate agent processing for multiple invoices and calculate statistics
 */
export function simulateAgentProcessingBatch(
  scenarios: TestScenario[],
  agentConfig: AgentConfig
): { results: AgentResult[]; stats: AgentStats } {
  const results = scenarios.map(scenario => simulateAgentProcessing(scenario, agentConfig));
  
  // Calculate statistics
  const stats: AgentStats = calculateAgentStats(results, scenarios.length);
  
  return { results, stats };
}

/**
 * Calculate comprehensive statistics from agent results
 */
function calculateAgentStats(results: AgentResult[], totalInvoices: number): AgentStats {
  // Outcome counts
  const passed = results.filter(r => r.outcome === "passed").length;
  const blocked = results.filter(r => r.outcome === "blocked").length;
  const delayed = results.filter(r => r.outcome === "delayed").length;
  const escalated = results.filter(r => r.outcome === "escalated").length;
  
  // Agent action counts
  const autoResolved = results.filter(r => r.agentAction === "auto_resolved").length;
  const suggested = results.filter(r => r.agentAction === "suggested_resolution").length;
  const observed = results.filter(r => r.agentAction === "observed").length;
  const escalatedToHuman = results.filter(r => r.agentAction === "escalated_to_human").length;
  
  // Time metrics
  const totalProcessingTimeMinutes = results.reduce((sum, r) => sum + r.processingTimeMinutes, 0);
  const avgProcessingTimeMinutes = totalProcessingTimeMinutes / results.length;
  
  const totalManualReviewTimeMinutes = results.reduce((sum, r) => sum + r.manualReviewTimeMinutes, 0);
  const avgManualReviewTimeMinutes = totalManualReviewTimeMinutes / results.length;
  
  // Manual intervention metrics
  const requiresManualReview = results.filter(r => r.requiresManualReview).length;
  const totalManualTouches = results.reduce((sum, r) => sum + r.manualTouches, 0);
  const avgManualTouchesPerInvoice = totalManualTouches / results.length;
  
  // Accuracy and confidence
  const avgAccuracy = results.reduce((sum, r) => sum + r.processingAccuracy, 0) / results.length;
  const avgConfidence = results.reduce((sum, r) => sum + r.agentConfidence, 0) / results.length;
  
  // FTE calculations
  const totalFTEHours = (totalProcessingTimeMinutes + totalManualReviewTimeMinutes) / 60;
  
  const hoursPerFTEMonth = 160;
  const estimatedMonthlyFTE = totalFTEHours / hoursPerFTEMonth;
  const estimatedAnnualFTE = (totalFTEHours / hoursPerFTEMonth) * 12;
  
  return {
    totalInvoices,
    passed,
    blocked,
    delayed,
    escalated,
    autoResolved,
    suggested,
    observed,
    escalatedToHuman,
    totalProcessingTimeMinutes,
    avgProcessingTimeMinutes,
    totalManualReviewTimeMinutes,
    avgManualReviewTimeMinutes,
    requiresManualReview,
    totalManualTouches,
    avgManualTouchesPerInvoice,
    avgAccuracy,
    avgConfidence,
    totalFTEHours,
    estimatedMonthlyFTE,
    estimatedAnnualFTE,
  };
}
