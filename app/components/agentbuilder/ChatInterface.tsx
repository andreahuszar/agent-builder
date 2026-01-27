"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Send, Bot, User, CheckCircle2, Paperclip, X, FileText, Loader2, AlertCircle } from "lucide-react"
import { Card } from "@/app/components/ui/card"
import { Textarea } from "@/app/components/ui/textarea"
import type { Agent, AgentDocument } from "./AgentBuilderPage"
import { extractTextFromFile, formatFileSize } from "@/app/utils/documentExtractor"
import { storeDocument } from "@/app/utils/documentStorage"

type Attachment = {
  id: string
  name: string
  size: number
  type: string
  file: File
  extractedText?: string
  extractionError?: string
  isExtracting?: boolean
}

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  generatedPrompt?: string
  suggestedSkills?: string[]
  attachments?: Attachment[]
}

interface ChatInterfaceProps {
  onPromptGenerated?: (prompt: string, skills: string[], documents?: AgentDocument[]) => void
  currentPrompt?: string
  agentId?: string
  currentAgent?: Agent | null
}

const AVAILABLE_SKILLS = [
  "Extract text",
  "Process Documents",
  "Verify Data",
  "Find Purchase Orders",
  "Intelligent Matching",
  "Flag Issues",
  "Connect to ERP System",
  "Run Workflows",
  "Route for Approval",
  "Send Messages",
  "Map to General Ledger",
  "Find Vendor Information",
]

