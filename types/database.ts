/**
 * Database type exports from Prisma
 * This file re-exports Prisma types for use throughout the application
 */

import { Prisma } from '@prisma/client';

// Re-export all Prisma generated types
export type {
  invoice_headers,
  invoice_lines,
  po_headers,
  po_lines,
  gr_headers,
  gr_lines,
  vendors,
  vendor_bank_accounts,
  match_results,
  invoice_status_history,
  User,
  attachments,
  items,
  payment_terms,
  tax_rates,
  org_entities as organization_entities,
  cost_centers,
  projects,
  approvals,
  approver_groups,
  approver_group_members,
  ses_headers,
  ses_lines,
  work_items,
  audit_events,
  source_files,
  external_refs,
  ship_to_sites,
  tolerance_profiles,
  uom_conversions,
  approval_policies,
  agent_runs,
  invoice_line_distributions,
  invoice_line_receipts,
  invoice_line_taxes
} from '@prisma/client';

// Invoice with all relations
export type InvoiceWithRelations = Prisma.invoice_headersGetPayload<{
  include: {
    invoice_lines: true;
    vendors: {
      include: {
        vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors: true;
      };
    };
    match_results: {
      include: {
        po_lines: true;
        gr_lines: true;
      };
    };
  };
}>;

// PO with all relations
export type POWithRelations = Prisma.po_headersGetPayload<{
  include: {
    po_lines: {
      include: {
        items: true;
        gr_lines: true;
        invoice_lines: true;
      };
    };
    vendors: true;
  };
}>;

// GR with all relations
export type GRWithRelations = Prisma.gr_headersGetPayload<{
  include: {
    gr_lines: {
      include: {
        po_lines: true;
      };
    };
    po_headers: true;
  };
}>;

// Vendor with all relations
export type VendorWithRelations = Prisma.vendorsGetPayload<{
  include: {
    vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors: true;
    payment_terms: true;
    invoice_headers: true;
    po_headers: true;
  };
}>;

// Match result with relations
export type MatchResultWithRelations = Prisma.match_resultsGetPayload<{
  include: {
    invoice_headers: true;
    invoice_lines: true;
    po_lines: true;
    gr_lines: true;
    ses_lines: true;
  };
}>;

// Type for decimal fields (Prisma returns Decimal, we need number)
export type DecimalToNumber<T> = T extends Prisma.Decimal
  ? number
  : T extends object
  ? { [K in keyof T]: DecimalToNumber<T[K]> }
  : T;

// Helper type to convert all Decimal fields to numbers in a type
export type WithNumberDecimals<T> = DecimalToNumber<T>;