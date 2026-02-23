/**
 * AI Metrics Service
 * Calculates productivity metrics, cost savings, and performance indicators for AI agents
 */

export interface AgentMetrics {
  totalActiveAgents: number;
  totalInvoices: number;
  invoicesTouchedByAgents: number;
  invoicesTouchedByAgentsPercent: number;
  touchlessRate: number;
  touchlessRateWithoutAgents: number;
  hoursSaved: number;
  fteSaved: number;
  avgCostPerInvoice: number;
  avgCostPerInvoiceWithoutAgents: number;
  avgProcessingTimeMinutes: number;
  avgProcessingTimeWithoutAgentsMinutes: number;
  agentErrorRate: number;
  exceptionRate: number;
  exceptionsFixedByAgents: number;
  exceptionsFixedByHumans: number;
  unusedAgentCount: number;
  humanInterventionsAvoided: number;
}

export interface AgentByStage {
  stage: string;
  count: number;
  agents: Array<{
    name: string;
    active: boolean;
    performanceScore: number;
  }>;
}

export interface TouchlessRateDataPoint {
  date: string;
  withAgents: number;
  withoutAgents: number;
}

export interface ProcessingVolumeDataPoint {
  month: string;
  fullyAutomated: number;
  aiAssisted: number;
  humanAssisted: number;
}

/**
 * Generate mock AI metrics data
 */
export function generateAIMetrics(): AgentMetrics {
  // Mock calculations based on typical enterprise invoice processing
  const totalInvoices = 52840;
  const invoicesTouchedByAgents = 43128;
  const touchlessWithAgents = 0.847; // 84.7%
  const touchlessWithoutAgents = 0.623; // 62.3%
  
  return {
    totalActiveAgents: 8,
    totalInvoices,
    invoicesTouchedByAgents,
    invoicesTouchedByAgentsPercent: (invoicesTouchedByAgents / totalInvoices) * 100,
    touchlessRate: touchlessWithAgents * 100,
    touchlessRateWithoutAgents: touchlessWithoutAgents * 100,
    hoursSaved: 8940,
    fteSaved: 4.3,
    avgCostPerInvoice: 2.87,
    avgCostPerInvoiceWithoutAgents: 12.50,
    avgProcessingTimeMinutes: 3.2,
    avgProcessingTimeWithoutAgentsMinutes: 14.8,
    agentErrorRate: 0.42, // per 1000
    exceptionRate: 4.8,
    exceptionsFixedByAgents: 1847,
    exceptionsFixedByHumans: 412,
    unusedAgentCount: 2,
    humanInterventionsAvoided: 34220,
  };
}

/**
 * Get agents grouped by workflow stage
 */
export function getAgentsByStage(): AgentByStage[] {
  return [
    {
      stage: 'Receipt & Data Capture',
      count: 2,
      agents: [
        { name: 'OCR Agent', active: true, performanceScore: 98.4 },
        { name: 'TechSupply Customer Reference Extraction', active: true, performanceScore: 96.7 },
      ],
    },
    {
      stage: 'Validation & Matching',
      count: 3,
      agents: [
        { name: 'Conversion Agent', active: true, performanceScore: 99.2 },
        { name: 'Bank Details Checker', active: true, performanceScore: 97.8 },
        { name: 'Bulk Commodities Tolerance', active: true, performanceScore: 95.3 },
      ],
    },
    {
      stage: 'Approval Routing',
      count: 2,
      agents: [
        { name: 'High Value Invoices', active: true, performanceScore: 99.1 },
        { name: 'Routing Approval for IT Spend', active: true, performanceScore: 98.6 },
      ],
    },
    {
      stage: 'GL Posting & Payment',
      count: 1,
      agents: [
        { name: 'GL Posting Agent', active: true, performanceScore: 99.8 },
      ],
    },
    {
      stage: 'Inactive',
      count: 2,
      agents: [
        { name: 'Tax Rate Validator', active: false, performanceScore: 0 },
        { name: 'Duplicate Detection', active: false, performanceScore: 0 },
      ],
    },
  ];
}

/**
 * Generate touchless rate trend data (last 12 months)
 */
export function getTouchlessRateTrend(): TouchlessRateDataPoint[] {
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const baseWithout = 62.3;
  const baseWith = 68.5; // Starting point before full agent deployment
  
  return months.map((month, index) => {
    // Simulate gradual improvement with agents
    const agentImprovement = (index / months.length) * 16.2; // Ramp up to 84.7%
    const withAgents = Math.min(baseWith + agentImprovement, 84.7);
    // Without agents stays relatively flat with slight improvements
    const withoutAgents = baseWithout + (Math.random() * 2 - 1);
    
    return {
      date: month,
      withAgents: parseFloat(withAgents.toFixed(1)),
      withoutAgents: parseFloat(withoutAgents.toFixed(1)),
    };
  });
}

/**
 * Generate processing volume data (last 6 months)
 */
export function getProcessingVolume(): ProcessingVolumeDataPoint[] {
  return [
    { month: 'Feb', fullyAutomated: 3240, aiAssisted: 1850, humanAssisted: 480 },
    { month: 'Mar', fullyAutomated: 3680, aiAssisted: 2120, humanAssisted: 420 },
    { month: 'Apr', fullyAutomated: 4120, aiAssisted: 2340, humanAssisted: 380 },
    { month: 'May', fullyAutomated: 4580, aiAssisted: 2680, humanAssisted: 340 },
    { month: 'Jun', fullyAutomated: 5020, aiAssisted: 2950, humanAssisted: 290 },
    { month: 'Jul', fullyAutomated: 5480, aiAssisted: 3180, humanAssisted: 240 },
  ];
}

/**
 * Calculate cost savings breakdown
 */
export function getCostSavingsBreakdown() {
  return {
    laborCostSavings: 287400, // Annual labor cost saved
    errorReductionSavings: 43200, // Cost saved from reduced errors
    fasterPaymentDiscounts: 18900, // Early payment discounts captured
    exceptionHandlingReduction: 31500, // Reduced exception handling costs
    totalAnnualSavings: 381000,
  };
}

/**
 * Get agent performance rankings
 */
export function getAgentPerformanceRankings() {
  return [
    { name: 'GL Posting Agent', accuracy: 99.8, invoicesProcessed: 12847, timeSavedHours: 2140 },
    { name: 'Conversion Agent', accuracy: 99.2, invoicesProcessed: 8432, timeSavedHours: 1680 },
    { name: 'High Value Invoices', accuracy: 99.1, invoicesProcessed: 3241, timeSavedHours: 1450 },
    { name: 'Routing Approval for IT Spend', accuracy: 98.6, invoicesProcessed: 4128, timeSavedHours: 980 },
    { name: 'OCR Agent', accuracy: 98.4, invoicesProcessed: 43128, timeSavedHours: 1820 },
    { name: 'Bank Details Checker', accuracy: 97.8, invoicesProcessed: 11234, timeSavedHours: 540 },
    { name: 'TechSupply Customer Reference Extraction', accuracy: 96.7, invoicesProcessed: 2847, timeSavedHours: 230 },
    { name: 'Bulk Commodities Tolerance', accuracy: 95.3, invoicesProcessed: 1542, timeSavedHours: 100 },
  ];
}
