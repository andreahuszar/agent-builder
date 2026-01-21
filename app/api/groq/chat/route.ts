import { NextRequest, NextResponse } from 'next/server';
import { GroqService } from '@/lib/groq';
import type { ChatCompletionRequest } from '@/lib/groq';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body: Partial<ChatCompletionRequest> = await request.json();

    // Validate request
    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key not configured. Please add GROQ_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Use streaming for better UX
    const stream = await GroqService.createChatCompletionStream({
      messages: body.messages,
      model: body.model,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      stream: true,
    });

    return new NextResponse(stream.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Groq Chat API Error:', error);
    
    // Handle Groq specific errors
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
