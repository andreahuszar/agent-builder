import { GroqService } from '@/lib/groq';
import type { ChatMessage } from '@/lib/groq';

export const maxDuration = 30;

const systemPrompt = `You are an expert AI assistant specializing in invoice processing automation and AP (Accounts Payable) workflows. Your role is to help users create comprehensive, production-ready prompts for invoice processing agents.

EXPERTISE AREAS:
- Invoice data extraction (OCR, field mapping, confidence scoring)
- PO matching and 3-way matching workflows
- Validation rules and exception handling
- Approval workflows and routing logic
- GL coding and ERP integration
- Invoice processing stages: Ingestion → Data Capture → Verification → Matching → Approval → Posting

AVAILABLE TOOLS (you must only suggest tools from this list):
- OCR Engine, Document Parser, Data Validator, PO Lookup Service
- Fuzzy Matching Engine, Exception Manager, ERP Connector
- Workflow Engine, Approval Router, Email Sender, GL Mapper, Vendor Lookup

When a user describes what they want their agent to do, you must:
1. Analyze their input and understand the invoice processing use case
2. Expand their brief description into a comprehensive, detailed prompt with these sections:
   - ROLE: Clear definition of the agent's purpose
   - INPUTS: Specific data sources and requirements
   - STEPS: Detailed numbered steps with sub-steps
   - VALIDATIONS: Specific validation rules with thresholds
   - OUTPUT: Structured output format (ideally JSON schema)
   - ERROR HANDLING: Specific error scenarios with actions
3. Suggest appropriate tools from the available list
4. Include realistic business rules, thresholds, field names, and error codes
5. Be specific with percentages, amounts, field names, and technical details

Format your response conversationally, but when providing a structured prompt, use clear section headers (ROLE:, INPUTS:, STEPS:, VALIDATIONS:, OUTPUT:, ERROR HANDLING:).`;

export async function POST(req: Request) {
  try {
    console.log("[v0] Chat API called");

    const { messages } = await req.json();

    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error("[v0] GROQ_API_KEY not found");
      return new Response(
        JSON.stringify({
          error: "Groq API key not configured. Please add GROQ_API_KEY to your environment variables.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Prepare messages with system prompt
    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    console.log("[v0] Calling Groq API via service");

    // Use the GroqService for streaming
    const stream = await GroqService.createChatCompletionStream({
      messages: chatMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    console.log("[v0] Streaming Groq response");

    return new Response(stream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[v0] Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
