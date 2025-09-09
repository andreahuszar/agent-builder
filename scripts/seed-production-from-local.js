#!/usr/bin/env node
/**
 * Seed Production Database with Local Data
 * Copies data from local database to production using Prisma
 */

const { PrismaClient } = require('@prisma/client');

// Local database connection
const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5433/xelix_invoice_dev'
    }
  }
});

// Production database connection (using environment variables from Railway)
const productionPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function seedProduction() {
  try {
    console.log('🔧 Starting production database seeding...');
    
    // Check if production database already has data
    const existingInvoices = await productionPrisma.invoice_headers.count();
    const existingVendors = await productionPrisma.vendors.count();
    const existingUsers = await productionPrisma.user.count();
    
    console.log(`📊 Production database current state:`);
    console.log(`   - Users: ${existingUsers}`);
    console.log(`   - Vendors: ${existingVendors}`);
    console.log(`   - Invoices: ${existingInvoices}`);
    
    if (existingInvoices > 0 || existingVendors > 5 || existingUsers > 0) {
      console.log('⚠️  Production database already contains data. Skipping seed to prevent duplicates.');
      console.log('   If you want to re-seed, clear the production database first.');
      return;
    }
    
    // Fetch all data from local database
    console.log('📥 Fetching data from local database...');
    
    const localUsers = await localPrisma.user.findMany();
    const localPaymentTerms = await localPrisma.payment_terms.findMany();
    const localOrgEntities = await localPrisma.org_entities.findMany();
    const localVendors = await localPrisma.vendors.findMany();
    const localInvoiceHeaders = await localPrisma.invoice_headers.findMany();
    const localInvoiceLines = await localPrisma.invoice_lines.findMany();
    const localSourceFiles = await localPrisma.source_files.findMany();
    const localAttachments = await localPrisma.attachments.findMany();
    
    console.log(`📋 Local database data:`);
    console.log(`   - Users: ${localUsers.length}`);
    console.log(`   - Payment Terms: ${localPaymentTerms.length}`);
    console.log(`   - Org Entities: ${localOrgEntities.length}`);
    console.log(`   - Vendors: ${localVendors.length}`);
    console.log(`   - Invoice Headers: ${localInvoiceHeaders.length}`);
    console.log(`   - Invoice Lines: ${localInvoiceLines.length}`);
    console.log(`   - Source Files: ${localSourceFiles.length}`);
    console.log(`   - Attachments: ${localAttachments.length}`);
    
    // Insert data into production database in dependency order
    console.log('📤 Inserting data into production database...');
    
    // 1. Users
    if (localUsers.length > 0) {
      console.log('   → Inserting users...');
      await productionPrisma.user.createMany({
        data: localUsers,
        skipDuplicates: true
      });
    }
    
    // 2. Payment Terms
    if (localPaymentTerms.length > 0) {
      console.log('   → Inserting payment terms...');
      await productionPrisma.payment_terms.createMany({
        data: localPaymentTerms,
        skipDuplicates: true
      });
    }
    
    // 3. Org Entities
    if (localOrgEntities.length > 0) {
      console.log('   → Inserting org entities...');
      await productionPrisma.org_entities.createMany({
        data: localOrgEntities,
        skipDuplicates: true
      });
    }
    
    // 4. Vendors
    if (localVendors.length > 0) {
      console.log('   → Inserting vendors...');
      await productionPrisma.vendors.createMany({
        data: localVendors,
        skipDuplicates: true
      });
    }
    
    // 5. Invoice Headers
    if (localInvoiceHeaders.length > 0) {
      console.log('   → Inserting invoice headers...');
      await productionPrisma.invoice_headers.createMany({
        data: localInvoiceHeaders,
        skipDuplicates: true
      });
    }
    
    // 6. Invoice Lines
    if (localInvoiceLines.length > 0) {
      console.log('   → Inserting invoice lines...');
      await productionPrisma.invoice_lines.createMany({
        data: localInvoiceLines,
        skipDuplicates: true
      });
    }
    
    // 7. Source Files
    if (localSourceFiles.length > 0) {
      console.log('   → Inserting source files...');
      await productionPrisma.source_files.createMany({
        data: localSourceFiles,
        skipDuplicates: true
      });
    }
    
    // 8. Attachments
    if (localAttachments.length > 0) {
      console.log('   → Inserting attachments...');
      await productionPrisma.attachments.createMany({
        data: localAttachments,
        skipDuplicates: true
      });
    }
    
    // Verify the seeding
    const finalUsers = await productionPrisma.user.count();
    const finalVendors = await productionPrisma.vendors.count();
    const finalInvoices = await productionPrisma.invoice_headers.count();
    
    console.log('✅ Production database seeding completed!');
    console.log(`📊 Final production database state:`);
    console.log(`   - Users: ${finalUsers}`);
    console.log(`   - Vendors: ${finalVendors}`);
    console.log(`   - Invoices: ${finalInvoices}`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await localPrisma.$disconnect();
    await productionPrisma.$disconnect();
  }
}

// Run the seeding
if (require.main === module) {
  seedProduction()
    .then(() => {
      console.log('🎉 Seeding process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedProduction };