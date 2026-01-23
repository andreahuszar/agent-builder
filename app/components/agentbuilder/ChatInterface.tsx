"use client"

import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Send, Bot, User, CheckCircle2 } from "lucide-react"
import type { Agent } from "./AgentBuilderPage"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  generatedPrompt?: string
  suggestedSkills?: string[]
}

interface ChatInterfaceProps {
  onPromptGenerated?: (prompt: string, skills: string[]) => void
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
        "Hi! I'm your invoice processing specialist. Tell me what your agent needs to do - I'll expand it into a detailed, production-ready configuration with specific fields, validation rules, and error handling.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    console.log("[v0] Agent changed, clearing chat. Agent ID:", agentId)
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "Hi! I'm your invoice processing specialist. Tell me what your agent needs to do - I'll expand it into a detailed, production-ready configuration with specific fields, validation rules, and error handling.",
        timestamp: new Date(),
      },
    ])
    setInput("")
  }, [agentId])

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
      const response = await fetch("/api/agent-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
      const { prompt, skills } = extractPromptAndSkills(fullResponse)

      // Update final message with extracted data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: fullResponse,
                generatedPrompt: prompt,
                suggestedSkills: skills,
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

  const handleApplyPrompt = (prompt: string, skills: string[]) => {
    if (onPromptGenerated) {
      onPromptGenerated(prompt, skills)
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
              <div
                className={`p-3 rounded-lg ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === "assistant" && message.generatedPrompt && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 bg-background hover:bg-accent"
                  onClick={() => handleApplyPrompt(message.generatedPrompt!, message.suggestedSkills || [])}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Apply to Prompt
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
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Describe what your agent should do..."
            className="flex-1 text-sm"
            disabled={isProcessing}
          />
          <Button onClick={handleSend} size="icon" className="h-9 w-9" disabled={isProcessing}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function extractPromptAndSkills(response: string): { prompt: string; skills: string[] } {
  let prompt = ""
  const skills: string[] = []

  console.log("[v0] Full AI response:", response.substring(0, 500))

  const hasStructuredContent =
    response.includes("ROLE:") ||
    response.includes("INPUTS:") ||
    response.includes("STEPS:") ||
    response.includes("OUTPUT:")

  if (hasStructuredContent) {
    // Split response into lines to process
    const lines = response.split("\n")
    let inStructuredSection = false
    const promptLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Start capturing when we hit a structured section
      if (
        /^###?\s*(ROLE|INPUTS?|STEPS?|VALIDATIONS?|OUTPUT|ERROR\s+HANDLING|CONTEXT)/i.test(line) ||
        /^\*\*(ROLE|INPUTS?|STEPS?|VALIDATIONS?|OUTPUT|ERROR\s+HANDLING|CONTEXT)/i.test(line)
      ) {
        inStructuredSection = true
      }

      // Stop capturing at SUGGESTED SKILLS or conversational endings
      if (
        /^###?\s*SUGGESTED\s+SKILLS/i.test(line) ||
        /^\*\*SUGGESTED\s+SKILLS/i.test(line) ||
        /^(How does this|Would you like|Let me know|Please let me know|Are there any|To achieve this|To implement this)/i.test(
          line,
        )
      ) {
        inStructuredSection = false
        break
      }

      // Capture the line if we're in a structured section
      if (inStructuredSection) {
        promptLines.push(line)
      }
    }

    prompt = promptLines.join("\n").trim()
  } else {
    prompt = ""
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

  return { prompt, skills }
}
