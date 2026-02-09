/**
 * Agent Invoice Service
 * Generates mock invoices processed by agents from the agent builder
 */

import { UnifiedInvoice } from '@/types/invoice';
import { simulateAgentProcessing, AgentConfig, parseAgentPrompt } from '@/app/components/agentbuilder/agentSimulator';
import { generateTestScenarios, TestScenario } from '@/app/components/agentbuilder/testScenarioGenerator';

// Type alias for backward compatibility
type Invoice = Partial<UnifiedInvoice>;

// Module-level cache to persist invoices across client-side navigations
let cachedInvoices: Invoice[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Clear the invoice cache (call when agents change)
 */
export function clearInvoiceCache() {
  console.log('[AgentInvoiceService] Clearing invoice cache');
  cachedInvoices = null;
  cacheTimestamp = 0;
}

/**
 * Load active agents from localStorage (client-side only)
 */
function loadActiveAgents(): AgentConfig[] {
  // Client-side: read from localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agents');
      if (!stored) return [];
      
      const agents = JSON.parse(stored);
      if (!Array.isArray(agents)) return [];
      
      // Convert to AgentConfig format and filter active agents
      return agents
        .filter((a: any) => a.active)
        .map((a: any) => ({
          name: a.name,
          stage: a.stage,
          lane: a.lane,
          mode: a.mode || 'observe',
          prompt: a.prompt || '',
          skills: a.skills || []
        }));
    } catch (e) {
      console.error('Failed to load agents from localStorage:', e);
      return [];
    }
  }
  
  // Server-side: return empty array (use server-specific loader instead)
  return [];
}

/**
 * Generate agent-processed invoices (with optional server-side agents)
 */
export function generateAgentProcessedInvoices(serverAgents?: AgentConfig[]): Invoice[] {
  // Check cache first (client-side only, short TTL)
  const now = Date.now();
  if (typeof window !== 'undefined' && cachedInvoices && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('[AgentInvoiceService] Returning cached invoices:', cachedInvoices.length);
    return cachedInvoices;
  }

  // Load active agents (use provided server agents or load from client)
  const agents = serverAgents || loadActiveAgents();

  console.log('[AgentInvoiceService] Generating invoices with agents:', agents.length);

  // If no agents, return cached or empty array
  if (agents.length === 0) {
    console.warn('[AgentInvoiceService] No active agents found');
    if (cachedInvoices) {
      console.log('[AgentInvoiceService] Returning stale cache:', cachedInvoices.length);
      return cachedInvoices;
    }
    return [];
  }

  console.log('[AgentInvoiceService] Agent names:', agents.map(a => a.name));
  
  // Generate base test scenarios (10-15 invoices with various issues)
  console.log('[AgentInvoiceService] Generating test scenarios...');
  const allScenarios = generateTestScenarios('7days', {
    scenarioTypes: ['common_issues', 'edge_cases'],
    issueMix: 60, // 60% have issues
    stage: 'verification', // Start at verification stage
  });
  
  // Take only first 15 scenarios
  const scenarios = allScenarios.slice(0, 15);
  
  console.log('[AgentInvoiceService] Generated scenarios:', scenarios.length);
  
  // Process each scenario through agents
  const processedInvoices: Invoice[] = [];
  
  scenarios.forEach((scenario, index) => {
    console.log('[AgentInvoiceService] Processing scenario', index + 1);
    const invoiceId = `agent-processed-${index + 1}`;
    
    // Process through each active agent
    const agentResults = agents.map(agent => 
      simulateAgentProcessing(scenario, agent)
    );
    
    console.log('[AgentInvoiceService] Agent results for scenario', index + 1, ':', agentResults.length);
    
    // Transform scenario and agent results into invoice format
    const invoice = transformScenarioToInvoice(invoiceId, scenario, agentResults, agents);
    console.log('[AgentInvoiceService] Transformed invoice:', invoice.id, invoice.invoice_number, 'Issues:', invoice.issues);
    processedInvoices.push(invoice);
  });
  
  console.log('[AgentInvoiceService] Total processed invoices:', processedInvoices.length);
  
  // Cache the results (client-side only)
  if (typeof window !== 'undefined') {
    cachedInvoices = processedInvoices;
    cacheTimestamp = Date.now();
    console.log('[AgentInvoiceService] Cached invoices for future requests');
  }
  
  return processedInvoices;
}

