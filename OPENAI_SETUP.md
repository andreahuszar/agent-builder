# OpenAI Integration Setup Guide

## Quick Start

### 1. Local Development

1. **Add your OpenAI API key to `.env.local`:**
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

2. **Navigate to Settings page:**
   - Go to http://localhost:3001/settings
   - Click on the Settings icon in the left navigation

3. **Test the integration:**
   - You'll see the AI Configuration section
   - The status indicator will show if OpenAI is connected
   - Enter your API key in the input field (or use the one from .env.local)
   - Click "Validate API Key"
   - Once validated, a chat interface will appear for testing

### 2. Railway Production Setup

Add these environment variables in your Railway dashboard:

- **Required:**
  - `OPENAI_API_KEY` - Your OpenAI API key (starts with sk-)

- **Optional:**
  - `OPENAI_MODEL` - Default model (default: gpt-4-turbo)
  - `OPENAI_MAX_TOKENS` - Maximum tokens per request (default: 4096)
  - `OPENAI_ORG_ID` - Your OpenAI organization ID (if applicable)

#### Why GPT-4 Turbo?
- **128K context window** - Process much larger documents (vs 8K for GPT-4)
- **3x cheaper** input tokens, 2x cheaper output tokens
- **Faster response times**
- **Better instruction following** and JSON mode support
- **Knowledge cutoff**: December 2023

## Architecture Overview

### Service Layer (`/lib/openai/`)
- **client.ts** - OpenAI client singleton
- **service.ts** - Core service methods (chat, completion, validation)
- **config.ts** - Configuration and validation
- **types.ts** - TypeScript interfaces

### API Routes (`/app/api/openai/`)
- **POST /api/openai/chat** - Send chat messages
- **POST /api/openai/complete** - Text completions
- **POST /api/openai/validate** - Validate API keys
- **GET /api/openai/validate** - Check configuration status

### React Hooks (`/app/hooks/`)
- **useOpenAI** - Main hook for all OpenAI operations
- **useChat** - Specialized chat functionality with message management

### UI Components (`/app/components/ai/`)
- **ApiKeyInput** - Secure API key input with validation
- **AIStatus** - Connection status indicator
- **ChatInterface** - Full-featured chat UI

## Usage Examples

### Using the Chat Hook in Your Components

```typescript
import { useChat } from '@/app/hooks/useChat';

function MyComponent() {
  const { messages, sendMessage, loading } = useChat({
    systemPrompt: 'You are a helpful assistant for invoice processing'
  });

  const handleSend = async () => {
    await sendMessage('Extract data from this invoice...');
  };

  return (
    // Your UI here
  );
}
```

### Using the OpenAI Hook for Custom Requests

```typescript
import { useOpenAI } from '@/app/hooks/useOpenAI';

function MyComponent() {
  const { sendMessage, complete, validateApiKey } = useOpenAI();

  // Send a chat message
  const response = await sendMessage([
    { role: 'user', content: 'Hello' }
  ]);

  // Get a completion
  const completion = await complete('Complete this text...');
}
```

## Security Notes

- API keys are never exposed to the client-side code
- All OpenAI calls go through server-side API routes
- Rate limiting can be configured in `/lib/openai/config.ts`
- Error handling includes quota and rate limit detection

## Troubleshooting

### "OpenAI Not Configured" Status
- Check that your API key is correctly set in `.env.local`
- Ensure the key starts with `sk-`
- Verify the key is valid at https://platform.openai.com/api-keys

### Rate Limit Errors
- Default limits are set in `/lib/openai/config.ts`
- Consider implementing request queuing for production

### Connection Errors
- Check your internet connection
- Verify OpenAI services are operational
- Check console for detailed error messages

## Next Steps

You can now:
1. Test the chat interface in Settings
2. Integrate AI features into invoice processing
3. Add custom AI-powered automation workflows
4. Extend the chat interface for specific use cases