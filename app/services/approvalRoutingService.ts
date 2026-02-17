/**
 * Approval Routing Service
 * 
 * Provides intelligent approver suggestions based on:
 * - Vendor history patterns
 * - Invoice amount thresholds
 * - Past successful routing
 */

export interface ApproverSuggestion {
  approver_id: string;
  approver_name: string;
  confidence: number; // 0-1 (will display as percentage)
  reason: string;
  pattern_count?: number; // How many times this pattern has succeeded
}

export interface RoutingSuggestionRequest {
  vendor: string;
  amount: number;
  invoiceId: string;
}

export interface RoutingSuggestionResponse {
  suggestions: ApproverSuggestion[];
  auto_route_eligible: boolean; // True if top suggestion > 90%
}

// Mock routing patterns - vendor to approver mappings with confidence
// This simulates learned patterns from historical data
const MOCK_ROUTING_PATTERNS = [
  // Sarah Mitchell - IT/Tech vendors, medium amounts
  { vendor: 'Microsoft Corporation', approver_id: 'user-1', approver_name: 'Sarah Mitchell', success_count: 12, amount_min: 0, amount_max: 50000 },
  { vendor: 'Adobe Systems', approver_id: 'user-1', approver_name: 'Sarah Mitchell', success_count: 8, amount_min: 0, amount_max: 25000 },
  { vendor: 'Salesforce', approver_id: 'user-1', approver_name: 'Sarah Mitchell', success_count: 10, amount_min: 0, amount_max: 75000 },
  { vendor: 'AWS', approver_id: 'user-1', approver_name: 'Sarah Mitchell', success_count: 15, amount_min: 0, amount_max: 100000 },
  { vendor: 'Google Cloud', approver_id: 'user-1', approver_name: 'Sarah Mitchell', success_count: 6, amount_min: 0, amount_max: 50000 },
  
  // James Thompson - Office supplies, facilities, and some tech vendors
  { vendor: 'Office Depot', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 20, amount_min: 0, amount_max: 10000 },
  { vendor: 'Staples Inc', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 18, amount_min: 0, amount_max: 10000 },
  { vendor: 'ACME Office Supplies', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 14, amount_min: 0, amount_max: 15000 },
  { vendor: 'FedEx', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 25, amount_min: 0, amount_max: 5000 },
  { vendor: 'UPS', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 22, amount_min: 0, amount_max: 5000 },
  { vendor: 'Adobe Systems', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 5, amount_min: 0, amount_max: 15000 },
  { vendor: 'Microsoft Corporation', approver_id: 'user-2', approver_name: 'James Thompson', success_count: 7, amount_min: 0, amount_max: 20000 },
  
  // Caroline Walsh - Marketing vendors
  { vendor: 'LinkedIn', approver_id: 'user-3', approver_name: 'Caroline Walsh', success_count: 9, amount_min: 0, amount_max: 30000 },
  { vendor: 'Facebook Ads', approver_id: 'user-3', approver_name: 'Caroline Walsh', success_count: 11, amount_min: 0, amount_max: 40000 },
  { vendor: 'HubSpot', approver_id: 'user-3', approver_name: 'Caroline Walsh', success_count: 7, amount_min: 0, amount_max: 25000 },
  { vendor: 'Mailchimp', approver_id: 'user-3', approver_name: 'Caroline Walsh', success_count: 13, amount_min: 0, amount_max: 15000 },
  
  // James Wilson - High value, strategic vendors (senior approver)
  { vendor: 'Deloitte', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 8, amount_min: 50000, amount_max: 500000 },
  { vendor: 'PwC', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 6, amount_min: 75000, amount_max: 500000 },
  { vendor: 'Microsoft Corporation', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 5, amount_min: 50000, amount_max: 500000 },
  { vendor: 'SAP', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 4, amount_min: 100000, amount_max: 500000 },
  { vendor: 'Oracle', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 7, amount_min: 50000, amount_max: 500000 },
  
  // Mixed patterns - some vendors route to multiple people based on amount
  { vendor: 'Accenture', approver_id: 'user-3', approver_name: 'Caroline Walsh', success_count: 3, amount_min: 0, amount_max: 25000 },
  { vendor: 'Accenture', approver_id: 'user-4', approver_name: 'James Wilson', success_count: 6, amount_min: 25000, amount_max: 500000 },
];

// Fuzzy vendor matching - handles variations in vendor names
function findVendorMatch(invoiceVendor: string, patternVendor: string): boolean {
  const normalizeVendor = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalized1 = normalizeVendor(invoiceVendor);
  const normalized2 = normalizeVendor(patternVendor);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Partial match (one contains the other)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
  
  return false;
}