/**
 * Get specific agent-processed invoice by ID
 */
export function getAgentProcessedInvoiceById(id: string): Invoice | null {
  const invoices = generateAgentProcessedInvoices();
  return invoices.find(inv => inv.id === id) || null;
}

/**
 * Detect if line item is a perishable good/foodstuff
 */
function isPerishableGood(description: string): boolean {
  const perishableKeywords = [
    // Produce
    'fresh', 'produce', 'vegetable', 'fruit', 'organic',
    // Dairy
    'dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream',
    // Meat
    'meat', 'beef', 'pork', 'chicken', 'turkey', 'lamb', 'steak', 'poultry',
    // Seafood
    'seafood', 'fish', 'salmon', 'tuna', 'shrimp', 'shellfish',
    // Frozen
    'frozen',
    // Beverages
    'juice', 'beverage', 'drink',
    // Other
    'bread', 'bakery', 'pastry', 'eggs', 'perishable', 'foodstuff', 'catering'
  ];
  
  const descLower = description.toLowerCase();
  return perishableKeywords.some(keyword => descLower.includes(keyword));
}

/**
 * Transform test scenario and agent results into invoice format
 */
function transformScenarioToInvoice(
  id: string,
  scenario: TestScenario,
  agentResults: any[],
  agents: AgentConfig[]
): Invoice {
  const now = new Date();
  const invoiceDate = new Date(scenario.date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  // Determine if OCR agent auto-resolved missing fields
  const hasOCRAgent = agents.some(a => 
    a.name.toLowerCase().includes('ocr') && a.mode === 'auto-apply'
  );
  
  // Find routing agent and parse approver from prompt
  const routingAgent = agents.find(a => 
    a.name.toLowerCase().includes('routing') && 
    a.stage === 'approval' &&
    a.mode === 'auto-apply'
  );
  
  // Parse routing rules from agent prompt
  let routingApprover: { name: string; email: string } | null = null;
  if (routingAgent) {
    const parsedRules = parseAgentPrompt(routingAgent.prompt);
    routingApprover = parsedRules.routingApprover || null;
  }
  
  const hasRoutingAgent = !!routingAgent && !!routingApprover;
  
  // Determine invoice characteristics (compute once for consistency)
  const isNonPO = !scenario.stageData.matching?.hasPO;
  
  // Generate clean job_number by default since OCR agent auto-resolves issues
  // Use a simple incrementing sequence matching the WO-2025-XXX pattern on documents
  // Extract the last digits from invoice ID (e.g., INV-2024-10000 -> 00, INV-2024-10001 -> 01)
  const invoiceNum = parseInt((scenario.id.match(/\d+$/) || ['0'])[0]);
  const workOrderNumber = 450 + (invoiceNum % 100); // Maps 10000->450, 10001->451, etc. Avoids conflict with WO-2025-445
  let finalJobNumber: string | null = hasOCRAgent ? `WO-2025-${workOrderNumber}` : null;
  
  // Determine status based on agent actions
  let status = 'verification';
  const hasSuggestions = agentResults.some(r => r.agentAction === 'suggested_resolution');
  const hasAutoApplied = agentResults.some(r => r.agentAction === 'auto_resolved');
  const hasObservations = agentResults.some(r => r.agentAction === 'observed');
  
  if (hasAutoApplied && !hasSuggestions) {
    status = 'matching'; // Auto-applied, moved to next stage
  } else if (hasSuggestions) {
    status = 'verification'; // Has suggestions that need review
  }
  
  // Build OCR extractions with agent suggestions (for suggest mode) or corrections (for auto-apply)
  const ocr_extractions: any = {};
  
  agentResults.forEach((result, idx) => {
    const agent = agents[idx];
    
    // Only add OCR suggestions if agent is in suggest mode (not auto-apply)
    // Auto-apply agents just fill in the field values directly
    if (agent.mode === 'suggest' && 
        agent.name.toLowerCase().includes('ocr') && 
        result.agentAction === 'suggested_resolution') {
      
      // Add job_number candidate if it was missing (20% chance for demo variety)
      if (Math.random() < 0.2) {
        ocr_extractions.job_number = {
          value: null,
          confidence: 0.0,
          candidates: [{
            value: `JOB-${Math.floor(Math.random() * 10000)}`,
            confidence: result.agentConfidence || 0.92,
            source: 'agent',
            agent_name: agent.name,
            agent_id: agent.name.toLowerCase().replace(/\s+/g, '-'),
            agent_reasoning: 'Extracted from document based on vendor pattern and historical data'
          }]
        };
        // If there's a suggestion, the field should be null (waiting for acceptance)
        finalJobNumber = null;
      }
    }
  });
  
  // Add variety based on invoice sequence
  const invoiceIndex = invoiceNum % 15;
  
  // Determine if invoice should be routed to IT approver (deterministic based on index)
  // Invoices at index 1, 3, 6, 8, 11, 13 are IT-related (internet, software, cloud services, etc.)
  const itRelatedIndices = [1, 3, 6, 8, 11, 13]; // ~40% of invoices
  const isITSpend = itRelatedIndices.includes(invoiceIndex);
  const shouldRouteToIT = hasRoutingAgent && isNonPO && isITSpend;
  
  // Vary currency based on invoice index
  const currencies = ['USD', 'GBP', 'EUR', 'CAD', 'AUD'];
  const currencyIndex = invoiceIndex % currencies.length;
  const invoiceCurrency = currencies[currencyIndex];
  
  // Tax rates vary by currency/region
  const taxRates: Record<string, number> = {
    'USD': 0.0875, // ~8.75% (US average)
    'GBP': 0.20,   // 20% VAT (UK)
    'EUR': 0.19,   // 19% VAT (EU average)
    'CAD': 0.13,   // 13% HST (Canada)
    'AUD': 0.10    // 10% GST (Australia)
  };
  const taxRate = taxRates[invoiceCurrency];
  const taxRatePercent = taxRate * 100;
  
  // Vary invoice number formats
  const invoiceFormats = [
    `INV-2024-${10000 + invoiceNum}`,         // Standard format
    `SI-${(10000 + invoiceNum).toString().padStart(6, '0')}`,  // Sales Invoice
    `${scenario.vendor.substring(0, 3).toUpperCase()}-${invoiceDate.getFullYear()}-${(invoiceNum % 1000).toString().padStart(4, '0')}`, // Vendor prefix
    `${invoiceDate.getFullYear()}/${(invoiceNum % 10000).toString().padStart(5, '0')}`, // Year/Number
    `F${invoiceDate.getFullYear().toString().slice(-2)}${(invoiceNum % 10000).toString().padStart(5, '0')}` // Fiscal year format
  ];
  const invoiceNumber = invoiceFormats[invoiceIndex % invoiceFormats.length];
  
  // Calculate amounts (only 20% have tax errors) - MUST BE BEFORE auto_corrections
  const hasTaxError = Math.random() < 0.2;
  let calculatedSubtotal: number;
  let calculatedTaxTotal: number;
  let calculatedTotal: number;
  
  if (hasTaxError) {
    // Incorrect tax calculation (tax is 20% too high)
    calculatedSubtotal = scenario.amount / (1 + taxRate * 1.2);
    calculatedTaxTotal = calculatedSubtotal * taxRate * 1.2;
    calculatedTotal = scenario.amount;
  } else {
    // Correct tax calculation
    calculatedSubtotal = scenario.amount / (1 + taxRate);
    calculatedTaxTotal = calculatedSubtotal * taxRate;
    calculatedTotal = scenario.amount;
  }
  
  // Round to 2 decimal places
  calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
  calculatedTaxTotal = Math.round(calculatedTaxTotal * 100) / 100;
  calculatedTotal = Math.round(calculatedTotal * 100) / 100;
  
  // Build auto_corrections from auto-apply agents
  const auto_corrections: any[] = [];
  
  agentResults.forEach((result, idx) => {
    const agent = agents[idx];
    
    if (agent.mode === 'auto-apply') {
      // OCR Agent - extracts ALL fields from the document
      if (agent.name.toLowerCase().includes('ocr')) {
        // Add all OCR-extracted fields with lightning bolts
        const ocrFields = [
          {
            field: 'invoice_number',
            corrected_value: invoiceNumber,
            source_field: 'Invoice Number',
            confidence: 1.0
          },
          {
            field: 'invoice_date',
            corrected_value: scenario.stageData.ingestion?.invoiceDate || now.toISOString().split('T')[0],
            source_field: 'Invoice Date',
            confidence: 0.98
          },
          {
            field: 'due_date',
            corrected_value: scenario.stageData.ingestion?.dueDate || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            source_field: 'Due Date',
            confidence: 0.97
          },
          {
            field: 'vendor_name_snapshot',
            corrected_value: scenario.vendor,
            source_field: 'Vendor Name',
            confidence: 1.0
          },
          {
            field: 'currency',
            corrected_value: invoiceCurrency,
            source_field: 'Currency Code',
            confidence: 1.0
          },
          {
            field: 'subtotal',
            corrected_value: calculatedSubtotal.toString(),
            source_field: 'Subtotal',
            confidence: 0.99
          },
          {
            field: 'tax_total',
            corrected_value: calculatedTaxTotal.toString(),
            source_field: 'Tax Amount',
            confidence: 0.99
          },
          {
            field: 'total',
            corrected_value: calculatedTotal.toString(),
            source_field: 'Total Amount',
            confidence: 1.0
          }
        ];
        
        // Add job_number if present
        if (finalJobNumber) {
          ocrFields.push({
            field: 'job_number',
            corrected_value: finalJobNumber,
            source_field: 'Reference',
            confidence: 1.0
          });
        }
        
        // Add PO number if present
        if (scenario.stageData.matching?.poNumber) {
          ocrFields.push({
            field: 'po_numbers_cached',
            corrected_value: scenario.stageData.matching.poNumber,
            source_field: 'PO Number',
            confidence: 0.99
          });
        }
        
        // Add all OCR extractions to auto_corrections
        ocrFields.forEach(field => {
          auto_corrections.push({
            field: field.field,
            original_value: '',
            corrected_value: field.corrected_value,
            reason: `Auto-extracted from "${field.source_field}" field on invoice document`,
            agent_name: agent.name,
            agent_id: agent.name.toLowerCase().replace(/\s+/g, '-'),
            timestamp: now.toISOString(),
            confidence: field.confidence,
            source_field: field.source_field,
            is_extraction: true // Flag to differentiate extraction from correction
          });
        });
      }
      
      // GL Posting agent auto-assigning GL codes (15% of invoices)
      if (agent.name.toLowerCase().includes('gl posting') && Math.random() < 0.15) {
        auto_corrections.push({
          field: 'gl_code',
          original_value: '',
          corrected_value: 'GL-5000',
          reason: 'GL code auto-assigned based on vendor category and line item analysis',
          agent_name: agent.name,
          agent_id: agent.name.toLowerCase().replace(/\s+/g, '-'),
          timestamp: now.toISOString()
        });
      }
    }
  });
  
  // Routing agent (auto-apply mode) - add corrections for approver routing
  if (routingAgent && shouldRouteToIT && routingApprover) {
    const categoryLabel = routingAgent.name.includes('IT') ? 'software/IT services' : 'category match';
    
    auto_corrections.push({
      field: 'assigned_to_name',
      original_value: '',
      corrected_value: routingApprover.name,
      reason: `Non-PO invoice for ${categoryLabel} - routed to designated approver`,
      agent_name: routingAgent.name,
      agent_id: routingAgent.name.toLowerCase().replace(/\s+/g, '-'),
      timestamp: now.toISOString(),
      confidence: 1.0
    });
    
    auto_corrections.push({
      field: 'assigned_to_email',
      original_value: '',
      corrected_value: routingApprover.email,
      reason: 'Approver email assigned based on routing agent configuration',
      agent_name: routingAgent.name,
      agent_id: routingAgent.name.toLowerCase().replace(/\s+/g, '-'),
      timestamp: now.toISOString(),
      confidence: 1.0
    });
  }
  
  // Build agent_insights from observe-mode agents and flagging agents
  const agent_insights: any[] = [];
  
  agentResults.forEach((result, idx) => {
    const agent = agents[idx];
    
    // Observe-mode agents
    if (agent.mode === 'observe' && result.agentAction === 'observed') {
      agent_insights.push({
        type: 'observation',
        agent_name: agent.name,
        agent_id: agents[idx].name.toLowerCase().replace(/\s+/g, '-'),
        message: result.details || result.agentReasoning,
        severity: result.flaggedIssues.length > 0 ? 'warning' : 'info',
        timestamp: now.toISOString(),
        details: {
          flaggedIssues: result.flaggedIssues,
          skillsUsed: result.skillsUsed
        }
      });
    }
    
    // High value invoice agent (auto-apply mode but flags for review)
    if (agent.name.toLowerCase().includes('high value') && scenario.amount > 100000) {
      agent_insights.push({
        type: 'observation',
        agent_name: agent.name,
        agent_id: agent.name.toLowerCase().replace(/\s+/g, '-'),
        message: `Invoice exceeds $100k threshold ($${(scenario.amount / 1000).toFixed(0)}k) - flagged for additional review`,
        severity: 'warning',
        timestamp: now.toISOString(),
        details: {
          amount: scenario.amount,
          threshold: 100000,
          flaggedIssues: ['High Value Invoice'],
          skillsUsed: []
        }
      });
    }
    
    // Routing agent insights (moved outside loop below)
    // Note: This is now handled separately after the forEach loop
    
    // GL Posting agent
    if (agent.name.toLowerCase().includes('gl posting') && 
        result.agentAction === 'auto_resolved' &&
        Math.random() < 0.15) { // 15% show GL insights
      agent_insights.push({
        type: 'observation',
        agent_name: agent.name,
        agent_id: agent.name.toLowerCase().replace(/\s+/g, '-'),
        message: 'GL codes and cost centers validated and auto-assigned based on vendor and line item analysis',
        severity: 'info',
        timestamp: now.toISOString(),
        details: {
          glCode: 'GL-5000',
          costCenter: 'CC-9002',
          department: 'Product',
          skillsUsed: ['Validate GL Codes', 'Assign Cost Centers']
        }
      });
    }
  });
  
  // Routing agent insights (add after the forEach loop)
  if (routingAgent && shouldRouteToIT && routingApprover) {
    const categoryLabel = routingAgent.name.includes('IT') ? 'Software/IT Services' : 'Category Match';
    
    agent_insights.push({
      type: 'observation',
      agent_name: routingAgent.name,
      agent_id: routingAgent.name.toLowerCase().replace(/\s+/g, '-'),
      message: `Non-PO invoice routed to ${routingApprover.name} for approval`,
      severity: 'info',
      timestamp: now.toISOString(),
      details: {
        approver: `${routingApprover.name} (${routingApprover.email})`,
        category: categoryLabel,
        skillsUsed: routingAgent.skills || []
      }
    });
  }
  
  // Determine match_status based on PO data
  let match_status = 'unmatched';
  if (scenario.stageData.matching?.hasPO) {
    match_status = scenario.stageData.matching.matchStatus === 'exact' ? 'matched' : 
                   scenario.stageData.matching.matchStatus === 'within_tolerance' ? 'matched' : 
                   'variance';
  }
  
  // Create invoice lines with variety based on invoice index
  const lineItemVarieties = [
    // Software & IT
    { sku: 'SW-001', description: 'Microsoft Office 365 Subscription', qty: 25, uom: 'EA' },
    { sku: 'HW-223', description: 'Dell Latitude 5420 Laptops', qty: 3, uom: 'EA' },
    { sku: 'SVC-112', description: 'Cloud Infrastructure Services', qty: 1, uom: 'MO' },
    // Office Supplies
    { sku: 'OFF-445', description: 'Office Furniture - Ergonomic Chairs', qty: 12, uom: 'EA' },
    { sku: 'STA-889', description: 'Printer Paper & Stationery Bundle', qty: 50, uom: 'BX' },
    // Professional Services
    { sku: 'CON-567', description: 'Management Consulting Services', qty: 80, uom: 'HR' },
    { sku: 'LEG-234', description: 'Legal Review & Documentation', qty: 15, uom: 'HR' },
    { sku: 'ACC-112', description: 'Annual Audit Services', qty: 1, uom: 'EA' },
    // Marketing & Events
    { sku: 'MKT-778', description: 'Digital Marketing Campaign', qty: 1, uom: 'MO' },
    { sku: 'EVT-445', description: 'Corporate Event Catering', qty: 150, uom: 'EA' },
    // Facilities & Maintenance
    { sku: 'FAC-223', description: 'Office Cleaning Services', qty: 4, uom: 'WK' },
    { sku: 'UTL-889', description: 'Electricity & Utilities', qty: 1, uom: 'MO' },
    { sku: 'MNT-556', description: 'HVAC System Maintenance', qty: 1, uom: 'EA' },
    // Telecommunications
    { sku: 'TEL-334', description: 'Internet & Broadband Services', qty: 1, uom: 'MO' },
    { sku: 'MOB-667', description: 'Mobile Phone Plans', qty: 35, uom: 'EA' },
    // Food & Perishables
    { sku: 'FOD-001', description: 'Fresh Produce - Organic Vegetables', qty: 50, uom: 'KG' },
    { sku: 'FOD-002', description: 'Dairy Products - Milk & Cheese', qty: 25, uom: 'KG' },
    { sku: 'FOD-003', description: 'Fresh Meat - Beef & Poultry', qty: 30, uom: 'KG' },
    { sku: 'FOD-004', description: 'Frozen Foods - Ready Meals', qty: 40, uom: 'KG' },
    { sku: 'FOD-005', description: 'Beverages - Fresh Juices', qty: 100, uom: 'L' },
    { sku: 'FOD-006', description: 'Bakery Items - Fresh Bread', qty: 20, uom: 'KG' }
  ];
  
  const lineItem = lineItemVarieties[invoiceIndex % lineItemVarieties.length];
  const unitPrice = Math.round((calculatedSubtotal / lineItem.qty) * 100) / 100;
  
  const lines = [
    {
      id: `line-${id}-1`,
      line_no: 1,
      sku: lineItem.sku,
      product_code: lineItem.sku,
      description: lineItem.description,
      qty: lineItem.qty,
      uom: lineItem.uom,
      unit_price: unitPrice,
      net_amount: calculatedSubtotal,
      line_total: calculatedSubtotal,
      po_line_id: scenario.stageData.matching?.hasPO ? scenario.stageData.matching.poNumber + '-1' : null,
      gr_line_id: null,
      ses_line_id: null
    }
  ];
  
  // Bulk Commodities agent - detect foodstuffs and apply tolerance
  const bulkCommoditiesAgent = agents.find(a => 
    a.name.toLowerCase().includes('commodit') && a.mode === 'auto-apply'
  );

  if (bulkCommoditiesAgent) {
    let appliedToleranceCount = 0;
    
    lines.forEach((line) => {
      if (isPerishableGood(line.description)) {
        appliedToleranceCount++;
        
        // Simulate variance (3-5% variance for perishables)
        const variancePercent = 0.03 + (Math.random() * 0.02);
        const hasVariance = Math.random() < 0.7; // 70% of foodstuff items have variance
        
        if (hasVariance) {
          const originalQty = line.qty;
          const adjustedQty = Math.round(originalQty * (1 + variancePercent) * 10) / 10;
          
          auto_corrections.push({
            field: `line_${line.line_no}_qty`,
            original_value: originalQty.toString(),
            corrected_value: adjustedQty.toString(),
            reason: `Quantity variance of ${(variancePercent * 100).toFixed(1)}% within bulk commodities tolerance (+/- 5%) - detected perishable goods`,
            agent_name: bulkCommoditiesAgent.name,
            agent_id: bulkCommoditiesAgent.name.toLowerCase().replace(/\s+/g, '-'),
            timestamp: now.toISOString(),
            confidence: 0.95
          });
        }
      }
    });
    
    // Create agent insight if tolerance was applied to any items
    if (appliedToleranceCount > 0) {
      const foodstuffItems = lines.filter(l => isPerishableGood(l.description));
      const itemDescriptions = foodstuffItems.map(l => l.description).join(', ');
      
      agent_insights.push({
        type: 'observation',
        agent_name: bulkCommoditiesAgent.name,
        agent_id: bulkCommoditiesAgent.name.toLowerCase().replace(/\s+/g, '-'),
        message: `Applied +/- 5% matching tolerance for ${appliedToleranceCount} perishable goods line item(s)`,
        severity: 'info',
        timestamp: now.toISOString(),
        details: {
          perishableItemsDetected: appliedToleranceCount,
          items: itemDescriptions,
          toleranceLevel: '5%',
          standardTolerance: '1-2%',
          reason: 'Perishable goods require higher tolerance due to natural variance in bulk commodities',
          unitConversion: 'KG',
          skillsUsed: bulkCommoditiesAgent.skills || []
        }
      });
    }
  }
  
  // Vary vendor details based on currency
  const vendorDetails = {
    'USD': {
      address: '450 Commerce Park, San Francisco, CA 94102, USA',
      phone: '+1 (415) 555-0123',
      email: 'billing@vendor.com',
      taxId: `${Math.floor(Math.random() * 90 + 10)}-${Math.floor(Math.random() * 9000000 + 1000000)}`
    },
    'GBP': {
      address: '45 London Wall, London, EC2M 5NT, United Kingdom',
      phone: '+44 20 7946 0958',
      email: 'accounts@vendor.co.uk',
      taxId: `GB ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 90 + 10)}`
    },
    'EUR': {
      address: 'Hauptstraße 123, 10115 Berlin, Germany',
      phone: '+49 30 12345678',
      email: 'rechnung@vendor.de',
      taxId: `DE${Math.floor(Math.random() * 900000000 + 100000000)}`
    },
    'CAD': {
      address: '789 Bay Street, Toronto, ON M5G 2N9, Canada',
      phone: '+1 (416) 555-0199',
      email: 'billing@vendor.ca',
      taxId: `${Math.floor(Math.random() * 900000000 + 100000000)}RT0001`
    },
    'AUD': {
      address: '123 George Street, Sydney NSW 2000, Australia',
      phone: '+61 2 9876 5432',
      email: 'accounts@vendor.com.au',
      taxId: `${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 900 + 100)}`
    }
  };
  
  const vendorInfo = vendorDetails[invoiceCurrency];
  
  // Build the invoice
  const invoice: Invoice = {
    id,
    invoice_number: invoiceNumber,
    vendor_name_snapshot: scenario.vendor,
    vendor_id: `VND${Math.floor(Math.random() * 10000)}`,
    vendor_tax_id_snapshot: vendorInfo.taxId,
    vendor_address_snapshot: vendorInfo.address,
    vendor_email: vendorInfo.email,
    vendor_phone: vendorInfo.phone,
    customer_no: `CS${Math.floor(Math.random() * 1000000)}`,
    job_number: finalJobNumber,
    
    bill_to_snapshot: {
      legal_name: 'GSPV Ltd',
      tax_id: '927 8131 1',
      email: 'phil@xelix.com',
      phone: '+44 20 8648 4267',
      address: 'Senna Building, Gorsuch Pl, London, E2 8JF'
    },
    
    invoice_date: scenario.date,
    due_date: dueDate.toISOString().split('T')[0],
    email_received_date: invoiceDate.toISOString().split('T')[0],
    currency: invoiceCurrency,
    subtotal: calculatedSubtotal,
    tax_total: calculatedTaxTotal,
    tax_rate_percent: taxRatePercent,
    total: calculatedTotal,
    
    status,
    match_status,
    type: scenario.stageData.matching?.hasPO ? 'PO' : 'Non-PO',
    vendor_requires_po: scenario.stageData.matching?.hasPO || false,
    vendor_is_verified: true,
    approval_status: 'pending',
    // Only assign approver if routing agent routed it and parsed approver from prompt
    assigned_to_name: shouldRouteToIT && routingApprover ? routingApprover.name : null,
    assigned_to_email: shouldRouteToIT && routingApprover ? routingApprover.email : undefined,
    assigned_to_user_id: shouldRouteToIT && routingApprover ? `user-${routingApprover.email.split('@')[0].replace(/\./g, '-')}` : null,
    
    po_numbers_cached: scenario.stageData.matching?.hasPO ? [scenario.stageData.matching.poNumber!] : [],
    gr_numbers: [],
    docType: 'Invoice',
    // Build issues array based on invoice characteristics and agent configuration
    issues: (() => {
      const issuesList: string[] = [];
      const approvalThreshold = 5000; // Default from settings
      const highValueThreshold = 100000; // High value agent threshold
      
      // Only Non-PO invoices need approval routing
      if (isNonPO) {
        // Check if invoice exceeds approval threshold
        const needsApproval = scenario.amount > approvalThreshold;
        
        if (needsApproval) {
          // High-value invoices (>$100k) - flagged by High Value agent
          if (scenario.amount > highValueThreshold) {
            const hasHighValueAgent = agents.some(a => 
              a.name.toLowerCase().includes('high value')
            );
            if (hasHighValueAgent) {
              issuesList.push('High Value - Requires Senior Approval');
            }
          }
          // IT routing agent should have routed it, but didn't
          else if (!shouldRouteToIT) {
            issuesList.push('Awaiting Approval Routing');
          }
        }
      }
      
      // Check for tax calculation issues (20% of invoices)
      if (hasTaxError) {
        issuesList.push('Tax Calculation Mismatch');
      }
      
      return issuesList;
    })(),
    
    created_at: invoiceDate.toISOString(),
    updated_at: now.toISOString(),
    data_ingestion_date: invoiceDate.toISOString().split('T')[0],
    
    ledger: 'Accounts Payable',
    cost_center: 'CC-9002 - Corporate Services',
    gl_code: 'GL-5000',
    department: 'Product',
    payment_terms: '30',
    
    lines,
    invoice_lines: lines,
    
    payment_bank_details: {
      bank_name: 'Sample Bank',
      account_number: '12345678',
      iban: 'GB00 BANK 0000 0012 3456 78',
      swift_bic: 'BANKGB00',
      sort_code: '00-00-00'
    },
    
    // Assign different visual template layouts - rotate through 9 completely different invoice designs
    display_config: (() => {
      const templates = [
        'purple-modern',          // Modern two-column with purple gradient
        'blue-enterprise',        // Professional 9-column detailed table
        'blue-header',           // Solid blue header bar (JanServ style)
        'green-minimal',         // Clean minimalist green accents
        'green-premier',         // 3-section layout with detailed table
        'simple-table-invoice',  // Boxed header sections
        'black-enterprise',      // Black table header, prominent bank details
        'spectre-professional',  // 3-column header, pink tables, red total
        'default'               // Standard layout
      ];
      return {
        template: templates[invoiceIndex % templates.length]
      };
    })(),
    
    // Add agent-specific data
    ocr_extractions: Object.keys(ocr_extractions).length > 0 ? ocr_extractions : undefined,
    auto_corrections: auto_corrections.length > 0 ? auto_corrections : undefined,
    agent_insights: agent_insights.length > 0 ? agent_insights : undefined,
    
    // Add flag to indicate this is agent-processed
    _agent_processed: true,
    _processed_agents: agents.map(a => a.name)
  };
  
  return invoice;
}
