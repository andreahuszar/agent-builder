#!/usr/bin/env node
/**
 * Seed Production Database with Sample Data
 * Creates sample users, vendors, and invoices for production environment
 */

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log('🔧 Starting production database seeding with sample data...');
    
    // Check if production database already has data
    const existingInvoices = await prisma.invoice_headers.count();
    const existingVendors = await prisma.vendors.count();
    const existingUsers = await prisma.user.count();
    
    console.log(`📊 Production database current state:`);
    console.log(`   - Users: ${existingUsers}`);
    console.log(`   - Vendors: ${existingVendors}`);
    console.log(`   - Invoices: ${existingInvoices}`);
    
    if (existingInvoices > 0) {
      console.log('✅ Production database already contains invoices. Skipping seed to prevent duplicates.');
      return;
    }
    
    console.log('📤 Creating sample data...');
    
    // 1. Create sample users
    const users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'John Smith',
        email: 'john.smith@xelix.com',
        role: 'ap_clerk',
        active: true
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Jane Doe',
        email: 'jane.doe@xelix.com',
        role: 'ap_manager',
        active: true
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Bob Johnson',
        email: 'bob.johnson@xelix.com',
        role: 'finance_director',
        active: true
      }
    ];
    
    if (existingUsers === 0) {
      console.log('   → Creating sample users...');
      await prisma.user.createMany({
        data: users,
        skipDuplicates: true
      });
    }
    
    // 2. Create payment terms
    const paymentTermsId = randomUUID();
    const paymentTermsData = {
      id: paymentTermsId,
      name: 'Net 30',
      net_days: 30,
      discount_percent: null,
      discount_days: null
    };
    
    const existingPaymentTerms = await prisma.payment_terms.count();
    if (existingPaymentTerms === 0) {
      console.log('   → Creating payment terms...');
      await prisma.payment_terms.create({ data: paymentTermsData });
    } else {
      const firstPaymentTerms = await prisma.payment_terms.findFirst();
      paymentTermsData.id = firstPaymentTerms.id;
    }
    
    // 3. Create organization entity
    const orgEntityId = randomUUID();
    const orgEntityData = {
      id: orgEntityId,
      legal_name: 'Xelix Corp',
      tax_id: 'US123456789',
      address_lines: {
        line1: '123 Business St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US'
      },
      default_currency: 'USD'
    };
    
    const existingOrgEntities = await prisma.org_entities.count();
    if (existingOrgEntities === 0) {
      console.log('   → Creating organization entity...');
      await prisma.org_entities.create({ data: orgEntityData });
    } else {
      const firstOrgEntity = await prisma.org_entities.findFirst();
      orgEntityData.id = firstOrgEntity.id;
    }
    
    // 4. Create sample vendors
    const sampleVendors = [
      'Office Supplies Inc',
      'Tech Solutions LLC',
      'Consulting Services Corp',
      'Marketing Agency Ltd',
      'Legal Services PC',
      'Facility Management Co',
      'IT Support Services',
      'Accounting Firm LLC',
      'Travel Services Inc'
    ];
    
    if (existingVendors < 5) {
      console.log('   → Creating sample vendors...');
      for (const vendorName of sampleVendors) {
        await prisma.vendors.create({
          data: {
            id: randomUUID(),
            name: vendorName,
            tax_id: `TAX-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
            country_code: 'US',
            default_currency: 'USD',
            requires_po: Math.random() > 0.5,
            active: true,
            is_verified: true,
            payment_terms_id: paymentTermsData.id
          }
        });
      }
    }
    
    // 5. Create sample invoices
    const vendors = await prisma.vendors.findMany({ take: 9 });
    
    if (vendors.length > 0) {
      console.log('   → Creating sample invoices...');
      
      const sampleInvoices = [
        { number: 'INV-2024-001', amount: 1250.00, description: 'Office supplies and equipment' },
        { number: 'INV-2024-002', amount: 3500.00, description: 'IT consulting services' },
        { number: 'INV-2024-003', amount: 875.50, description: 'Marketing campaign materials' },
        { number: 'INV-2024-004', amount: 2100.00, description: 'Legal consultation fees' },
        { number: 'INV-2024-005', amount: 4250.75, description: 'Software licensing' },
        { number: 'INV-2024-006', amount: 1800.00, description: 'Facility maintenance' },
        { number: 'INV-2024-007', amount: 950.25, description: 'Travel expenses' },
        { number: 'INV-2024-008', amount: 3200.00, description: 'Accounting services' },
        { number: 'INV-2024-009', amount: 1650.50, description: 'Training materials' }
      ];
      
      for (let i = 0; i < Math.min(sampleInvoices.length, vendors.length); i++) {
        const invoice = sampleInvoices[i];
        const vendor = vendors[i];
        const invoiceId = randomUUID();
        
        const invoiceDate = new Date();
        invoiceDate.setDate(invoiceDate.getDate() - Math.floor(Math.random() * 30));
        const dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Create invoice header
        await prisma.invoice_headers.create({
          data: {
            id: invoiceId,
            type: 'invoice',
            invoice_number: invoice.number,
            vendor_id: vendor.id,
            vendor_name_snapshot: vendor.name,
            vendor_tax_id_snapshot: vendor.tax_id || '',
            vendor_address_snapshot: {},
            invoice_date: invoiceDate,
            due_date: dueDate,
            currency: 'USD',
            subtotal: invoice.amount * 0.9, // Assuming 10% tax
            tax_total: invoice.amount * 0.1,
            total: invoice.amount,
            payment_terms_id: paymentTermsData.id,
            terms_text: 'Net 30',
            status: ['draft', 'processing', 'approved'][Math.floor(Math.random() * 3)],
            match_status: 'not_matched',
            po_numbers_cached: [],
            bill_to_id: orgEntityData.id,
            created_by: users[0].id
          }
        });
        
        // Create invoice line
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
      }
    }
    
    // Final count
    const finalUsers = await prisma.user.count();
    const finalVendors = await prisma.vendors.count();
    const finalInvoices = await prisma.invoice_headers.count();
    
    console.log('✅ Production database seeding completed!');
    console.log(`📊 Final production database state:`);
    console.log(`   - Users: ${finalUsers}`);
    console.log(`   - Vendors: ${finalVendors}`);
    console.log(`   - Invoices: ${finalInvoices}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  createSampleData()
    .then(() => {
      console.log('🎉 Sample data seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sample data seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { createSampleData };