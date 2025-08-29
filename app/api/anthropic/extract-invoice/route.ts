import { NextRequest, NextResponse } from 'next/server';
import { AnthropicService } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Invoice file is required' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = AnthropicService.validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Extract invoice data
    const extractionResult = await AnthropicService.extractInvoiceData(
      base64,
      file.type as any
    );

    // Return the structured extraction result
    return NextResponse.json({
      success: true,
      data: extractionResult,
      filename: file.name,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Invoice Extraction Error:', error);
    
    // Check for specific error types
    if (error.message?.includes('Failed to extract JSON')) {
      return NextResponse.json(
        { 
          error: 'Could not extract structured data from the image. Please ensure it is a clear invoice image.',
          details: error.message,
        },
        { status: 422 }
      );
    }
    
    if (error.message?.includes('401') || error.message?.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }
    
    if (error.message?.includes('429') || error.message?.includes('rate_limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to extract invoice data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}