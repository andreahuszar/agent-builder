/**
 * Test Scenario Generator for Agent Builder
 * Generates stage/lane-specific invoice test scenarios with realistic problem distributions
 */

export type TimePeriod = "7days" | "30days" | "3months" | "6months";

export type Stage = "ingestion" | "data-capture" | "verification" | "matching" | "approval" | "posting";

export interface TestScenario {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  status: string;
  
  // Problem metadata
  hasIssue: boolean;
  issueType?: string;
  issueSeverity?: "low" | "medium" | "high";
  issueDescription?: string;
  
  // Stage-specific data
  stageData: {
    ingestion?: IngestionData;
    dataCapture?: DataCaptureData;
    verification?: VerificationData;
    matching?: MatchingData;
    approval?: ApprovalData;
    posting?: PostingData;
  };
  
  // Baseline expectations (without agent)
  baseline: {
    requiresManualReview: boolean;
    estimatedManualTimeMinutes: number;
    likelyOutcome: "pass" | "blocked" | "delayed" | "error";
    manualTouches: number;
  };
  
  // What an agent could do
  agentOpportunity: {
    canAutoResolve: boolean;
    resolutionConfidence: number; // 0-1
    estimatedAutomatedTimeMinutes: number;
    requiredSkills: string[];
  };
}

interface IngestionData {
  fileFormat: "pdf" | "excel" | "image" | "csv";
  fileQuality: "good" | "poor" | "corrupted";
  isDuplicate: boolean;
  hasMetadata: boolean;
  sourceChannel: "email" | "portal" | "api" | "scan";
}

interface DataCaptureData {
  ocrConfidence: number;
  missingFields: string[];
  fieldErrors: string[];
  requiresManualEntry: boolean;
}

interface VerificationData {
  validationErrors: string[];
  anomalies: string[];
  policyViolations: string[];
  vendorVerified: boolean;
}

interface MatchingData {
  hasPO: boolean;
  poNumber?: string;
  priceVariance?: number; // percentage
  quantityVariance?: number; // percentage
  toleranceExceeded: boolean;
  matchStatus: "exact" | "within_tolerance" | "over_tolerance" | "no_match";
}

interface ApprovalData {
  requiresApproval: boolean;
  thresholdExceeded: boolean;
  suggestedApprover?: string;
  approvalLevel: "automatic" | "single" | "dual";
  routingComplexity: "simple" | "moderate" | "complex";
}

interface PostingData {
  glCode?: string;
  needsCoding: boolean;
  erpValidationIssues: string[];
  reconciliationStatus: "matched" | "unmatched" | "partial";
}

export interface ScenarioConfig {
  scenarioTypes: ("clean" | "common_issues" | "edge_cases" | "all")[];
  issueMix: number; // 0-100, percentage of scenarios with issues
  stage: Stage;
  lane?: string;
}

// Vendor pool
const VENDORS = [
  "Acme Corporation",
  "TechSupply Inc",
  "Global Services Ltd",
  "Office Depot",
  "CloudHost Services",
  "SecurePay Systems",
  "DataFlow Solutions",
  "Prime Vendor Co",
  "Mega Supplies LLC",
  "Quick Logistics",
  "Elite Services",
  "ProTech Industries",
  "Alpha Manufacturing",
  "Beta Distributors",
  "Gamma Solutions",
];

/**
 * Seeded random number generator for deterministic results
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

/**
 * Generate stage-specific test scenarios
 */
const ALL_STAGES: Stage[] = ["ingestion", "data-capture", "verification", "matching", "approval", "posting"];

