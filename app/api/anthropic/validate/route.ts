import { NextRequest, NextResponse } from 'next/server';
import { AnthropicService } from '@/lib/anthropic';
import type { ApiKeyValidationResult } from '@/lib/anthropic';

export async function GET() {
  try {
    // Check if API key is configured on the server
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    
    if (!hasApiKey) {
      return NextResponse.json({
        configured: false,
        message: 'Anthropic API key not configured on server',
      });
    }

    // Validate the configured API key
    const isValid = await AnthropicService.validateApiKey();
    
    if (isValid) {
      const models = AnthropicService.getAvailableModels();
      return NextResponse.json({
        configured: true,
        valid: true,
        models,
      });
    } else {
      return NextResponse.json({
        configured: true,
        valid: false,
        error: 'API key validation failed',
      });
    }
  } catch (error: any) {
    console.error('Validation check error:', error);
    return NextResponse.json({
      configured: false,
      error: error.message || 'Failed to check configuration',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'API key is required' 
        } as ApiKeyValidationResult,
        { status: 400 }
      );
    }

    // Validate the provided API key
    const isValid = await AnthropicService.validateApiKey(apiKey);
    
    if (isValid) {
      const models = AnthropicService.getAvailableModels();
      return NextResponse.json({
        valid: true,
        models,
      } as ApiKeyValidationResult);
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Invalid API key',
      } as ApiKeyValidationResult);
    }
  } catch (error: any) {
    console.error('API key validation error:', error);
    return NextResponse.json({
      valid: false,
      error: error.message || 'Failed to validate API key',
    } as ApiKeyValidationResult);
  }
}