import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { AnthropicService } from '@/lib/anthropic/service';
import type { InvoiceExtractionResult } from '@/lib/anthropic/types';
import { 
  normalizeCurrency, 
  normalizeDate, 
  normalizeNumber,
  normalizePONumbers,
  calculateRoundingDiff,
  isWithinRoundingTolerance 
} from '@/lib/normalization';
import prisma from '@/lib/db/prisma';
import { randomUUID } from 'crypto';

// Force Node.js runtime for PDF processing
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Service not available during build' },
        { status: 503 }
      );
    }
    
    const { source_file_id } = await request.json();

    if (!source_file_id) {
      return NextResponse.json(
        { error: 'source_file_id is required' },
        { status: 400 }
      );
    }

    // Fetch source file info using Prisma
    const sourceFile = await prisma.source_files.findUnique({
      where: { id: source_file_id }
    });

    if (!sourceFile) {
      return NextResponse.json(
        { error: 'Source file not found' },
        { status: 404 }
      );
    }

    // Read file content
    const fileBuffer = await readFile(sourceFile.storage_url);
    
    // Handle file conversion to base64
    let base64: string;
    let mediaType: string = sourceFile.media_type;
    
    if (sourceFile.media_type === 'application/pdf') {
      try {
        console.log('Processing PDF for AI extraction...');
        
        // Dynamic import to avoid build-time issues
        const { validatePdfFile } = await import('@/lib/pdf-utils');
        
        // Validate PDF file
        const validation = await validatePdfFile(fileBuffer);
        if (!validation.isValid) {
          return NextResponse.json(
            { 
              error: 'Invalid PDF file',
              details: validation.error,
            },
            { status: 400 }
          );
        }
        
        // For PDFs, we can send them directly to Anthropic's API
        // Claude Vision API supports PDFs natively
        base64 = fileBuffer.toString('base64');
        mediaType = 'application/pdf';
        
        console.log('PDF prepared for AI extraction');
      } catch (error) {
        console.error('PDF processing error:', error);
        return NextResponse.json(
          { 
            error: 'Failed to process PDF',
            details: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    } else {
      // For images, convert to base64 directly
      base64 = fileBuffer.toString('base64');
    }

    console.log('Extracting invoice data with AI...');
    
    const extractionResult = await AnthropicService.extractInvoiceData(
      base64,
      mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf'
    );

    console.log('Raw extraction result classification fields:', {
      has_invoice_headers: !!extractionResult.invoice_headers,
      headers_ledger: extractionResult.invoice_headers?.ledger,
      headers_cost_center: extractionResult.invoice_headers?.cost_center,
      headers_gl_code: extractionResult.invoice_headers?.gl_code,
      root_ledger: extractionResult.ledger,
      root_cost_center: extractionResult.cost_center,
      root_gl_code: extractionResult.gl_code,
    });
    
    console.log('Extraction completed:', {
      invoiceNumber: extractionResult.invoice?.number,
      vendorName: extractionResult.vendor?.name,
      total: extractionResult.totals?.total,
      currency: extractionResult.totals?.currency,
      lineCount: extractionResult.items?.length || 0,
      // Debug classification fields
      ledger: extractionResult.ledger,
      cost_center: extractionResult.cost_center,
      gl_code: extractionResult.gl_code,
      department: extractionResult.department,
      ai_confidence: extractionResult.ai_classification_confidence
    });

    // Process extraction result with normalization
    const normalized = normalizeExtractionResult(extractionResult);
    
    // Find or create vendor
    let vendor = null;
    
    // Try to find vendor by tax ID first
    if (normalized.vendorTaxId) {
      vendor = await prisma.vendors.findFirst({
        where: { tax_id: normalized.vendorTaxId }
      });
    }
    
    // If not found by tax ID, try by name
    if (!vendor && normalized.vendorName) {
      vendor = await prisma.vendors.findFirst({
        where: {
          OR: [
            { name: normalized.vendorName },
            { name: { contains: normalized.vendorName, mode: 'insensitive' } }
          ]
        }
      });
    }
    
    // Create vendor if not found
    if (!vendor) {
      // Get first available payment terms  
      let paymentTerms = await prisma.payment_terms.findFirst({
        orderBy: { name: 'asc' }
      });
      
      if (!paymentTerms) {
        // Create default payment terms if not exists
        paymentTerms = await prisma.payment_terms.create({
          data: {
            id: randomUUID(),
            name: 'Net 30',
            net_days: 30
          }
        });
      }
      
      // Check if we have bank details from the invoice
      const bankDetails = normalized.paymentBankDetails;
      const hasBankDetails = bankDetails && (
        bankDetails.bank_name || 
        bankDetails.iban || 
        bankDetails.account_number
      );

      // Create vendor and bank account in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the vendor first
        const newVendor = await tx.vendors.create({
          data: {
            id: randomUUID(),
            name: normalized.vendorName || 'Unknown Vendor',
            tax_id: normalized.vendorTaxId,
            country_code: normalized.vendorCountryCode || 'US',
            default_currency: normalized.currency || 'USD',
            requires_po: true, // Unverified vendors require PO
            active: true, // Active so they can process invoices
            is_verified: false,
            preferred_payment_method: hasBankDetails ? 'bank_transfer' : null,
            payment_terms_id: paymentTerms.id
          }
        });

        let bankAccountId = null;

        // If we have bank details, create a bank account
        if (hasBankDetails) {
          // Create masked account number (show last 4 digits)
          let maskedAccountNumber = '****';
          if (bankDetails.account_number) {
            const accNum = bankDetails.account_number.replace(/\s/g, '');
            if (accNum.length >= 4) {
              maskedAccountNumber = '*'.repeat(Math.max(4, accNum.length - 4)) + accNum.slice(-4);
            }
          } else if (bankDetails.iban) {
            const iban = bankDetails.iban.replace(/\s/g, '');
            if (iban.length >= 4) {
              maskedAccountNumber = iban.slice(0, 2) + '*'.repeat(Math.max(4, iban.length - 6)) + iban.slice(-4);
            }
          }

          const bankAccount = await tx.vendor_bank_accounts.create({
            data: {
              id: randomUUID(),
              vendor_id: newVendor.id,
              bank_name: bankDetails.bank_name || 'Unknown Bank',
              account_name: bankDetails.account_name || newVendor.name,
              account_number: bankDetails.account_number || null,
              account_number_masked: maskedAccountNumber,
              iban: bankDetails.iban || null,
              swift_bic: bankDetails.swift_bic || null,
              sort_code: bankDetails.sort_code || null,
              routing_number: bankDetails.routing_number || null,
              is_default: true
            }
          });

          bankAccountId = bankAccount.id;

          // Update vendor with default bank account
          await tx.vendors.update({
            where: { id: newVendor.id },
            data: { default_bank_account_id: bankAccountId }
          });

          console.log('Created bank account for vendor:', {
            vendorId: newVendor.id,
            bankAccountId: bankAccount.id,
            bankName: bankAccount.bank_name,
            masked: bankAccount.account_number_masked
          });
        }

        return { vendor: newVendor, bankAccountId };
      });

      vendor = result.vendor;
      console.log('Created new vendor:', {
        id: vendor.id,
        name: vendor.name,
        country: vendor.country_code,
        currency: vendor.default_currency,
        hasBankAccount: !!result.bankAccountId
      });
    } else {
      console.log('Found existing vendor:', vendor.id);
    }

    // Track if bank details changed (will be used for validation warnings)
    let bankDetailsChanged = false;
    let expectedBankName = null;
    let receivedBankName = null;

    // Check if existing vendor has bank accounts and if we have bank details from invoice
    if (vendor) {
      const bankDetails = normalized.paymentBankDetails;
      const hasBankDetails = bankDetails && (
        bankDetails.bank_name ||
        bankDetails.iban ||
        bankDetails.account_number
      );

      if (hasBankDetails && vendor.id !== (vendor as any)._justCreated) {
        // Check if vendor already has bank accounts
        const existingBankAccounts = await prisma.vendor_bank_accounts.findMany({
          where: { vendor_id: vendor.id }
        });

        // Function to compare bank details
        const isSameBankAccount = (existing: any, newDetails: any) => {
          // Compare key identifiers
          if (existing.account_number && newDetails.account_number) {
            return existing.account_number === newDetails.account_number;
          }
          if (existing.iban && newDetails.iban) {
            return existing.iban === newDetails.iban;
          }
          if (existing.routing_number && newDetails.routing_number &&
              existing.account_number && newDetails.account_number) {
            return existing.routing_number === newDetails.routing_number &&
                   existing.account_number === newDetails.account_number;
          }
          // If we can't definitively compare, assume different
          return false;
        };

        // Check if bank details match any existing account
        let matchFound = false;

        if (existingBankAccounts.length > 0) {
          matchFound = existingBankAccounts.some(account =>
            isSameBankAccount(account, bankDetails)
          );

          if (!matchFound) {
            bankDetailsChanged = true;
            // Get the default bank account for comparison
            const defaultAccount = vendor.default_bank_account_id
              ? existingBankAccounts.find(a => a.id === vendor.default_bank_account_id)
              : existingBankAccounts[0];

            if (defaultAccount) {
              expectedBankName = defaultAccount.bank_name;
              receivedBankName = bankDetails.bank_name || 'Unknown Bank';
            }

            console.log('Bank details changed detected for vendor:', {
              vendorId: vendor.id,
              existingBanks: existingBankAccounts.map(a => a.bank_name),
              newBank: bankDetails.bank_name
            });
          }
        }

        // Only create bank account if vendor doesn't have any OR if details changed
        if (existingBankAccounts.length === 0 || bankDetailsChanged) {
          // Create masked account number (show last 4 digits)
          let maskedAccountNumber = '****';
          if (bankDetails.account_number) {
            const accNum = bankDetails.account_number.replace(/\s/g, '');
            if (accNum.length >= 4) {
              maskedAccountNumber = '*'.repeat(Math.max(4, accNum.length - 4)) + accNum.slice(-4);
            }
          } else if (bankDetails.iban) {
            const iban = bankDetails.iban.replace(/\s/g, '');
            if (iban.length >= 4) {
              maskedAccountNumber = iban.slice(0, 2) + '*'.repeat(Math.max(4, iban.length - 6)) + iban.slice(-4);
            }
          }

          const bankAccount = await prisma.vendor_bank_accounts.create({
            data: {
              id: randomUUID(),
              vendor_id: vendor.id,
              bank_name: bankDetails.bank_name || 'Unknown Bank',
              account_name: bankDetails.account_name || vendor.name,
              account_number: bankDetails.account_number || null,
              account_number_masked: maskedAccountNumber,
              iban: bankDetails.iban || null,
              swift_bic: bankDetails.swift_bic || null,
              sort_code: bankDetails.sort_code || null,
              routing_number: bankDetails.routing_number || null,
              is_default: existingBankAccounts.length === 0 // Only set as default if it's the first account
            }
          });

          // Only update vendor with default bank account if it's their first account
          if (existingBankAccounts.length === 0) {
            await prisma.vendors.update({
              where: { id: vendor.id },
              data: {
                default_bank_account_id: bankAccount.id,
                preferred_payment_method: vendor.preferred_payment_method || 'bank_transfer'
              }
            });
          }

          console.log(bankDetailsChanged ? 'Bank details changed - created new bank account:' : 'Created bank account for existing vendor:', {
            vendorId: vendor.id,
            bankAccountId: bankAccount.id,
            bankName: bankAccount.bank_name,
            masked: bankAccount.account_number_masked,
            isDefault: existingBankAccounts.length === 0,
            changed: bankDetailsChanged
          });
        }
      }
    }

    // Fetch vendor's default bank account details if they have a preferred payment method
    let vendorBankDetails = null;
    if (vendor.preferred_payment_method === 'bank_transfer' && vendor.default_bank_account_id) {
      const defaultBankAccount = await prisma.vendor_bank_accounts.findUnique({
        where: { id: vendor.default_bank_account_id }
      });

      if (defaultBankAccount) {
        vendorBankDetails = {
          bank_name: defaultBankAccount.bank_name,
          account_name: defaultBankAccount.account_name,
          account_number: defaultBankAccount.account_number,
          iban: defaultBankAccount.iban,
          swift_bic: defaultBankAccount.swift_bic,
          sort_code: defaultBankAccount.sort_code,
          routing_number: defaultBankAccount.routing_number
        };
        console.log('Found vendor default bank account:', {
          vendorId: vendor.id,
          bankName: defaultBankAccount.bank_name,
          accountMasked: defaultBankAccount.account_number_masked
        });
      }
    }

    // Get or create payment terms
    let paymentTermsId = vendor.payment_terms_id;
    if (!paymentTermsId) {
      const paymentTerms = await prisma.payment_terms.findFirst({
        orderBy: { name: 'asc' }
      });
      
      if (paymentTerms) {
        paymentTermsId = paymentTerms.id;
      } else {
        const newPaymentTerms = await prisma.payment_terms.create({
          data: {
            id: randomUUID(),
            name: 'Net 30',
            net_days: 30
          }
        });
        paymentTermsId = newPaymentTerms.id;
      }
    }
    
    // Get or create bill-to organization entity
    let billToEntity = await prisma.org_entities.findFirst({
      orderBy: { legal_name: 'asc' }
    });
    
    if (!billToEntity) {
      billToEntity = await prisma.org_entities.create({
        data: {
          id: randomUUID(),
          legal_name: 'Default Company',
          tax_id: '12345',
          address_lines: {},
          default_currency: 'USD'
        }
      });
    }
    
    // Check if invoice already exists
    const existingInvoice = await prisma.invoice_headers.findFirst({
      where: {
        invoice_number: normalized.invoiceNumber,
        vendor_id: vendor.id
      }
    });
    
    if (existingInvoice) {
      // Update attachment to point to existing invoice
      await prisma.attachments.updateMany({
        where: {
          doc_id: source_file_id,
          doc_type: 'INV'
        },
        data: {
          doc_id: existingInvoice.id
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Invoice already exists',
        invoice_id: existingInvoice.id,
        duplicate: true
      });
    }
    
    // Create new invoice header
    const invoiceId = randomUUID();
    
    // Calculate header totals (will be updated after lines are created)
    const subtotal = normalized.lineItems?.reduce((sum: number, item: any) => 
      sum + (item.quantity * item.unitPrice), 0
    ) || normalized.subtotal || 0;
    
    const taxTotal = normalized.taxTotal || 0;
    const shippingTotal = normalized.shippingTotal || 0;
    const otherChargesTotal = normalized.otherChargesTotal || 0;
    const discountTotal = normalized.discountTotal || 0;
    
    // Always calculate total from components
    const calculatedTotal = subtotal + taxTotal + shippingTotal + otherChargesTotal - discountTotal;
    const extractedTotal = normalized.total || 0;
    
    // Check for significant discrepancy
    const totalDiscrepancy = Math.abs(calculatedTotal - extractedTotal);
    const hasSignificantDiscrepancy = totalDiscrepancy > 1.0; // More than 1 currency unit difference
    
    if (hasSignificantDiscrepancy && extractedTotal > 0) {
      console.warn(`Total discrepancy detected: Extracted=${extractedTotal}, Calculated=${calculatedTotal}, Difference=${totalDiscrepancy}`);
      console.warn(`Components: Subtotal=${subtotal}, Tax=${taxTotal}, Shipping=${shippingTotal}, Other=${otherChargesTotal}, Discount=${discountTotal}`);
      console.warn(`Using extracted total (${extractedTotal}) as it's more reliable than calculated (${calculatedTotal})`);
    }
    
    // When there's a discrepancy, prefer the extracted total from the AI as it's more reliable
    // The AI reads the actual total from the invoice, which is the source of truth
    const total = (hasSignificantDiscrepancy && extractedTotal > 0) ? extractedTotal : (extractedTotal || calculatedTotal);

    // Build validation warnings
    const validationWarnings = [];
    if (bankDetailsChanged && expectedBankName && receivedBankName) {
      validationWarnings.push({
        field: 'payment_bank_details',
        message: 'Bank details on invoice differ from vendor\'s registered bank account',
        severity: 'warning',
        category: 'risk',
        details: {
          expected_bank: expectedBankName,
          received_bank: receivedBankName,
          action: 'New bank account added to vendor profile'
        }
      });
    }

    const invoiceHeader = await prisma.invoice_headers.create({
      data: {
        id: invoiceId,
        type: 'invoice',
        invoice_number: normalized.invoiceNumber,
        vendor_id: vendor.id,
        vendor_name_snapshot: normalized.vendorName || vendor.name,
        vendor_tax_id_snapshot: normalized.vendorTaxId || vendor.tax_id || '',
        vendor_address_snapshot: normalized.vendorAddress || {},
        invoice_date: new Date(normalized.invoiceDate),
        due_date: new Date(normalized.dueDate),
        currency: normalized.currency,
        subtotal: subtotal,
        tax_total: taxTotal,
        tax_rate_percent: normalized.taxRate,
        shipping_total: shippingTotal,
        other_charges_total: otherChargesTotal,
        discount_total: discountTotal,
        total: total,
        extracted_total: extractedTotal, // Store the original extracted total for comparison
        total_discrepancy: hasSignificantDiscrepancy ? totalDiscrepancy : null,
        payment_terms_id: paymentTermsId,
        terms_text: normalized.paymentTerms,
        status: 'draft',
        match_status: 'not_matched',
        po_numbers_cached: normalized.poNumbers || [],
        bill_to_id: billToEntity.id,
        created_by: null,
        // Accounting classification fields from AI extraction
        ledger: extractionResult.ledger || 'Accounts Payable',
        cost_center: extractionResult.cost_center || null,
        cost_center_name: extractionResult.cost_center_name || null,
        gl_code: extractionResult.gl_code || null,
        department: extractionResult.department || null,
        ai_classification_confidence: extractionResult.ai_classification_confidence || null,
        ai_classification_reasoning: extractionResult.ai_classification_reasoning || null,
        // Payment method fields - use vendor's preferences if extraction doesn't provide them
        payment_method: (extractionResult.invoice_headers as any)?.payment_method || vendor.preferred_payment_method || null,
        payment_bank_details: (extractionResult.invoice_headers as any)?.payment_bank_details || vendorBankDetails || null,
        // Field confidence tracking
        extraction_field_confidences: extractionResult.field_confidences || {},
        is_manually_edited: {},
        // Validation warnings
        validation_warnings: validationWarnings.length > 0 ? validationWarnings : null
      }
    });
    
    console.log('Created invoice header:', invoiceId);
    
    // Create invoice lines
    if (normalized.lineItems && normalized.lineItems.length > 0) {
      const lineData = normalized.lineItems.map((item: any, index: number) => {
        const netAmount = (item.quantity || 0) * (item.unitPrice || 0);
        const taxAmount = item.taxAmount || 0;
        const lineTotal = item.amount || (netAmount + taxAmount);
        
        return {
          id: randomUUID(),
          invoice_id: invoiceId,
          line_no: index + 1,
          description: item.description || '',
          qty: item.quantity || 0,
          uom: item.unit || 'EA',
          unit_price: item.unitPrice || 0,
          net_amount: netAmount,
          tax_amount: taxAmount || null,
          tax_rate_percent: taxAmount && netAmount > 0 ? (taxAmount / netAmount) * 100 : null,
          line_total: lineTotal
        };
      });
      
      await prisma.invoice_lines.createMany({
        data: lineData
      });
      
      console.log(`Created ${lineData.length} invoice lines`);
      
      // Recalculate totals from actual lines
      const actualSubtotal = lineData.reduce((sum: number, line: any) => sum + line.net_amount, 0);
      const actualLineTaxTotal = lineData.reduce((sum: number, line: any) => sum + (line.tax_amount || 0), 0);
      
      // Use line tax if header tax is missing but lines have tax
      const finalTaxTotal = taxTotal || actualLineTaxTotal;
      const actualTotal = actualSubtotal + finalTaxTotal + shippingTotal + otherChargesTotal - discountTotal;
      
      // Check for rounding differences or missing components
      const finalTotalDiff = Math.abs(actualTotal - total);
      if (finalTotalDiff > 0.02) {
        // Update header with actual totals
        const roundingDiff = actualTotal - total;
        await prisma.invoice_headers.update({
          where: { id: invoiceId },
          data: {
            subtotal: actualSubtotal,
            tax_total: finalTaxTotal,
            total: actualTotal,
            rounding_diff: roundingDiff,
            total_discrepancy: finalTotalDiff
          }
        });
        console.log(`Applied total adjustment: Original=${total}, Actual=${actualTotal}, Difference=${roundingDiff}`);
        console.log(`Final components: Subtotal=${actualSubtotal}, Tax=${finalTaxTotal}, Shipping=${shippingTotal}, Other=${otherChargesTotal}, Discount=${discountTotal}`);
      }
    }
    
    // Update attachments to link to the new invoice
    await prisma.attachments.updateMany({
      where: {
        doc_id: source_file_id,
        doc_type: 'INV'
      },
      data: {
        doc_id: invoiceId
      }
    });
    
    // Create invoice status history entry
    await prisma.invoice_status_history.create({
      data: {
        id: randomUUID(),
        invoice_id: invoiceId,
        new_status: 'draft',
        changed_by: null,
        reason: 'Invoice created from AI extraction'
      }
    });
    
    return NextResponse.json({
      success: true,
      invoice_id: invoiceId,
      invoice_number: normalized.invoiceNumber,
      vendor_name: normalized.vendorName,
      total: total,
      currency: normalized.currency,
      line_count: normalized.lineItems?.length || 0,
      extraction_confidence: extractionResult.confidence
    });
    
  } catch (error) {
    console.error('Invoice processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to normalize extraction results
function normalizeExtractionResult(result: InvoiceExtractionResult) {
  // Use new format if available, fallback to legacy format
  const headers = result.invoice_headers;
  const legacyInvoice = result.invoice;
  const legacyTotals = result.totals;
  
  return {
    invoiceNumber: headers?.invoice_number || legacyInvoice?.number || `INV-${Date.now()}`,
    invoiceDate: normalizeDate(headers?.invoice_date || legacyInvoice?.date) || new Date().toISOString().split('T')[0],
    dueDate: normalizeDate(headers?.due_date || legacyInvoice?.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorName: headers?.vendor_name_snapshot || result.vendor?.name || 'Unknown Vendor',
    vendorTaxId: headers?.vendor_tax_id_snapshot || result.vendor?.taxId || null,
    vendorAddress: headers?.vendor_address_snapshot || result.vendor?.address || null,
    vendorCountryCode: headers?.vendor_country_code || null,
    subtotal: normalizeNumber(headers?.subtotal || legacyTotals?.subtotal),
    taxTotal: normalizeNumber(headers?.tax_total || legacyTotals?.tax) || 0,
    taxRate: normalizeNumber(headers?.tax_rate || legacyTotals?.taxRate) || null,
    shippingTotal: normalizeNumber(headers?.shipping_total || legacyTotals?.shipping) || 0,
    otherChargesTotal: normalizeNumber(headers?.other_charges_total || legacyTotals?.otherCharges) || 0,
    discountTotal: normalizeNumber(headers?.discount_total || legacyTotals?.discount) || 0,
    total: normalizeNumber(headers?.total || legacyTotals?.total) || 0,
    currency: normalizeCurrency(headers?.currency || legacyTotals?.currency),
    paymentTerms: headers?.payment_terms_text || result.paymentTerms || 'Net 30',
    paymentMethod: headers?.payment_method || null,
    paymentBankDetails: headers?.payment_bank_details || null,
    poNumbers: normalizePONumbers(headers?.po_numbers_cached?.join(',') || legacyInvoice?.poNumber),
    lineItems: result.invoice_lines?.map((line: any) => ({
      description: line.description || '',
      quantity: normalizeNumber(line.qty) || 1,
      unit: line.uom || 'EA',
      unitPrice: normalizeNumber(line.unit_price) || 0,
      amount: normalizeNumber(line.net_amount) || 0,
      taxAmount: normalizeNumber(line.tax_amount) || 0
    })) || result.items?.map((item: any) => ({
      description: item.description || '',
      quantity: normalizeNumber(item.quantity) || 1,
      unit: item.unit || 'EA',
      unitPrice: normalizeNumber(item.unitPrice) || 0,
      amount: normalizeNumber(item.amount) || 0,
      taxAmount: normalizeNumber(item.tax) || 0
    }))
  };
}