export function generateTestScenarios(
  timePeriod: TimePeriod,
  config: ScenarioConfig
): TestScenario[] {
  const daysBack = getDaysFromPeriod(timePeriod);
  const invoiceCount = getInvoiceCount(timePeriod);
  const rng = new SeededRandom(12345); // Fixed seed for consistency
  
  const scenarios: TestScenario[] = [];
  const issuePercentage = config.issueMix / 100;
  const otherStages = ALL_STAGES.filter(s => s !== config.stage);

  for (let i = 0; i < invoiceCount; i++) {
    const hasIssue = rng.next() < issuePercentage;

    // For issue invoices, distribute stages across the full pipeline:
    // primary stage gets 40%, the other 5 stages share the remaining 60% equally (~12% each)
    let effectiveStage = config.stage;
    if (hasIssue) {
      const roll = rng.next();
      if (roll >= 0.40) {
        // Pick one of the other stages
        const idx = Math.floor((roll - 0.40) / 0.60 * otherStages.length)
        effectiveStage = otherStages[Math.min(idx, otherStages.length - 1)];
      }
    }

    const effectiveConfig: ScenarioConfig = { ...config, stage: effectiveStage };
    const scenario = generateScenario(i, daysBack, hasIssue, effectiveConfig, rng);
    scenarios.push(scenario);
  }

  return scenarios;
}

function getDaysFromPeriod(period: TimePeriod): number {
  switch (period) {
    case "7days": return 7;
    case "30days": return 30;
    case "3months": return 90;
    case "6months": return 180;
  }
}

function getInvoiceCount(period: TimePeriod): number {
  switch (period) {
    case "7days": return 1500;
    case "30days": return 6200;
    case "3months": return 18500;
    case "6months": return 37000;
  }
}

function generateScenario(
  index: number,
  daysBack: number,
  hasIssue: boolean,
  config: ScenarioConfig,
  rng: SeededRandom
): TestScenario {
  const daysAgo = rng.nextInt(0, daysBack);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const vendor = rng.choice(VENDORS);
  const amount = rng.nextFloat(50, 50000);
  const invoiceId = `INV-2024-${String(10000 + index).padStart(5, "0")}`;

  let stageData: TestScenario["stageData"] = {};
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  // Generate stage-specific data and issues
  switch (config.stage) {
    case "ingestion":
      const ingestionResult = generateIngestionData(hasIssue, rng);
      stageData.ingestion = ingestionResult.data;
      if (hasIssue) {
        issueType = ingestionResult.issueType;
        issueDescription = ingestionResult.issueDescription;
        issueSeverity = ingestionResult.issueSeverity;
      }
      break;

    case "data-capture":
      const dataCaptureResult = generateDataCaptureData(hasIssue, rng);
      stageData.dataCapture = dataCaptureResult.data;
      if (hasIssue) {
        issueType = dataCaptureResult.issueType;
        issueDescription = dataCaptureResult.issueDescription;
        issueSeverity = dataCaptureResult.issueSeverity;
      }
      break;

    case "verification":
      const verificationResult = generateVerificationData(hasIssue, rng);
      stageData.verification = verificationResult.data;
      if (hasIssue) {
        issueType = verificationResult.issueType;
        issueDescription = verificationResult.issueDescription;
        issueSeverity = verificationResult.issueSeverity;
      }
      break;

    case "matching":
      const matchingResult = generateMatchingData(hasIssue, amount, rng);
      stageData.matching = matchingResult.data;
      if (hasIssue) {
        issueType = matchingResult.issueType;
        issueDescription = matchingResult.issueDescription;
        issueSeverity = matchingResult.issueSeverity;
      }
      break;

    case "approval":
      const approvalResult = generateApprovalData(hasIssue, amount, rng);
      stageData.approval = approvalResult.data;
      if (hasIssue) {
        issueType = approvalResult.issueType;
        issueDescription = approvalResult.issueDescription;
        issueSeverity = approvalResult.issueSeverity;
      }
      break;

    case "posting":
      const postingResult = generatePostingData(hasIssue, rng);
      stageData.posting = postingResult.data;
      if (hasIssue) {
        issueType = postingResult.issueType;
        issueDescription = postingResult.issueDescription;
        issueSeverity = postingResult.issueSeverity;
      }
      break;
  }

  // Calculate baseline expectations
  const baseline = calculateBaseline(hasIssue, config.stage, stageData, issueSeverity);
  
  // Calculate agent opportunities
  const agentOpportunity = calculateAgentOpportunity(hasIssue, config.stage, stageData, issueSeverity);

  return {
    id: invoiceId,
    vendor,
    amount: parseFloat(amount.toFixed(2)),
    date: date.toISOString().split("T")[0],
    status: hasIssue ? "has_issues" : "clean",
    hasIssue,
    issueType,
    issueSeverity,
    issueDescription,
    stageData,
    baseline,
    agentOpportunity,
  };
}