// Calculate confidence score based on success count
function calculateConfidence(successCount: number): number {
  // More successes = higher confidence
  // 1-3 successes: 55-65%
  // 4-7 successes: 70-80%
  // 8-15 successes: 85-92%
  // 16+ successes: 93-97%
  
  if (successCount >= 16) return 0.93 + Math.min(successCount - 16, 10) * 0.004;
  if (successCount >= 8) return 0.85 + (successCount - 8) * 0.01;
  if (successCount >= 4) return 0.70 + (successCount - 4) * 0.025;
  return 0.55 + successCount * 0.033;
}

// Generate reason text for suggestion
function generateReason(pattern: typeof MOCK_ROUTING_PATTERNS[0], amountMatch: boolean): string {
  const reasons: string[] = [];
  
  // Vendor history
  if (pattern.success_count >= 10) {
    reasons.push(`Approved ${pattern.success_count} invoices from this vendor`);
  } else if (pattern.success_count >= 5) {
    reasons.push(`Approved ${pattern.success_count} similar invoices`);
  } else {
    reasons.push(`${pattern.success_count} successful approvals for this vendor`);
  }
  
  // Amount authority
  if (amountMatch) {
    if (pattern.amount_max >= 100000) {
      reasons.push('Senior approver for high-value invoices');
    } else if (pattern.amount_max >= 50000) {
      reasons.push('Authority level matches invoice amount');
    }
  }
  
  return reasons.join(' • ');
}

/**
 * Get intelligent approver suggestions based on vendor and amount
 */
export async function getRoutingSuggestions(
  request: RoutingSuggestionRequest
): Promise<RoutingSuggestionResponse> {
  const { vendor, amount, invoiceId } = request;
  
  // Find matching patterns
  const matches = MOCK_ROUTING_PATTERNS.filter(pattern => {
    const vendorMatch = findVendorMatch(vendor, pattern.vendor);
    const amountMatch = amount >= pattern.amount_min && amount <= pattern.amount_max;
    return vendorMatch && amountMatch;
  });
  
  // Calculate confidence and create suggestions
  const suggestions: ApproverSuggestion[] = matches.map(pattern => {
    const confidence = calculateConfidence(pattern.success_count);
    const amountMatch = amount >= pattern.amount_min && amount <= pattern.amount_max;
    
    return {
      approver_id: pattern.approver_id,
      approver_name: pattern.approver_name,
      confidence,
      reason: generateReason(pattern, amountMatch),
      pattern_count: pattern.success_count,
    };
  });
  
  // If no exact matches, provide fallback suggestions based on amount
  if (suggestions.length === 0) {
    // High amount = senior approver
    if (amount > 50000) {
      suggestions.push({
        approver_id: 'user-4',
        approver_name: 'James Wilson',
        confidence: 0.62,
        reason: 'Senior approver recommended for high-value invoices',
      });
    } else if (amount > 25000) {
      suggestions.push({
        approver_id: 'user-1',
        approver_name: 'Sarah Mitchell',
        confidence: 0.58,
        reason: 'Typical approval authority for this amount range',
      });
    } else {
      // Lower amounts - suggest based on round-robin or availability
      suggestions.push({
        approver_id: 'user-2',
        approver_name: 'James Thompson',
        confidence: 0.52,
        reason: 'Available approver with capacity',
      });
      suggestions.push({
        approver_id: 'user-3',
        approver_name: 'Caroline Walsh',
        confidence: 0.51,
        reason: 'Available approver with capacity',
      });
    }
  }
  
  // Sort by confidence (highest first) and limit to top 5
  const sortedSuggestions = suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  
  // Check if auto-route eligible (top confidence > 90%)
  const auto_route_eligible = sortedSuggestions.length > 0 && sortedSuggestions[0].confidence >= 0.90;
  
  return {
    suggestions: sortedSuggestions,
    auto_route_eligible,
  };
}

/**
 * Record successful routing for learning (future enhancement)
 */
export async function recordSuccessfulRouting(
  vendor: string,
  amount: number,
  approverId: string
): Promise<void> {
  // In a real implementation, this would update the routing patterns database
  // For now, it's a no-op but provides the API for future enhancement
  console.log('[RoutingService] Recorded successful routing:', { vendor, amount, approverId });
}

/**
 * Record rejection for learning (future enhancement)
 */
export async function recordRejection(
  vendor: string,
  amount: number,
  rejectedApproverId: string,
  suggestedApproverId?: string
): Promise<void> {
  // In a real implementation, this would decrease confidence for rejected patterns
  // and increase confidence for suggested corrections
  console.log('[RoutingService] Recorded rejection:', { vendor, amount, rejectedApproverId, suggestedApproverId });
}
