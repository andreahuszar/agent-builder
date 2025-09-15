/**
 * Accounting Classification Service
 * Uses AI to intelligently classify invoices for accounting purposes
 */

import { AnthropicService } from '@/lib/anthropic/service';
import { 
  COST_CENTERS, 
  LEDGER_ACCOUNTS, 
  LEDGER_CLASSIFICATION_RULES,
  suggestGLCode,
  getCostCenterByCode
} from '@/lib/constants/accountingCodes';

export interface ClassificationResult {
  ledger: string;
  costCenter: string | null;
  costCenterName: string | null;
  glCode: string | null;
  department: string | null;
  confidence: number;
  reasoning: string;
  suggestedNotes?: string;
}

export interface InvoiceData {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  total: number;
  currency: string;
  subtotal?: number;
  taxTotal?: number;
  description?: string;
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  poNumber?: string;
  paymentTerms?: string;
  vendorAddress?: string;
  rawText?: string;
}

/**
 * Build the classification prompt for AI
 */
function buildClassificationPrompt(invoice: InvoiceData): string {
  const lineItemsText = invoice.lineItems?.map(item => 
    `- ${item.description}: ${invoice.currency} ${item.amount}`
  ).join('\n') || 'No line items available';

  return `Analyze this invoice and provide accounting classification:

INVOICE DETAILS:
Vendor: ${invoice.vendorName}
Invoice Number: ${invoice.invoiceNumber}
Date: ${invoice.invoiceDate}
Total Amount: ${invoice.currency} ${invoice.total}
${invoice.poNumber ? `PO Number: ${invoice.poNumber}` : ''}

LINE ITEMS:
${lineItemsText}

${invoice.description ? `Additional Description: ${invoice.description}` : ''}

CLASSIFICATION TASK:
Based on the invoice content, determine:

1. LEDGER ACCOUNT - Choose the most appropriate:
   - "Accounts Payable" (default for standard vendor invoices)
   - "Fixed Assets" (equipment/furniture > $5,000)
   - "Prepaid Expenses" (insurance, annual licenses, advance payments)
   - "Accruals" (utilities, services crossing month boundaries)
   - "Inventory" (raw materials, resale items)

2. COST CENTER - Choose the most appropriate:
   - IT-100 (Information Technology) - software, hardware, IT services
   - MKT-200 (Marketing) - advertising, campaigns, events
   - OPS-300 (Operations) - operational supplies, shipping
   - HR-400 (Human Resources) - recruitment, training, benefits
   - FIN-500 (Finance) - audit, compliance, financial services
   - R&D-600 (Research & Development) - product development, research
   - FAC-700 (Facilities) - rent, utilities, maintenance
   - EXEC-800 (Executive) - executive expenses, board costs
   - SALES-900 (Sales) - sales operations, commissions
   - LEGAL-1000 (Legal) - legal services, contracts

3. REASONING - Explain your classification logic in 1-2 sentences

RESPONSE FORMAT (JSON):
{
  "ledger": "Ledger Account Name",
  "costCenter": "XX-###",
  "confidence": 0.85,
  "reasoning": "Brief explanation of classification logic"
}

Analyze the invoice and provide the classification:`;
}

/**
 * Parse AI response into structured classification
 */
function parseClassificationResponse(response: string): Partial<ClassificationResult> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ledger: parsed.ledger || 'Accounts Payable',
        costCenter: parsed.costCenter || null,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    }
  } catch (error) {
    console.error('Failed to parse AI classification response:', error);
  }

  // Fallback parsing if JSON extraction fails
  return {
    ledger: 'Accounts Payable',
    costCenter: null,
    confidence: 0.3,
    reasoning: 'Failed to parse AI response, using defaults'
  };
}

/**
 * Apply rule-based classification as fallback or validation
 */
function applyRuleBasedClassification(invoice: InvoiceData): Partial<ClassificationResult> {
  let ledger = 'Accounts Payable';
  let costCenter = null;
  let confidence = 0.7;
  let reasoning = '';

  // Check for Fixed Assets
  if (invoice.total > 5000) {
    const hasAssetKeywords = invoice.lineItems?.some(item => 
      /equipment|furniture|machinery|computer|laptop|server/i.test(item.description)
    );
    if (hasAssetKeywords) {
      ledger = 'Fixed Assets';
      confidence = 0.85;
      reasoning = 'High-value equipment purchase detected';
    }
  }

  // Check for Prepaid Expenses
  const hasPrepaidKeywords = invoice.description?.match(/prepaid|annual license|insurance|subscription/i) ||
    invoice.lineItems?.some(item => /prepaid|annual|insurance|subscription/i.test(item.description));
  if (hasPrepaidKeywords) {
    ledger = 'Prepaid Expenses';
    confidence = 0.8;
    reasoning = 'Prepaid or annual service detected';
  }

  // Check for Accruals (utilities)
  if (/electric|utility|water|gas/i.test(invoice.vendorName)) {
    ledger = 'Accruals';
    costCenter = 'FAC-700';
    confidence = 0.9;
    reasoning = 'Utility vendor identified';
  }

  // Determine cost center based on vendor or items
  if (!costCenter) {
    if (/IT|software|technology|computer/i.test(invoice.vendorName)) {
      costCenter = 'IT-100';
    } else if (/marketing|advertising|media/i.test(invoice.vendorName)) {
      costCenter = 'MKT-200';
    } else if (/office|supplies/i.test(invoice.vendorName)) {
      costCenter = 'OPS-300';
    }
  }

  return {
    ledger,
    costCenter,
    confidence,
    reasoning: reasoning || 'Classified based on vendor and item analysis'
  };
}