// Stage-specific data generators

function generateIngestionData(hasIssue: boolean, rng: SeededRandom) {
  const fileFormats: ("pdf" | "excel" | "image" | "csv")[] = ["pdf", "excel", "image", "csv"];
  const fileFormat = rng.choice(fileFormats);
  
  let fileQuality: "good" | "poor" | "corrupted" = "good";
  let isDuplicate = false;
  let hasMetadata = true;
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (hasIssue) {
    const issueTypes = ["duplicate", "wrong_format", "missing_metadata", "poor_quality"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "duplicate":
        isDuplicate = true;
        issueDescription = "Duplicate invoice detected in system";
        issueSeverity = "high";
        break;
      case "wrong_format":
        issueDescription = "File format not in approved list";
        issueSeverity = "medium";
        break;
      case "missing_metadata":
        hasMetadata = false;
        issueDescription = "Missing required metadata fields";
        issueSeverity = "medium";
        break;
      case "poor_quality":
        fileQuality = "poor";
        issueDescription = "Low quality scan, may affect OCR accuracy";
        issueSeverity = "low";
        break;
    }
  }

  const sourceChannels: ("email" | "portal" | "api" | "scan")[] = ["email", "portal", "api", "scan"];

  return {
    data: {
      fileFormat,
      fileQuality,
      isDuplicate,
      hasMetadata,
      sourceChannel: rng.choice(sourceChannels),
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

function generateDataCaptureData(hasIssue: boolean, rng: SeededRandom) {
  let ocrConfidence = rng.nextFloat(0.85, 0.99);
  const missingFields: string[] = [];
  const fieldErrors: string[] = [];
  let requiresManualEntry = false;
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (hasIssue) {
    const issueTypes = ["low_ocr_confidence", "missing_fields", "field_errors", "manual_entry_required"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "low_ocr_confidence":
        ocrConfidence = rng.nextFloat(0.4, 0.7);
        issueDescription = `Low OCR confidence (${(ocrConfidence * 100).toFixed(1)}%)`;
        issueSeverity = "medium";
        break;
      case "missing_fields":
        const fields = ["invoice_number", "vendor_name", "amount", "date", "tax_id"];
        const numMissing = rng.nextInt(1, 3);
        for (let i = 0; i < numMissing; i++) {
          missingFields.push(rng.choice(fields));
        }
        issueDescription = `Missing ${missingFields.length} required field(s): ${missingFields.join(", ")}`;
        issueSeverity = "high";
        break;
      case "field_errors":
        const errorFields = ["date_format", "amount_format", "invalid_tax_id"];
        fieldErrors.push(rng.choice(errorFields));
        issueDescription = `Field validation errors: ${fieldErrors.join(", ")}`;
        issueSeverity = "medium";
        break;
      case "manual_entry_required":
        requiresManualEntry = true;
        issueDescription = "OCR failed, requires manual data entry";
        issueSeverity = "high";
        break;
    }
  }

  return {
    data: {
      ocrConfidence,
      missingFields,
      fieldErrors,
      requiresManualEntry,
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

function generateVerificationData(hasIssue: boolean, rng: SeededRandom) {
  const validationErrors: string[] = [];
  const anomalies: string[] = [];
  const policyViolations: string[] = [];
  let vendorVerified = true;
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (hasIssue) {
    const issueTypes = ["validation_error", "anomaly", "policy_violation", "vendor_unverified"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "validation_error":
        const errors = ["invalid_date", "amount_mismatch", "missing_tax_id", "invalid_format"];
        validationErrors.push(rng.choice(errors));
        issueDescription = `Validation error: ${validationErrors[0]}`;
        issueSeverity = "medium";
        break;
      case "anomaly":
        const anomalyTypes = ["unusual_amount", "frequency_anomaly", "pattern_deviation"];
        anomalies.push(rng.choice(anomalyTypes));
        issueDescription = `Anomaly detected: ${anomalies[0]}`;
        issueSeverity = "low";
        break;
      case "policy_violation":
        const violations = ["exceeds_limit", "unauthorized_vendor", "missing_approval"];
        policyViolations.push(rng.choice(violations));
        issueDescription = `Policy violation: ${policyViolations[0]}`;
        issueSeverity = "high";
        break;
      case "vendor_unverified":
        vendorVerified = false;
        issueDescription = "Vendor not verified in master data";
        issueSeverity = "high";
        break;
    }
  }

  return {
    data: {
      validationErrors,
      anomalies,
      policyViolations,
      vendorVerified,
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

function generateMatchingData(hasIssue: boolean, amount: number, rng: SeededRandom) {
  let hasPO = rng.next() > 0.2; // 80% have POs
  let poNumber: string | undefined = hasPO ? `PO-${rng.nextInt(10000, 99999)}` : undefined;
  let priceVariance: number | undefined;
  let quantityVariance: number | undefined;
  let toleranceExceeded = false;
  let matchStatus: "exact" | "within_tolerance" | "over_tolerance" | "no_match" = "exact";
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (hasIssue && hasPO) {
    const issueTypes = ["price_variance", "quantity_variance", "no_po_match", "tolerance_exceeded"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "price_variance":
        priceVariance = rng.nextFloat(2, 15); // 2-15% variance
        toleranceExceeded = priceVariance > 5;
        matchStatus = toleranceExceeded ? "over_tolerance" : "within_tolerance";
        issueDescription = `Price variance: ${priceVariance.toFixed(1)}% (${toleranceExceeded ? "exceeds" : "within"} tolerance)`;
        issueSeverity = toleranceExceeded ? "high" : "low";
        break;
      case "quantity_variance":
        quantityVariance = rng.nextFloat(1, 20); // 1-20% variance
        toleranceExceeded = quantityVariance > 10;
        matchStatus = toleranceExceeded ? "over_tolerance" : "within_tolerance";
        issueDescription = `Quantity variance: ${quantityVariance.toFixed(1)}% (${toleranceExceeded ? "exceeds" : "within"} tolerance)`;
        issueSeverity = toleranceExceeded ? "high" : "medium";
        break;
      case "no_po_match":
        matchStatus = "no_match";
        issueDescription = "No matching PO found for invoice";
        issueSeverity = "high";
        break;
      case "tolerance_exceeded":
        priceVariance = rng.nextFloat(10, 25);
        toleranceExceeded = true;
        matchStatus = "over_tolerance";
        issueDescription = `Multiple variances exceed tolerance limits`;
        issueSeverity = "high";
        break;
    }
  } else if (hasIssue && !hasPO) {
    issueType = "no_po";
    matchStatus = "no_match";
    issueDescription = "Non-PO invoice requires manual approval workflow";
    issueSeverity = "medium";
  }

  return {
    data: {
      hasPO,
      poNumber,
      priceVariance,
      quantityVariance,
      toleranceExceeded,
      matchStatus,
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

function generateApprovalData(hasIssue: boolean, amount: number, rng: SeededRandom) {
  let requiresApproval = amount > 1000;
  let thresholdExceeded = amount > 5000;
  let suggestedApprover: string | undefined;
  let approvalLevel: "automatic" | "single" | "dual" = "automatic";
  let routingComplexity: "simple" | "moderate" | "complex" = "simple";
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (amount > 1000 && amount <= 5000) {
    approvalLevel = "single";
    routingComplexity = "simple";
  } else if (amount > 5000 && amount <= 25000) {
    approvalLevel = "single";
    routingComplexity = "moderate";
  } else if (amount > 25000) {
    approvalLevel = "dual";
    routingComplexity = "complex";
  }

  if (hasIssue) {
    const issueTypes = ["routing_unclear", "threshold_exceeded", "escalation_needed", "missing_approver"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "routing_unclear":
        routingComplexity = "complex";
        issueDescription = "Unclear routing rules, requires manual assignment";
        issueSeverity = "medium";
        break;
      case "threshold_exceeded":
        thresholdExceeded = true;
        issueDescription = "Amount exceeds standard approval threshold";
        issueSeverity = "medium";
        break;
      case "escalation_needed":
        issueDescription = "Requires escalation to senior approver";
        issueSeverity = "high";
        break;
      case "missing_approver":
        issueDescription = "Designated approver unavailable or not found";
        issueSeverity = "high";
        break;
    }
  }

  const approvers = ["Jane Smith", "John Doe", "Alice Johnson", "Bob Wilson"];
  if (requiresApproval) {
    suggestedApprover = rng.choice(approvers);
  }

  return {
    data: {
      requiresApproval,
      thresholdExceeded,
      suggestedApprover,
      approvalLevel,
      routingComplexity,
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

function generatePostingData(hasIssue: boolean, rng: SeededRandom) {
  let glCode: string | undefined = `GL-${rng.nextInt(1000, 9999)}`;
  let needsCoding = false;
  const erpValidationIssues: string[] = [];
  let reconciliationStatus: "matched" | "unmatched" | "partial" = "matched";
  let issueType: string | undefined;
  let issueDescription: string | undefined;
  let issueSeverity: "low" | "medium" | "high" = "medium";

  if (hasIssue) {
    const issueTypes = ["missing_gl_code", "erp_validation_failed", "reconciliation_mismatch"];
    issueType = rng.choice(issueTypes);

    switch (issueType) {
      case "missing_gl_code":
        glCode = undefined;
        needsCoding = true;
        issueDescription = "GL code not assigned, requires coding";
        issueSeverity = "medium";
        break;
      case "erp_validation_failed":
        const issues = ["invalid_account", "closed_period", "duplicate_entry"];
        erpValidationIssues.push(rng.choice(issues));
        issueDescription = `ERP validation failed: ${erpValidationIssues[0]}`;
        issueSeverity = "high";
        break;
      case "reconciliation_mismatch":
        reconciliationStatus = rng.next() > 0.5 ? "unmatched" : "partial";
        issueDescription = `Reconciliation ${reconciliationStatus}`;
        issueSeverity = "medium";
        break;
    }
  }

  return {
    data: {
      glCode,
      needsCoding,
      erpValidationIssues,
      reconciliationStatus,
    },
    issueType,
    issueDescription,
    issueSeverity,
  };
}

// Calculate baseline expectations (manual processing)
function calculateBaseline(
  hasIssue: boolean,
  stage: Stage,
  stageData: TestScenario["stageData"],
  issueSeverity?: "low" | "medium" | "high"
): TestScenario["baseline"] {
  let requiresManualReview = hasIssue;
  let estimatedManualTimeMinutes = 2; // Base time for clean invoices
  let likelyOutcome: "pass" | "blocked" | "delayed" | "error" = "pass";
  let manualTouches = 0;

  if (hasIssue) {
    // Baseline assumes manual review for all issues
    requiresManualReview = true;
    manualTouches = 1;

    switch (stage) {
      case "ingestion":
        estimatedManualTimeMinutes = 5;
        if (stageData.ingestion?.isDuplicate) {
          likelyOutcome = "blocked";
        }
        break;
      case "data-capture":
        if (stageData.dataCapture?.requiresManualEntry) {
          estimatedManualTimeMinutes = 30;
          manualTouches = 1;
        } else {
          estimatedManualTimeMinutes = 15;
        }
        break;
      case "verification":
        estimatedManualTimeMinutes = 20;
        if (stageData.verification?.policyViolations.length) {
          likelyOutcome = "blocked";
        }
        break;
      case "matching":
        estimatedManualTimeMinutes = 25;
        if (stageData.matching?.toleranceExceeded) {
          likelyOutcome = "delayed";
          manualTouches = 2; // Requires additional approval
        }
        break;
      case "approval":
        estimatedManualTimeMinutes = 15;
        if (stageData.approval?.routingComplexity === "complex") {
          estimatedManualTimeMinutes = 30;
          likelyOutcome = "delayed";
        }
        break;
      case "posting":
        estimatedManualTimeMinutes = 20;
        if (stageData.posting?.erpValidationIssues.length) {
          likelyOutcome = "error";
          manualTouches = 2;
        }
        break;
    }

    // Severity modifier
    if (issueSeverity === "high") {
      estimatedManualTimeMinutes *= 1.5;
      manualTouches += 1;
    }
  }

  return {
    requiresManualReview,
    estimatedManualTimeMinutes,
    likelyOutcome,
    manualTouches,
  };
}

// Calculate agent opportunities
function calculateAgentOpportunity(
  hasIssue: boolean,
  stage: Stage,
  stageData: TestScenario["stageData"],
  issueSeverity?: "low" | "medium" | "high"
): TestScenario["agentOpportunity"] {
  let canAutoResolve = false;
  let resolutionConfidence = 0.95; // High confidence for clean invoices
  let estimatedAutomatedTimeMinutes = 0.5; // Automated processing is fast
  const requiredSkills: string[] = [];

  if (!hasIssue) {
    canAutoResolve = true;
    requiredSkills.push("Process Documents");
  } else {
    // Determine if agent can auto-resolve based on issue type and severity
    switch (stage) {
      case "ingestion":
        requiredSkills.push("Process Documents", "Flag Issues");
        if (stageData.ingestion?.isDuplicate) {
          canAutoResolve = true;
          resolutionConfidence = 0.98;
        } else if (stageData.ingestion?.fileQuality === "poor") {
          canAutoResolve = true;
          resolutionConfidence = 0.85;
          requiredSkills.push("Extract text");
        }
        estimatedAutomatedTimeMinutes = 1;
        break;

      case "data-capture":
        requiredSkills.push("Extract text", "Process Documents");
        if (stageData.dataCapture?.requiresManualEntry) {
          // Full OCR failure — agent can attempt re-extraction but needs human fallback
          canAutoResolve = false;
          resolutionConfidence = 0.55;
          estimatedAutomatedTimeMinutes = 10;
        } else if (stageData.dataCapture?.missingFields && stageData.dataCapture.missingFields.length > 0) {
          // Agent can attempt to infer missing fields from context / vendor master
          canAutoResolve = true;
          resolutionConfidence = 0.78;
          estimatedAutomatedTimeMinutes = 3;
        } else if (stageData.dataCapture?.fieldErrors && stageData.dataCapture.fieldErrors.length > 0) {
          // Field format errors are highly automatable (date/amount normalisation)
          canAutoResolve = true;
          resolutionConfidence = 0.88;
          estimatedAutomatedTimeMinutes = 1;
        } else {
          // Low OCR confidence — agent applies enhanced extraction and validation
          canAutoResolve = true;
          resolutionConfidence = 0.80;
          estimatedAutomatedTimeMinutes = 2;
        }
        break;

      case "verification":
        requiredSkills.push("Verify Data", "Flag Issues");
        if (stageData.verification?.policyViolations.length) {
          // Policy violations need human review — agent flags but can't override policy
          canAutoResolve = false;
          resolutionConfidence = 0.60;
          estimatedAutomatedTimeMinutes = 2;
        } else if (!stageData.verification?.vendorVerified) {
          // Unverified vendor — agent can cross-reference vendor master but needs human sign-off
          canAutoResolve = false;
          resolutionConfidence = 0.65;
          estimatedAutomatedTimeMinutes = 3;
        } else if (stageData.verification?.anomalies.length) {
          // Anomalies without policy violations — agent resolves via historical pattern matching
          canAutoResolve = true;
          resolutionConfidence = 0.85;
          estimatedAutomatedTimeMinutes = 1;
        } else {
          // Validation errors (date format, amount mismatch, invalid fields) — highly automatable
          canAutoResolve = true;
          resolutionConfidence = 0.82;
          estimatedAutomatedTimeMinutes = 1;
        }
        break;

      case "matching":
        requiredSkills.push("Find Purchase Orders", "Intelligent Matching");
        if (stageData.matching?.matchStatus === "within_tolerance") {
          // Within tolerance — auto-approve with high confidence
          canAutoResolve = true;
          resolutionConfidence = 0.92;
          estimatedAutomatedTimeMinutes = 1;
        } else if (stageData.matching?.toleranceExceeded) {
          // Over tolerance — agent flags and suggests override; low severity can auto-resolve
          canAutoResolve = issueSeverity !== "high";
          resolutionConfidence = issueSeverity === "low" ? 0.82 : 0.75;
          estimatedAutomatedTimeMinutes = 3;
        } else if (stageData.matching?.matchStatus === "no_match" && stageData.matching?.hasPO) {
          // Has a PO reference but no exact match — agent can do fuzzy/semantic PO matching
          canAutoResolve = true;
          resolutionConfidence = 0.78;
          estimatedAutomatedTimeMinutes = 2;
        } else {
          // No PO at all — agent can attempt confidence-based matching from historical data
          canAutoResolve = true;
          resolutionConfidence = 0.76;
          estimatedAutomatedTimeMinutes = 3;
        }
        break;

      case "approval":
        requiredSkills.push("Route for Approval", "Run Workflows");
        if (stageData.approval?.routingComplexity === "simple") {
          // Simple routing — agent applies rules deterministically
          canAutoResolve = true;
          resolutionConfidence = 0.95;
          estimatedAutomatedTimeMinutes = 0.5;
        } else if (stageData.approval?.routingComplexity === "moderate") {
          // Moderate complexity — agent uses decision tree with good accuracy
          canAutoResolve = true;
          resolutionConfidence = 0.85;
          estimatedAutomatedTimeMinutes = 1;
        } else {
          // Complex routing (unclear rules, escalation, missing approver) — agent can resolve
          // routing_unclear, threshold_exceeded, escalation_needed: agent looks up org chart + rules
          // missing_approver: agent finds delegate from OOO data
          canAutoResolve = true;
          resolutionConfidence = 0.78;
          estimatedAutomatedTimeMinutes = 2;
        }
        break;

      case "posting":
        requiredSkills.push("Connect to ERP System", "Map to General Ledger");
        if (stageData.posting?.needsCoding) {
          // Missing GL code — agent infers from vendor/category patterns
          canAutoResolve = true;
          resolutionConfidence = 0.82;
          estimatedAutomatedTimeMinutes = 2;
          requiredSkills.push("Map to General Ledger");
        } else if (stageData.posting?.erpValidationIssues.length) {
          // ERP validation errors (invalid account, closed period, duplicate) — agent corrects most
          canAutoResolve = true;
          resolutionConfidence = 0.80;
          estimatedAutomatedTimeMinutes = 3;
        } else if (stageData.posting?.reconciliationStatus !== "matched") {
          // Reconciliation mismatch — agent re-runs matching with tolerance
          canAutoResolve = true;
          resolutionConfidence = 0.78;
          estimatedAutomatedTimeMinutes = 2;
        } else {
          // Clean posting path
          canAutoResolve = true;
          resolutionConfidence = 0.95;
          estimatedAutomatedTimeMinutes = 1;
        }
        break;
    }
  }

  return {
    canAutoResolve,
    resolutionConfidence,
    estimatedAutomatedTimeMinutes,
    requiredSkills,
  };
}
