import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }

    // First, get the attachments for this invoice to find the files to delete
    const attachments = await prisma.attachments.findMany({
      where: {
        doc_type: 'INV',
        doc_id: id
      },
      select: {
        id: true,
        storage_url: true
      }
    });

    // Get associated source files
    const sourceFiles = await prisma.source_files.findMany({
      where: {
        storage_url: {
          in: attachments.map(a => a.storage_url)
        }
      },
      select: {
        id: true,
        storage_url: true
      }
    });

    // Delete the invoice (this will cascade to invoice_lines, match_results, invoice_status_history)
    try {
      await prisma.invoice_headers.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return NextResponse.json(
        { error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    // Delete attachments records if any exist
    if (attachments.length > 0) {
      try {
        await prisma.attachments.deleteMany({
          where: {
            doc_type: 'INV',
            doc_id: id
          }
        });
      } catch (error) {
        console.warn('Could not delete attachments:', error);
      }

      // Delete source_files records if any
      if (sourceFiles.length > 0) {
        const sourceFileIds = sourceFiles.map(sf => sf.id);
        
        try {
          await prisma.source_files.deleteMany({
            where: {
              id: {
                in: sourceFileIds
              }
            }
          });
        } catch (error) {
          console.warn('Could not delete source files:', error);
        }
      }

      // Delete physical files
      const filePaths = [...new Set([
        ...attachments.map(a => a.storage_url),
        ...sourceFiles.map(sf => sf.storage_url)
      ])];

      for (const filePathToDelete of filePaths) {
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