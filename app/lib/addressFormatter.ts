/**
 * Utility functions for formatting addresses from JSON structures
 */

interface AddressStructure {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  street?: string; // Some addresses might use 'street' instead of line1/line2
  address?: string; // Some might have a single address field
}

interface VendorAddressSnapshot {
  tax_id?: string;
  legal_name?: string;
  address?: AddressStructure | string;
}

interface BillToSnapshot {
  tax_id?: string;
  legal_name?: string;
  address?: AddressStructure;
}

/**
 * Format an address object into an array of lines for display
 */
export function formatAddressLines(address: AddressStructure | string | undefined): string[] {
  if (!address) return [];
  
  // If it's already a string, split by newlines
  if (typeof address === 'string') {
    return address.split('\n').filter(line => line.trim());
  }
  
  const lines: string[] = [];
  
  // Add street/line1/line2
  if (address.street) {
    lines.push(address.street);
  } else {
    if (address.line1) lines.push(address.line1);
    if (address.line2) lines.push(address.line2);
  }
  
  // Add city, state, zip line
  const cityStateZip: string[] = [];
  if (address.city) cityStateZip.push(address.city);
  if (address.state) {
    if (address.city) {
      cityStateZip.push(`, ${address.state}`);
    } else {
      cityStateZip.push(address.state);
    }
  }
  if (address.zip) cityStateZip.push(` ${address.zip}`);
  
  if (cityStateZip.length > 0) {
    lines.push(cityStateZip.join(''));
  }
  
  // Add country if not US
  if (address.country && address.country !== 'US' && address.country !== 'USA') {
    lines.push(address.country);
  }
  
  return lines;
}

/**
 * Format an address into a single string with line breaks
 */
export function formatAddressString(address: AddressStructure | string | undefined): string {
  return formatAddressLines(address).join('\n');
}

/**
 * Format vendor address snapshot (handles both nested and direct structure)
 */
export function formatVendorAddress(snapshot: any): string {
  if (!snapshot) return '';
  
  // If it's already a string, return it
  if (typeof snapshot === 'string') {
    return snapshot;
  }
  
  // If it has an address property, format it (bill_to_snapshot structure)
  if (snapshot.address) {
    return formatAddressString(snapshot.address);
  }
  
  // If it has direct address fields (vendor_address_snapshot structure)
  if (snapshot.line1 || snapshot.city || snapshot.zip) {
    return formatAddressString(snapshot);
  }
  
  // Fallback to empty string
  return '';
}

/**
 * Format bill-to snapshot for display
 */
export function formatBillToAddress(snapshot: BillToSnapshot | undefined): {
  companyName: string;
  addressLines: string[];
  taxId?: string;
} {
  if (!snapshot) {
    return {
      companyName: 'Not Available',
      addressLines: []
    };
  }
  
  return {
    companyName: snapshot.legal_name || 'Not Available',
    addressLines: formatAddressLines(snapshot.address),
    taxId: snapshot.tax_id
  };
}

/**
 * Check if an address snapshot has the new nested structure
 */
export function hasNestedAddressStructure(snapshot: any): boolean {
  return snapshot && 
         typeof snapshot === 'object' && 
         'address' in snapshot &&
         typeof snapshot.address === 'object';
}