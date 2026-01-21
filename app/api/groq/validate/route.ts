import { NextRequest, NextResponse } from 'next/server';
import { GroqService } from '@/lib/groq';
import { validateConfig } from '@/lib/groq/config';

export async function GET() {
  try {
    const validation = validateConfig();
    
    return NextResponse.json({
      configured: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        configured: false,
        errors: [error.message || 'Failed to check configuration'] 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    const result = await GroqService.validateApiKey(apiKey);

    if (result.valid) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json(
        { valid: false, error: result.error || 'Invalid API key' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Groq Validation API Error:', error);
    
    return NextResponse.json(
      { 
        valid: false,
        error: error.message || 'Failed to validate API key' 
      },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
