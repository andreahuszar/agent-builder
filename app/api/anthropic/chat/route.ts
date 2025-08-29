import { NextRequest, NextResponse } from 'next/server';
import { AnthropicService } from '@/lib/anthropic';
import type { AnthropicRequest } from '@/lib/anthropic';

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body: Partial<AnthropicRequest> = await request.json();

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Call Anthropic service
    const response = await AnthropicService.createMessage(body);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Anthropic Chat API Error:', error);
    
    // Handle Anthropic specific errors
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
    
    if (error.message?.includes('insufficient_quota')) {
      return NextResponse.json(
        { error: 'API quota exceeded' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}