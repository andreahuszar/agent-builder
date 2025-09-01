import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // First, get the attachments for this invoice to find the files to delete
    const attachments = await prisma.$queryRaw`
      SELECT a.id, a.storage_url, sf.id as source_file_id, sf.storage_url as source_file_path
      FROM attachments a
      LEFT JOIN source_files sf ON sf.storage_url = a.storage_url
      WHERE a.doc_type = 'INV' AND a.doc_id = ${id}::uuid
    ` as { id: string; storage_url: string; source_file_id: string | null; source_file_path: string | null }[];

    // Delete the invoice (this will cascade to invoice_lines, taxes, distributions, receipts)
    await prisma.$executeRaw`
      DELETE FROM invoice_headers WHERE id = ${id}::uuid
    `;

    // Delete attachments records
    if (attachments.length > 0) {
      await prisma.$executeRaw`
        DELETE FROM attachments WHERE doc_type = 'INV' AND doc_id = ${id}::uuid
      `;

      // Collect source file IDs to delete
      const sourceFileIds = attachments
        .filter(a => a.source_file_id)
        .map(a => a.source_file_id);

      // Delete source_files records if any
      if (sourceFileIds.length > 0) {
        await prisma.$executeRaw`
          DELETE FROM source_files WHERE id = ANY(${sourceFileIds}::uuid[])
        `;
      }

      // Delete physical files
      for (const attachment of attachments) {
        const filePathToDelete = attachment.storage_url || attachment.source_file_path;
        if (filePathToDelete) {
          try {
            // Handle both relative and absolute paths
            const filePath = filePathToDelete.startsWith('/') 
              ? filePathToDelete 
              : path.join(process.cwd(), filePathToDelete);
            await fs.unlink(filePath);
            console.log(`Deleted file: ${filePath}`);
          } catch (error) {
            // File might already be deleted or not exist
            console.warn(`Could not delete file ${filePathToDelete}:`, error);
          }
        }
      }
    }

    return NextResponse.json(
      { message: 'Invoice deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}