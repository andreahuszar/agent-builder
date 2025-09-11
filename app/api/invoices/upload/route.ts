import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import prisma from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload PNG, JPEG, or PDF.' },
        { status: 400 }
      );
    }

    // Validate file size (25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 25MB limit' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Calculate SHA256 hash
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const sha256 = hash.digest('hex');

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.name);
    const filename = `${timestamp}-${sha256.substring(0, 8)}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file to disk
    await writeFile(filepath, buffer);

    // Create source_files record using Prisma
    const sourceFile = await prisma.source_files.create({
      data: {
        filename: file.name,
        media_type: file.type,
        storage_url: filepath,
        sha256: sha256
      }
    });

    if (!sourceFile) {
      throw new Error('Failed to create source file record');
    }

    // Create attachments record using Prisma
    let attachment;
    try {
      attachment = await prisma.attachments.create({
        data: {
          doc_type: 'INV',
          doc_id: sourceFile.id,
          filename: file.name,
          media_type: file.type,
          storage_url: filepath,
          source: 'upload',
          sha256: sha256
        }
      });
      console.log('Created attachment:', attachment.id);
    } catch (attachmentError: any) {
      console.error('Failed to create attachment record:', attachmentError);
      // Don't fail the whole upload if attachment creation fails
      // The source file was created successfully
      console.warn('Continuing without attachment record');
    }

    return NextResponse.json({
      success: true,
      source_file_id: sourceFile.id,
      filename: sourceFile.filename,
      media_type: sourceFile.media_type,
      sha256: sourceFile.sha256,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error.message,
      },
      { status: 500 }
    );
  }
}