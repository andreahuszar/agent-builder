"use client"

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react"
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
  isSettingsRecommendation?: boolean
  settingsLink?: string
}

interface ChatInterfaceProps {
  onPromptGenerated?: (prompt: string, skills: string[], documents?: AgentDocument[]) => void
  onStageDetected?: (stage: string) => void
  onLaneDetected?: (lane: string) => void
  currentPrompt?: string
  agentId?: string
  currentAgent?: Agent | null
}

export interface ChatInterfaceRef {
  clearChat: () => void
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

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(({ onPromptGenerated, onStageDetected, onLaneDetected, currentPrompt, agentId, currentAgent }, ref) => {
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
  const inputRef = useRef<HTMLInputElement>(null)

  const clearChat = () => {
    console.log("[ChatInterface] clearChat called")
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
    console.log("[ChatInterface] Chat cleared, messages reset")
  }

  // Expose clearChat to parent component
  useImperativeHandle(ref, () => ({
    clearChat
  }))

  useEffect(() => {
    console.log("[v0] Agent changed, clearing chat. Agent ID:", agentId)
    clearChat()
  }, [agentId])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Small delay to ensure DOM has updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    }, 100)
  }, [messages, isProcessing])

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 200)
  }, [])

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
    
    // Keep input focused
    setTimeout(() => inputRef.current?.focus(), 100)

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
          currentPrompt: currentPrompt || undefined,
          agentName: currentAgent?.name || undefined,
        }),
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        // Use the specific error message from the API (e.g., rate limit details)
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
      const { prompt, skills, isQuestion, stage, lane, isSettingsRecommendation, settingsLink } = extractPromptAndSkills(fullResponse)

      console.log("[v0] Extraction result:", {
        promptLength: prompt.length,
        skillsCount: skills.length,
        isQuestion,
        hasPrompt: !!prompt,
        stage,
        lane,
        isSettingsRecommendation,
        settingsLink,
      })

      // Update question count if this is a question (not a generated prompt)
      if (isQuestion && !prompt) {
        setQuestionCount((prev) => prev + 1)
      }
      
      // If stage was detected, notify parent component to update Stage dropdown
      if (stage && onStageDetected) {
        console.log("[v0] Calling onStageDetected with:", stage)
        onStageDetected(stage)
      }
      
      // If lane was detected, notify parent component to update Lane dropdown
      if (lane && onLaneDetected) {
        console.log("[v0] Calling onLaneDetected with:", lane)
        onLaneDetected(lane)
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
                isSettingsRecommendation: isSettingsRecommendation || undefined,
                settingsLink: settingsLink || undefined,
              }
            : msg,
        ),
      )
    } catch (error) {
      console.error("[v0] Chat error:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      
      // Display the specific error message (rate limit, auth, etc.)
      // Only add generic help text for non-specific errors
      const shouldShowGenericHelp = !errorMessage.toLowerCase().includes('rate limit') && 
                                     !errorMessage.toLowerCase().includes('api key');
      const helpText = shouldShowGenericHelp ? 
        '\n\nPlease check that your GROQ_API_KEY environment variable is configured correctly.' : '';
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${errorMessage}${helpText}`,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsProcessing(false)
      // Refocus input after AI responds
      setTimeout(() => inputRef.current?.focus(), 100)
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {messages.map((message) => (
            <div key={message.id} className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              <div className="max-w-[70%] space-y-2">
              {/* Settings Recommendation Display */}
              {message.role === "assistant" && message.isSettingsRecommendation && (
                <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                        Settings Recommendation
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                        {message.content.replace(/SETTINGS_RECOMMENDATION\n/, '').replace(/SETTINGS_LINK:.*/, '').trim()}
                      </p>
                      {message.settingsLink && (
                        <a
                          href={message.settingsLink}
                          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Go to Settings
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Regular message content - show only if not a generated prompt or settings recommendation */}
              {!(message.role === "assistant" && message.generatedPrompt) && !message.isSettingsRecommendation && (
                <div
                  className={`px-3 py-2 rounded-lg ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              )}
              
              {/* Generated Prompt Display with Apply Button */}
              {message.role === "assistant" && message.generatedPrompt && message.generatedPrompt.length > 0 && (
                <>
                  <div className="px-3 py-2 rounded-lg bg-muted">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{message.generatedPrompt}</p>
                  </div>
                  {message.suggestedSkills && message.suggestedSkills.length > 0 && (
                    <div className="px-3 py-2 rounded-lg bg-muted/50">
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
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground animate-pulse" />
              </div>
              <div className="bg-muted px-3 py-2 rounded-lg">
                <p className="text-sm text-muted-foreground">Analyzing and expanding your configuration...</p>
              </div>
            </div>
          )}
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
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
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
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
              ref={inputRef}
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
    </div>
  )
})

ChatInterface.displayName = "ChatInterface"

function extractPromptAndSkills(response: string): { prompt: string; skills: string[]; isQuestion: boolean; stage?: string; lane?: string; isSettingsRecommendation?: boolean; settingsLink?: string } {
  let prompt = ""
  const skills: string[] = []
  let stage: string | undefined = undefined
  let lane: string | undefined = undefined
  let isSettingsRecommendation: boolean = false
  let settingsLink: string | undefined = undefined

  console.log("[v0] Full AI response:", response.substring(0, 500))
  
  // Check for SETTINGS_RECOMMENDATION
  if (response.includes('SETTINGS_RECOMMENDATION')) {
    isSettingsRecommendation = true
    console.log("[v0] Detected settings recommendation")
    
    // Extract settings link if present
    const linkMatch = response.match(/SETTINGS_LINK:\s*([^\n\r]+)/i)
    if (linkMatch) {
      settingsLink = linkMatch[1].trim()
      console.log("[v0] Detected settings link:", settingsLink)
    } else {
      // Default to General Settings page
      settingsLink = '/settings#automation-general-settings'
    }
  }
  
  // Extract DETECTED_STAGE if present
  const stageMatch = response.match(/DETECTED_STAGE:\s*(ingestion|data-capture|verification|matching|approval|posting)/i)
  if (stageMatch) {
    stage = stageMatch[1].toLowerCase()
    console.log("[v0] Detected stage:", stage)
  }
  
  // Extract DETECTED_LANE if present (match until end of line, not including newline)
  const laneMatch = response.match(/DETECTED_LANE:\s*([^\n\r]+)/i)
  if (laneMatch) {
    lane = laneMatch[1].trim()
    console.log("[v0] Detected lane:", lane)
  }

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
  console.log("[v0] Detected stage:", stage)
  console.log("[v0] Detected lane:", lane)
  console.log("[v0] Is settings recommendation:", isSettingsRecommendation)
  console.log("[v0] Settings link:", settingsLink)

  return { prompt, skills, isQuestion, stage, lane, isSettingsRecommendation, settingsLink }
}

export default ChatInterface