/**
 * Main classification function that combines AI and rule-based approaches
 */
export async function classifyInvoice(invoice: InvoiceData): Promise<ClassificationResult> {
  let result: ClassificationResult = {
    ledger: 'Accounts Payable',
    costCenter: null,
    costCenterName: null,
    glCode: null,
    department: null,
    confidence: 0.5,
    reasoning: 'Default classification'
  };

  try {
    // First, try AI classification
    const prompt = buildClassificationPrompt(invoice);
    const aiResponse = await (AnthropicService as any).sendMessage([
      { role: 'user', content: prompt }
    ]);
    
    const aiClassification = parseClassificationResponse(aiResponse);
    
    // Merge AI results
    result = {
      ...result,
      ...aiClassification
    } as ClassificationResult;
    
    // Validate and enhance with rule-based logic
    const ruleBasedClassification = applyRuleBasedClassification(invoice);
    
    // If AI confidence is low, prefer rule-based
    if (result.confidence < 0.6 && ruleBasedClassification.confidence! > result.confidence) {
      result = {
        ...result,
        ...ruleBasedClassification
      } as ClassificationResult;
    }
    
  } catch (error) {
    console.error('AI classification failed, falling back to rules:', error);
    // Fallback to pure rule-based classification
    const ruleBasedClassification = applyRuleBasedClassification(invoice);
    result = {
      ...result,
      ...ruleBasedClassification
    } as ClassificationResult;
  }

  // Enhance with additional data
  if (result.costCenter) {
    const costCenterData = getCostCenterByCode(result.costCenter);
    if (costCenterData) {
      result.costCenterName = costCenterData.name;
      result.department = costCenterData.department;
      
      // Suggest GL code based on cost center and description
      const description = invoice.lineItems?.[0]?.description || invoice.description || '';
      result.glCode = suggestGLCode(result.costCenter, description);
    }
  }

  // Add suggested notes based on classification
  result.suggestedNotes = generateAccountingNotes(invoice, result);

  return result;
}

/**
 * Generate suggested accounting notes
 */
function generateAccountingNotes(invoice: InvoiceData, classification: ClassificationResult): string {
  const notes: string[] = [];
  
  // Add vendor and period info
  notes.push(`${invoice.vendorName} - Invoice ${invoice.invoiceNumber}`);
  
  // Add classification reason
  if (classification.ledger === 'Fixed Assets') {
    notes.push('Capital expenditure - to be depreciated');
  } else if (classification.ledger === 'Prepaid Expenses') {
    const months = invoice.paymentTerms?.match(/(\d+)\s*month/i)?.[1] || '12';
    notes.push(`Prepaid expense - amortize over ${months} months`);
  } else if (classification.ledger === 'Accruals') {
    notes.push(`Accrual for ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`);
  }
  
  // Add PO reference if available
  if (invoice.poNumber) {
    notes.push(`PO: ${invoice.poNumber}`);
  }
  
  return notes.join('; ');
}

/**
 * Validate classification result
 */
export function validateClassification(classification: ClassificationResult): string[] {
  const warnings: string[] = [];
  
  // Check for missing cost center
  if (!classification.costCenter) {
    warnings.push('No cost center assigned - manual selection required');
  }
  
  // Check for low confidence
  if (classification.confidence < 0.6) {
    warnings.push('Low confidence classification - manual review recommended');
  }
  
  // Check for unusual combinations
  if (classification.ledger === 'Fixed Assets' && classification.costCenter === 'MKT-200') {
    warnings.push('Unusual: Fixed Assets in Marketing cost center');
  }
  
  return warnings;
}

/**
 * Get classification suggestions for dropdown
 */
export function getClassificationSuggestions(vendorName: string, amount: number): {
  ledgers: string[];
  costCenters: string[];
} {
  const suggestions = {
    ledgers: [] as string[],
    costCenters: [] as string[]
  };
  
  // Suggest ledgers based on amount
  if (amount > 5000) {
    suggestions.ledgers.push('Fixed Assets');
  }
  suggestions.ledgers.push('Accounts Payable'); // Always include default
  
  // Suggest cost centers based on vendor name
  if (/IT|tech|software|computer/i.test(vendorName)) {
    suggestions.costCenters.push('IT-100');
  }
  if (/marketing|advertis|media/i.test(vendorName)) {
    suggestions.costCenters.push('MKT-200');
  }
  if (/office|supplies/i.test(vendorName)) {
    suggestions.costCenters.push('OPS-300');
  }
  if (/electric|utility|water|gas/i.test(vendorName)) {
    suggestions.costCenters.push('FAC-700');
  }
  
  return suggestions;
}