export function ChatInterface({ onPromptGenerated, currentPrompt, agentId, currentAgent }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your invoice processing specialist. Tell me what your agent needs to do, and I'll ask a few clarifying questions to build the perfect configuration for you.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [questionCount, setQuestionCount] = useState(0)
  const [sessionDocuments, setSessionDocuments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("[v0] Agent changed, clearing chat. Agent ID:", agentId)
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm your invoice processing specialist. Tell me what your agent needs to do, and I'll ask a few clarifying questions to build the perfect configuration for you.",
        timestamp: new Date(),
      },
    ])
    setInput("")
    setQuestionCount(0)
    setSessionDocuments([])
  }, [agentId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 100)
  }, [messages, isProcessing])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    // Process each file
    for (const file of Array.from(files)) {
      const tempId = `${Date.now()}-${Math.random()}`
      
      // Add file with loading state
      const newDoc: Attachment = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        isExtracting: true,
      }
      
      setSessionDocuments((prev) => [...prev, newDoc])
      
      // Extract text asynchronously
      const result = await extractTextFromFile(file)
      
      // Update with extracted text or error
      setSessionDocuments((prev) =>
        prev.map((doc) =>
          doc.id === tempId
            ? {
                ...doc,
                extractedText: result.text,
                extractionError: result.error,
                isExtracting: false,
              }
            : doc
        )
      )
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleRemoveDocument = (id: string) => {
    setSessionDocuments((prev) => prev.filter((doc) => doc.id !== id))
  }

  const handleClearAllDocuments = () => {
    setSessionDocuments([])
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = input
    setInput("")
    setIsProcessing(true)

    try {
      console.log("[v0] Sending chat request")
      
      // Build document context from session documents
      const documentContext = sessionDocuments
        .filter(doc => doc.extractedText && !doc.extractionError)
        .map(doc => `\n\n--- ATTACHED DOCUMENT: ${doc.name} ---\n${doc.extractedText}\n--- END DOCUMENT ---`)
        .join('')
      
      // Count assistant messages that are questions (not prompts with generatedPrompt)
      const assistantQuestions = messages.filter(m => m.role === "assistant" && !m.generatedPrompt && m.id !== "1")
      const currentQuestionCount = assistantQuestions.length
      
      // Prepare messages for API - add document context to first user message
      const allMessages = [...messages, userMessage]
      const messagesWithContext = allMessages.map((msg, idx) => {
        // Add document context to the first user message (after initial assistant message)
        if (idx === 1 && msg.role === "user" && documentContext) {
          return {
            role: msg.role,
            content: msg.content + documentContext
          }
        }
        return {
          role: msg.role,
          content: msg.content
        }
      })
      
      const response = await fetch("/api/agent-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesWithContext,
          questionCount: currentQuestionCount,
        }),
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        const errorMessage = errorData?.error || errorData?.details || `Server returned ${response.status}`
        throw new Error(errorMessage)
      }

      if (!response.body) {
        throw new Error("No response body received")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ""
      const assistantMessageId = (Date.now() + 1).toString()

      // Create initial assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ])

      console.log("[v0] Starting to read stream")

      // Stream the response and parse SSE format
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("[v0] Stream complete")
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) {
                fullResponse += content
                // Update message with streaming content
                setMessages((prev) =>
                  prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: fullResponse } : msg)),
                )
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Extract structured prompt and skills from response
      const { prompt, skills, isQuestion } = extractPromptAndSkills(fullResponse)

      console.log("[v0] Extraction result:", {
        promptLength: prompt.length,
        skillsCount: skills.length,
        isQuestion,
        hasPrompt: !!prompt,
      })

      // Update question count if this is a question (not a generated prompt)
      if (isQuestion && !prompt) {
        setQuestionCount((prev) => prev + 1)
      }

      // Update final message with extracted data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: fullResponse,
                generatedPrompt: prompt || undefined, // Only set if prompt exists
                suggestedSkills: skills.length > 0 ? skills : undefined,
              }
            : msg,
        ),
      )
    } catch (error) {
      console.error("[v0] Chat error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${errorMessage}\n\nPlease check that your GROQ_API_KEY environment variable is configured correctly.`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleApplyPrompt = async (prompt: string, skills: string[]) => {
    if (onPromptGenerated) {
      const referencedDocs = sessionDocuments.filter(doc => 
        doc.extractedText && !doc.extractionError
      )
      
      // Store documents if agent has an ID
      if (agentId && referencedDocs.length > 0) {
        const storedDocs: AgentDocument[] = []
        
        for (const doc of referencedDocs) {
          try {
            const filePath = await storeDocument(doc.file, agentId)
            storedDocs.push({
              id: doc.id,
              name: doc.name,
              size: doc.size,
              type: doc.type,
              uploadedAt: new Date().toISOString(),
              filePath
            })
          } catch (error) {
            console.error('Failed to store document:', doc.name, error)
          }
        }
        
        onPromptGenerated(prompt, skills, storedDocs)
      } else {
        onPromptGenerated(prompt, skills, [])
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-sm">AI Configuration Assistant</h3>
            <p className="text-xs text-muted-foreground">Invoice Processing Specialist</p>
          </div>
        </div>

      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="max-w-[85%] space-y-2">
              {/* Regular message content - show only if not a generated prompt */}
              {!(message.role === "assistant" && message.generatedPrompt) && (
                <div
                  className={`p-3 rounded-lg ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              )}
              
              {/* Generated Prompt Display with Apply Button */}
              {message.role === "assistant" && message.generatedPrompt && message.generatedPrompt.length > 0 && (
                <>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{message.generatedPrompt}</p>
                  </div>
                  {message.suggestedSkills && message.suggestedSkills.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Suggested Skills:</h4>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestedSkills.map((skill) => (
                          <span key={skill} className="px-2 py-1 bg-background border border-border text-xs rounded-md">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => handleApplyPrompt(message.generatedPrompt!, message.suggestedSkills || [])}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Apply to Agent
                  </Button>
                </>
              )}
              
              {/* Fallback: Show apply button if response has structured content but extraction didn't work */}
              {message.role === "assistant" && 
               !message.generatedPrompt && 
               (message.content.includes("ROLE:") || 
                message.content.includes("INPUTS:") || 
                message.content.includes("STEPS:") || 
                message.content.includes("OUTPUT:")) && 
               !message.content.trim().endsWith("?") && (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => handleApplyPrompt(message.content, message.suggestedSkills || [])}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Apply to Agent
                </Button>
              )}
            </div>
            {message.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Analyzing and expanding your configuration...</p>
            </div>
          </div>
        )}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Session Documents - shown above input */}
      {sessionDocuments.length > 0 && (
        <div className="border-t border-border p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Reference Documents for this session:</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleClearAllDocuments}
              className="h-6 text-xs"
            >
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sessionDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs ${
                  doc.extractionError 
                    ? 'bg-destructive/10 border border-destructive/20' 
                    : doc.isExtracting 
                    ? 'bg-muted border border-border' 
                    : 'bg-background border border-border'
                }`}
              >
                {doc.isExtracting ? (
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                ) : doc.extractionError ? (
                  <AlertCircle className="w-3 h-3 text-destructive" />
                ) : (
                  <FileText className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="max-w-[150px] truncate" title={doc.name}>{doc.name}</span>
                <span className="text-muted-foreground">{formatFileSize(doc.size)}</span>
                {doc.extractionError && (
                  <span className="text-destructive text-[10px]" title={doc.extractionError}>Error</span>
                )}
                {doc.isExtracting && (
                  <span className="text-muted-foreground text-[10px]">Extracting...</span>
                )}
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  type="button"
                  disabled={doc.isExtracting}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv"
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="icon"
            variant="outline"
            className="h-9 w-9"
            disabled={isProcessing}
            type="button"
            title="Attach reference documents"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe what your agent should do..."
            className="flex-1 text-sm"
            disabled={isProcessing}
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9" disabled={isProcessing || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function extractPromptAndSkills(response: string): { prompt: string; skills: string[]; isQuestion: boolean } {
  let prompt = ""
  const skills: string[] = []

  console.log("[v0] Full AI response:", response.substring(0, 500))

  const hasStructuredContent =
    response.includes("ROLE:") ||
    response.includes("INPUTS:") ||
    response.includes("INPUT:") ||
    response.includes("STEPS:") ||
    response.includes("STEP:") ||
    response.includes("OUTPUT:") ||
    response.includes("VALIDATIONS:") ||
    response.includes("VALIDATION:") ||
    response.includes("ERROR HANDLING:") ||
    response.includes("ERROR_HANDLING:")

  // Detect if this is a question (not a generated prompt)
  // A question typically:
  // - Doesn't have structured sections
  // - Ends with a question mark
  // - Is conversational
  const isQuestion = !hasStructuredContent && (
    response.trim().endsWith("?") ||
    /^(To help|Could you|What|Which|How|When|Where|Would|Can|Should|Do you|Are you)/i.test(response.trim())
  )

  if (hasStructuredContent) {
    // Split response into lines to process
    const lines = response.split("\n")
    let inStructuredSection = false
    const promptLines: string[] = []
    let foundFirstSection = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Start capturing when we hit a structured section (more flexible matching)
      if (
        /^###?\s*(ROLE|INPUTS?|STEPS?|VALIDATIONS?|OUTPUT|ERROR\s*HANDLING|CONTEXT|AGENT|DESCRIPTION)/i.test(line) ||
        /^\*\*(ROLE|INPUTS?|STEPS?|VALIDATIONS?|OUTPUT|ERROR\s*HANDLING|CONTEXT|AGENT|DESCRIPTION)/i.test(line) ||
        /^(ROLE|INPUTS?|STEPS?|VALIDATIONS?|OUTPUT|ERROR\s*HANDLING|CONTEXT|AGENT|DESCRIPTION):/i.test(line.trim())
      ) {
        inStructuredSection = true
        foundFirstSection = true
        // Include the section header line
        promptLines.push(line)
        continue
      }

      // If we've found the first section, continue capturing until we hit a stop condition
      if (foundFirstSection && inStructuredSection) {
        // Stop capturing at SUGGESTED SKILLS or conversational endings
        if (
          /^###?\s*SUGGESTED\s+(SKILLS|TOOLS)/i.test(line) ||
          /^\*\*SUGGESTED\s+(SKILLS|TOOLS)/i.test(line) ||
          /^SUGGESTED\s+(SKILLS|TOOLS):/i.test(line.trim()) ||
          /^(How does this|Would you like|Let me know|Please let me know|Are there any|To achieve this|To implement this|Here is|This prompt)/i.test(line.trim())
        ) {
          inStructuredSection = false
          break
        }
        // Continue capturing lines
        promptLines.push(line)
      }
    }

    prompt = promptLines.join("\n").trim()
    console.log("[v0] Extracted prompt length:", prompt.length, "chars")
    console.log("[v0] Extracted prompt preview:", prompt.substring(0, 200))
  } else {
    prompt = ""
    console.log("[v0] No structured content found in response")
  }

  // 1. Look for "SUGGESTED SKILLS:" section (also check for TOOLS for backward compatibility)
  const suggestedSkillsMatch = response.match(/\*\*?SUGGESTED\s+(SKILLS|TOOLS):?\*\*?\s*([\s\S]*?)(?=\n\n|###|$)/i)
  if (suggestedSkillsMatch) {
    console.log("[v0] Found SUGGESTED SKILLS/TOOLS section")
    const skillsSection = suggestedSkillsMatch[2]
    AVAILABLE_SKILLS.forEach((skill) => {
      // Match: - Skill, * Skill, • Skill, **Skill**, or just Skill on its own line
      if (new RegExp(`[-•*]?\\s*\\*?\\*?${skill}\\*?\\*?`, "i").test(skillsSection) && !skills.includes(skill)) {
        console.log("[v0] Found skill in SUGGESTED SKILLS:", skill)
        skills.push(skill)
      }
    })
  }

  // 2. Look for skills section with variations (also check for tools for backward compatibility)
  const skillsSectionMatch = response.match(
    /(skills?|tools?) (needed|required)|implement.*using|recommend.*(skills?|tools?):?\s*([\s\S]*?)(?=\n\n|###|$)/i,
  )
  if (skillsSectionMatch && skills.length === 0) {
    console.log("[v0] Found skills/tools section (variation)")
    const sectionText = skillsSectionMatch[skillsSectionMatch.length - 1]
    AVAILABLE_SKILLS.forEach((skill) => {
      if (new RegExp(`[-•*]?\\s*\\*?\\*?${skill}\\*?\\*?`, "i").test(sectionText) && !skills.includes(skill)) {
        console.log("[v0] Found skill in skills section:", skill)
        skills.push(skill)
      }
    })
  }

  // 3. Last resort: scan entire response for skill mentions
  if (skills.length === 0) {
    console.log("[v0] Scanning entire response for skills")
    AVAILABLE_SKILLS.forEach((skill) => {
      if (new RegExp(`\\b${skill}\\b`, "i").test(response)) {
        console.log("[v0] Found skill in full scan:", skill)
        skills.push(skill)
      }
    })
  }

  console.log("[v0] Extracted prompt length:", prompt.length, "chars")
  console.log("[v0] Extracted skills:", skills)
  console.log("[v0] Is question:", isQuestion)

  return { prompt, skills, isQuestion }
}
