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

    // Create source_files record
    const sourceFile = await prisma.$queryRaw`
      INSERT INTO source_files (
        filename,
        media_type,
        storage_url,
        sha256,
        created_at,
        updated_at
      ) VALUES (
        ${file.name},
        ${file.type},
        ${filepath},
        ${sha256},
        NOW(),
        NOW()
      )
      RETURNING id, filename, media_type, sha256
    ` as any[];

    const sourceFileRecord = sourceFile[0];

    // Create attachments record (temporarily linked to source_file)
    await prisma.$executeRaw`
      INSERT INTO attachments (
        doc_type,
        doc_id,
        filename,
        media_type,
        storage_url,
        source,
        sha256,
        created_at,
        updated_at
      ) VALUES (
        'INV',
        ${sourceFileRecord.id}::uuid,
        ${file.name},
        ${file.type},
        ${filepath},
        'upload',
        ${sha256},
        NOW(),
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      source_file_id: sourceFileRecord.id,
      filename: sourceFileRecord.filename,
      media_type: sourceFileRecord.media_type,
      sha256: sourceFileRecord.sha256,
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