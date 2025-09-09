#!/usr/bin/env node
/**
 * Add More Sample Invoices to Database
 * Creates additional sample invoices for testing
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function addMoreInvoices() {
  try {
    console.log('📝 Adding more sample invoices to database...');
    
    // Get existing vendors
    const vendors = await prisma.vendors.findMany();
    if (vendors.length === 0) {
      console.error('❌ No vendors found. Please run seed script first.');
      return;
    }
    
    // Get payment terms
    const paymentTerms = await prisma.payment_terms.findFirst();
    if (!paymentTerms) {
      console.error('❌ No payment terms found. Please run seed script first.');
      return;
    }
    
    // Get org entity
    const orgEntity = await prisma.org_entities.findFirst();
    if (!orgEntity) {
      console.error('❌ No org entity found. Please run seed script first.');
      return;
    }
    
    // Get user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error('❌ No user found. Please run seed script first.');
      return;
    }
    
    // Create more sample invoices
    const additionalInvoices = [
      { number: 'INV-2024-004', vendor: vendors[0], amount: 4500.00, description: 'Software licenses and support', status: 'approved' },
      { number: 'INV-2024-005', vendor: vendors[1], amount: 2750.50, description: 'Consulting services - Q1', status: 'processing' },
      { number: 'INV-2024-006', vendor: vendors[0], amount: 1890.00, description: 'Hardware purchases', status: 'draft' },
      { number: 'INV-2024-007', vendor: vendors[1], amount: 6200.00, description: 'Professional services', status: 'approved' },
      { number: 'INV-2024-008', vendor: vendors[0], amount: 950.75, description: 'Office supplies - March', status: 'processing' },
      { number: 'INV-2024-009', vendor: vendors[1], amount: 3400.00, description: 'IT infrastructure upgrade', status: 'approved' },
      { number: 'INV-2024-010', vendor: vendors[0], amount: 1250.25, description: 'Monthly service fee', status: 'draft' },
      { number: 'INV-2024-011', vendor: vendors[1], amount: 8900.00, description: 'Annual software license', status: 'approved' },
      { number: 'INV-2024-012', vendor: vendors[0], amount: 750.00, description: 'Training materials', status: 'processing' },
      { number: 'INV-2024-013', vendor: vendors[1], amount: 5600.50, description: 'Cloud services - Q1', status: 'approved' },
      { number: 'INV-2024-014', vendor: vendors[0], amount: 2100.00, description: 'Maintenance contract', status: 'processing' },
      { number: 'INV-2024-015', vendor: vendors[1], amount: 4300.75, description: 'Security audit services', status: 'approved' }
    ];
    
    let created = 0;
    
    for (const invoice of additionalInvoices) {
      try {
        const invoiceId = randomUUID();
        const invoiceDate = new Date();
        invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 60));
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Check if invoice already exists
        const existing = await prisma.invoice_headers.findFirst({
          where: { invoice_number: invoice.number }
        });
        
        if (existing) {
          console.log(`⏭️  Invoice ${invoice.number} already exists`);
          continue;
        }
        
        // Create invoice header
        await prisma.invoice_headers.create({
          data: {
            id: invoiceId,
            type: 'invoice',
            invoice_number: invoice.number,
            vendor_id: invoice.vendor.id,
            vendor_name_snapshot: invoice.vendor.name,
            vendor_tax_id_snapshot: invoice.vendor.tax_id || '',
            vendor_address_snapshot: {},
            invoice_date: invoiceDate,
            due_date: dueDate,
            currency: 'USD',
            subtotal: invoice.amount * 0.9,
            tax_total: invoice.amount * 0.1,
            total: invoice.amount,
            payment_terms_id: paymentTerms.id,
            terms_text: 'Net 30',
            status: invoice.status,
            match_status: invoice.vendor.requires_po ? 'not_matched' : 'non_po',
            po_numbers_cached: [],
            gr_numbers_cached: [],
            bill_to_id: orgEntity.id,
            created_by: user.id
          }
        });
        
        // Create invoice line items
        await prisma.invoice_lines.create({
          data: {
            id: randomUUID(),
            invoice_id: invoiceId,
            line_no: 1,
            description: invoice.description,
            qty: 1,
            uom: 'EA',
            unit_price: invoice.amount * 0.9,
            net_amount: invoice.amount * 0.9,
            line_total: invoice.amount * 0.9
          }
        });
        
        console.log(`✅ Created invoice ${invoice.number}`);
        created++;
      } catch (error) {
        console.error(`❌ Failed to create invoice ${invoice.number}:`, error.message);
      }
    }
    
    // Final count
    const finalCount = await prisma.invoice_headers.count();
    console.log(`\n✅ Added ${created} new invoices!`);
    console.log(`📊 Total invoices in database: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error adding invoices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  addMoreInvoices()
    .then(() => {
      console.log('🎉 Successfully added more sample invoices!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to add invoices:', error);
      process.exit(1);
    });
}

module.exports = { addMoreInvoices };