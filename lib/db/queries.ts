/**
 * Optimized Database Queries
 * Centralized, efficient Prisma queries with proper typing
 */

import prisma from '@/lib/db/prisma';
import { Prisma } from '@prisma/client';
import type { 
  InvoiceListItem, 
  InvoiceWithLines,
  POWithLines,
  GRWithLines,
  MatchResult
} from '@/types/api';
import { 
  transformInvoiceListItem, 
  transformInvoiceWithLines 
} from '@/lib/transformers/invoice';
import { 
  transformPOWithLines,
  transformGRWithLines
} from '@/lib/transformers/po';

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Get cached data or fetch from database
 */
function getCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }
  
  return fetcher().then(data => {
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

/**
 * Get invoices for list view (optimized)
 */
export async function getInvoiceList(
  filters?: {
    status?: string[];
    vendorId?: string;
    fromDate?: Date;
    toDate?: Date;
  },
  pagination?: {
    skip?: number;
    take?: number;
  }
): Promise<InvoiceListItem[]> {
  const where: Prisma.invoice_headersWhereInput = {};
  
  if (filters?.status?.length) {
    where.status = { in: filters.status as any[] };
  }
  if (filters?.vendorId) {
    where.vendor_id = filters.vendorId;
  }
  if (filters?.fromDate || filters?.toDate) {
    where.invoice_date = {
      gte: filters.fromDate,
      lte: filters.toDate
    };
  }
  
  const invoices = await prisma.invoice_headers.findMany({
    where,
    select: {
      id: true,
      invoice_number: true,
      vendor_name_snapshot: true,
      invoice_date: true,
      due_date: true,
      currency: true,
      total: true,
      status: true,
      match_status: true,
      po_numbers_cached: true,
      vendors: {
        select: {
          requires_po: true,
          active: true,
          is_verified: true
        }
      },
      match_results: {
        select: {
          gr_lines: {
            select: {
              gr_headers: {
                select: {
                  gr_number: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' },
    skip: pagination?.skip,
    take: pagination?.take || 100
  });
  
  return invoices.map(invoice => {
    const grNumbers = [...new Set(
      invoice.match_results
        .filter(mr => mr.gr_lines?.gr_headers?.gr_number)
        .map(mr => mr.gr_lines!.gr_headers!.gr_number)
    )];
    
    return transformInvoiceListItem(invoice, invoice.vendors, grNumbers);
  });
}

/**
 * Get single invoice with all details (optimized)
 */
export async function getInvoiceWithDetails(id: string): Promise<InvoiceWithLines | null> {
  const invoice = await prisma.invoice_headers.findUnique({
    where: { id },
    include: {
      invoice_lines: {
        orderBy: { line_no: 'asc' }
      },
      vendors: {
        include: {
          vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors: true
        }
      }
    }
  });
  
  if (!invoice) return null;
  
  // Get PO total if linked
  let poTotal = null;
  if (invoice.po_numbers_cached?.length) {
    const poHeader = await prisma.po_headers.findFirst({
      where: { po_number: invoice.po_numbers_cached[0] },
      select: { 
        po_lines: {
          select: {
            qty_ordered: true,
            unit_price: true
          }
        }
      }
    });
    
    if (poHeader) {
      poTotal = poHeader.po_lines.reduce((sum, line) => 
        sum + (parseFloat(line.qty_ordered?.toString() || '0') * 
               parseFloat(line.unit_price?.toString() || '0')), 0
      );
    }
  }
  
  return transformInvoiceWithLines(
    invoice,
    invoice.invoice_lines,
    invoice.vendors,
    invoice.vendors?.vendor_bank_accounts_vendor_bank_accounts_vendor_idTovendors,
    poTotal
  );
}

/**
 * Get PO with details (optimized)
 */
export async function getPOWithDetails(poNumber: string): Promise<POWithLines | null> {
  const po = await prisma.po_headers.findFirst({
    where: { po_number: poNumber },
    include: {
      vendors: true,
      po_lines: {
        select: {
          id: true,
          line_no: true,
          description: true,
          qty_ordered: true,
          uom: true,
          unit_price: true,
          status: true,
          items: {
            select: {
              description: true
            }
          },
          gr_lines: {
            select: {
              qty_received: true
            }
          },
          invoice_lines: {
            select: {
              qty: true
            }
          }
        },
        orderBy: { line_no: 'asc' }
      }
    }
  });
  
  if (!po) return null;
  
  return transformPOWithLines(po, po.po_lines, po.vendors);
}

/**
 * Get GR with details (optimized)
 */
export async function getGRWithDetails(grId: string): Promise<GRWithLines | null> {
  const gr = await prisma.gr_headers.findUnique({
    where: { id: grId },
    include: {
      po_headers: true,
      gr_lines: {
        include: {
          po_lines: {
            select: {
              line_no: true,
              description: true
            }
          }
        },
        orderBy: { created_at: 'asc' }
      }
    }
  });
  
  if (!gr) return null;
  
  return transformGRWithLines(
    gr,
    gr.gr_lines,
    gr.po_headers,
    gr.gr_lines.map(l => l.po_lines)
  );
}

/**
 * Get match results for invoice (optimized)
 */
export async function getInvoiceMatchResults(invoiceId: string): Promise<MatchResult[]> {
  const results = await prisma.match_results.findMany({
    where: { invoice_id: invoiceId },
    select: {
      id: true,
      invoice_id: true,
      invoice_line_id: true,
      level: true,
      rule_applied: true,
      matched_po_line_id: true,
      matched_gr_line_id: true,
      matched_ses_line_id: true,
      qty_variance: true,
      price_variance: true,
      amount_variance: true,
      within_tolerance: true,
      tolerance_profile_id: true,
      explanation_code: true,
      at: true,
      po_lines: {
        select: {
          id: true,
          line_no: true
        }
      },
      gr_lines: {
        select: {
          id: true,
          qty_received: true
        }
      }
    },
    orderBy: { at: 'desc' }
  });
  
  return results.map(r => ({
    id: r.id,
    invoice_id: r.invoice_id,
    invoice_line_id: r.invoice_line_id,
    level: r.level,
    rule_applied: r.rule_applied,
    matched_po_line_id: r.matched_po_line_id,
    matched_gr_line_id: r.matched_gr_line_id,
    matched_ses_line_id: r.matched_ses_line_id,
    qty_variance: r.qty_variance ? parseFloat(r.qty_variance.toString()) : null,
    price_variance: r.price_variance ? parseFloat(r.price_variance.toString()) : null,
    amount_variance: r.amount_variance ? parseFloat(r.amount_variance.toString()) : null,
    within_tolerance: r.within_tolerance,
    tolerance_profile_id: r.tolerance_profile_id,
    explanation_code: r.explanation_code,
    at: r.at?.toISOString() || new Date().toISOString(),
    po_line: r.po_lines ? {
      id: r.po_lines.id,
      line_no: r.po_lines.line_no
    } : undefined,
    gr_line: r.gr_lines ? {
      id: r.gr_lines.id,
      qty_received: parseFloat(r.gr_lines.qty_received?.toString() || '0')
    } : undefined
  }));
}

/**
 * Get vendors list (cached)
 */
export async function getVendorsList() {
  return getCached('vendors', async () => {
    return prisma.vendors.findMany({
      select: {
        id: true,
        name: true,
        tax_id: true,
        country_code: true,
        default_currency: true,
        requires_po: true,
        is_verified: true,
        active: true
      },
      orderBy: { name: 'asc' }
    });
  });
}

/**
 * Batch update invoice statuses
 */
export async function batchUpdateInvoiceStatus(
  ids: string[],
  status: string
): Promise<number> {
  const result = await prisma.invoice_headers.updateMany({
    where: { id: { in: ids } },
    data: { status: status as any }
  });
  
  return result.count;
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
  const [
    totalInvoices,
    pendingInvoices,
    approvedInvoices,
    totalValue,
    vendorCount
  ] = await prisma.$transaction([
    prisma.invoice_headers.count(),
    prisma.invoice_headers.count({
      where: { status: { in: ['pending_approval', 'draft'] } }
    }),
    prisma.invoice_headers.count({
      where: { status: 'approved' }
    }),
    prisma.invoice_headers.aggregate({
      _sum: { total: true }
    }),
    prisma.vendors.count({ where: { active: true } })
  ]);
  
  return {
    totalInvoices,
    pendingInvoices,
    approvedInvoices,
    totalValue: parseFloat(totalValue._sum.total?.toString() || '0'),
    vendorCount
  };
}