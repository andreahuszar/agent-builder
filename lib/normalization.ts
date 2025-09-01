/**
 * Normalization utilities for invoice data processing
 */

/**
 * Map currency symbols to ISO currency codes
 */
export function normalizeCurrency(currency: string | undefined): string {
  if (!currency) return 'USD';
  
  const trimmed = currency.trim().toUpperCase();
  
  // Symbol mappings
  const symbolMap: Record<string, string> = {
    '£': 'GBP',
    '€': 'EUR',
    '$': 'USD',
    '¥': 'JPY',
    '₹': 'INR',
    '₽': 'RUB',
    '₩': 'KRW',
    'C$': 'CAD',
    'A$': 'AUD',
    'NZ$': 'NZD',
    'CHF': 'CHF',
    'SEK': 'SEK',
    'NOK': 'NOK',
    'DKK': 'DKK',
  };
  
  // Check for symbol match
  for (const [symbol, code] of Object.entries(symbolMap)) {
    if (trimmed.includes(symbol)) {
      return code;
    }
  }
  
  // Common currency code patterns
  const commonCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'MXN', 'BRL'];
  for (const code of commonCodes) {
    if (trimmed.includes(code)) {
      return code;
    }
  }
  
  // If it's already a 3-letter code, return it
  if (/^[A-Z]{3}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Default to USD if we can't determine
  return 'USD';
}

/**
 * Normalize date to YYYY-MM-DD format
 */
export function normalizeDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    // Handle various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      // Try parsing common formats
      const patterns = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // MM/DD/YYYY or DD/MM/YYYY
        /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
      ];
      
      for (const pattern of patterns) {
        const match = dateStr.match(pattern);
        if (match) {
          // Assume MM/DD/YYYY for ambiguous dates
          const year = match[3] || match[1];
          const month = match[1].length === 4 ? match[2] : match[1];
          const day = match[1].length === 4 ? match[3] : match[2];
          
          const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        }
      }
      
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Normalize number by removing thousands separators and ensuring decimal point
 */
export function normalizeNumber(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  
  // Remove currency symbols and spaces
  let cleaned = value.replace(/[£€$¥₹₽₩\s]/g, '');
  
  // Handle negative numbers
  const isNegative = cleaned.includes('(') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '');
  
  // Handle European format (1.234,56) vs US format (1,234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If comma comes after dot, it's thousands separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // European format: dot is thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: comma is thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal separator (e.g., "123,45")
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  const num = parseFloat(cleaned) || 0;
  return isNegative && num > 0 ? -num : num;
}

/**
 * Normalize and deduplicate PO numbers from various sources
 */
export function normalizePONumbers(
  headerPO?: string | string[],
  linePOs?: (string | undefined | null)[]
): string[] {
  const poNumbers = new Set<string>();
  
  // Add header PO(s)
  if (headerPO) {
    if (Array.isArray(headerPO)) {
      headerPO.forEach(po => {
        if (po && po.trim()) poNumbers.add(po.trim());
      });
    } else if (headerPO.trim()) {
      poNumbers.add(headerPO.trim());
    }
  }
  
  // Add line POs
  if (linePOs) {
    linePOs.forEach(po => {
      if (po && po.trim()) poNumbers.add(po.trim());
    });
  }
  
  return Array.from(poNumbers);
}

/**
 * Calculate rounding difference between header total and sum of lines
 */
export function calculateRoundingDiff(headerTotal: number, linesTotal: number): number {
  return Math.round((headerTotal - linesTotal) * 100) / 100;
}

/**
 * Check if totals are within acceptable rounding difference (±0.02)
 */
export function isWithinRoundingTolerance(headerTotal: number, linesTotal: number, tolerance = 0.02): boolean {
  return Math.abs(headerTotal - linesTotal) <= tolerance;
}