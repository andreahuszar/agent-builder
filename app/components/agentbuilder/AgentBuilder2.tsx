"use client"

import { useState, useEffect } from "react"
import { ChevronRight, ChevronDown, Plus, X, Minimize2, Power, Pencil } from "lucide-react"
import { Agent } from "./AgentBuilderPage"
import { ChatInterface } from "./ChatInterface"
import { AgentDetailsView } from "./AgentDetailsView"
import { Button } from "@/app/components/ui/button"

interface AgentBuilder2Props {
  agents: Agent[]
  onCreateAgent: (stageId: string) => void
  currentAgent: Agent | null
  onAgentSelect: (agent: Agent | null) => void
  onSaveAgent: (agent: Agent) => void
  isPreviewMode: boolean
  onToggleActive: (agentId: string) => void
  onEditAgent: (agent: Agent) => void
  onDeleteAgent: (agentId: string) => void
}

const WORKFLOW_STAGES = [
  { id: "ingestion", name: "Ingestion" },
  { id: "data-capture", name: "Data Capture" },
  { id: "verification", name: "Verification" },
  { id: "matching", name: "Matching" },
  { id: "approval", name: "Approval" },
  { id: "posting", name: "Posting" },
]

export function AgentBuilder2({
  agents,
  onCreateAgent,
  currentAgent,
  onAgentSelect,
  onSaveAgent,
  isPreviewMode,
  onToggleActive,
  onEditAgent,
  onDeleteAgent,
}: AgentBuilder2Props) {
  const [chatOpen, setChatOpen] = useState(true)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)
  const [leftWidth, setLeftWidth] = useState(320) // 320px = w-80
  const [rightWidth, setRightWidth] = useState(400) // 400px default chat width
  const [isDraggingLeft, setIsDraggingLeft] = useState(false)
  const [isDraggingRight, setIsDraggingRight] = useState(false)

  // Extract a clean agent name from the prompt
  const extractAgentName = (prompt: string): string => {
    // Try to extract from ROLE line
    const roleMatch = prompt.match(/ROLE:\s*(.+?)(?:\s*-|Agent|\n|$)/i)
    if (roleMatch) {
      let name = roleMatch[1].trim()
      // Remove common suffixes
      name = name.replace(/\s+(Agent|automation|processor|handler|service|system)$/i, '')
      // Capitalize first letter of each word
      name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
      return name + ' Agent'
    }
    
    // Fallback: try to extract from first meaningful line
    const lines = prompt.split('\n').filter(l => l.trim())
    if (lines.length > 0) {
      return lines[0].substring(0, 50).trim() + ' Agent'
    }
    
    return 'New Agent'
  }

  const handlePromptGenerated = (prompt: string, skills: string[], documents?: any[]) => {
    console.log('[AgentBuilder2] handlePromptGenerated called', { currentAgent, prompt: prompt.substring(0, 50), skills })
    
    const agentName = extractAgentName(prompt)
    
    if (currentAgent) {
      const updatedAgent = {
        ...currentAgent,
        name: currentAgent.name === 'New Agent' || !currentAgent.name ? agentName : currentAgent.name,
        prompt,
        skills,
        documents: documents || currentAgent.documents,
      }
      console.log('[AgentBuilder2] Updating existing agent:', updatedAgent.name)
      onSaveAgent(updatedAgent)
      setShowDetails(true)
    } else {
      // Create a new agent if none is selected
      console.log('[AgentBuilder2] Creating new agent')
      const newAgentId = `agent-${Date.now()}`
      
      // Extract stage from prompt if possible
      const stageMatch = prompt.match(/STAGE:\s*(\w+)/i)
      const stage = stageMatch ? stageMatch[1].toLowerCase() : ''
      
      const newAgent: Agent = {
        id: newAgentId,
        name: agentName,
        stage,
        active: true,
        mode: 'auto-apply',
        prompt,
        skills,
        documents: documents || [],
      }
      
      console.log('[AgentBuilder2] New agent created:', newAgent)
      onSaveAgent(newAgent)
      onAgentSelect(newAgent)
      setShowDetails(true)
    }
  }

  const handleEditAgentDetails = () => {
    setShowDetails(false)
  }

  const handleSaveAgentDetails = () => {
    // Save is already handled by onSaveAgent
    setShowDetails(true)
  }

  // Handle left resize
  const handleLeftMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingLeft(true)
  }

  // Handle right resize
  const handleRightMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingRight(true)
  }

  // Handle mouse move for resizing
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingLeft) {
      const newWidth = Math.max(240, Math.min(500, e.clientX))
      setLeftWidth(newWidth)
    }
    if (isDraggingRight) {
      const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX))
      setRightWidth(newWidth)
    }
  }

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDraggingLeft(false)
    setIsDraggingRight(false)
  }

  // Add event listeners for drag
  useEffect(() => {
    if (isDraggingLeft || isDraggingRight) {
      window.addEventListener('mousemove', handleMouseMove as any)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove as any)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDraggingLeft, isDraggingRight])

  // Group agents by stage
  const agentsByStage = WORKFLOW_STAGES.map((stage) => ({
    ...stage,
    agents: agents.filter((agent) => agent.stage === stage.id),
    activeCount: agents.filter((agent) => agent.stage === stage.id && agent.active).length,
    inactiveCount: agents.filter((agent) => agent.stage === stage.id && !agent.active).length,
  }))

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(stageId)) {
        newSet.delete(stageId)
      } else {
        newSet.add(stageId)
      }
      return newSet
    })
  }

  return (
    <div className="flex h-full bg-white relative">
      {/* Left Column: Agent List */}
      <div className="border-r border-gray-200 flex flex-col bg-white" style={{ width: `${leftWidth}px` }}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-950 uppercase tracking-wide">Agents</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <Minimize2 className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {agentsByStage.map((stage) => (
              <div key={stage.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleStage(stage.id)}
                  className="w-full flex items-center gap-2 p-2.5 hover:bg-gray-50 transition-colors rounded-lg"
                >
                  {expandedStages.has(stage.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-gray-950">{stage.name}</div>
                    <div className="text-xs text-gray-500">
                      {stage.activeCount} active, {stage.inactiveCount} inactive
                    </div>
                  </div>
                </button>

                {expandedStages.has(stage.id) && stage.agents.length > 0 && (
                  <div className="space-y-1 mt-1 ml-2 pl-4 border-l border-gray-200">
                    {stage.agents.map((agent) => (
                      <div
                        key={agent.id}
                        onClick={() => {
                          onAgentSelect(agent)
                          if (agent.prompt) {
                            setShowDetails(true)
                          } else {
                            setShowDetails(false)
                          }
                        }}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group cursor-pointer"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`w-7 h-7 shrink-0 ${agent.active ? "text-green-500 hover:text-green-600" : "text-gray-400 hover:text-gray-600"}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onToggleActive(agent.id)
                          }}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${agent.active ? "bg-green-500" : "bg-gray-400"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-950 truncate">{agent.name}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEditAgent(agent)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onCreateAgent("")}
            className="w-full flex items-center justify-start gap-2 px-4 py-2.5 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Agent
          </button>
        </div>
      </div>

      {/* Left Resize Handle */}
      <div
        onMouseDown={handleLeftMouseDown}
        className={`w-1 hover:w-1.5 bg-transparent hover:bg-purple-600 cursor-col-resize transition-all ${
          isDraggingLeft ? 'w-1.5 bg-purple-600' : ''
        }`}
        style={{ flexShrink: 0 }}
      />

      {/* Middle Column: Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: '400px' }}>
        {showDetails && currentAgent && currentAgent.prompt ? (
          <AgentDetailsView
            agent={currentAgent}
            onToggleActive={onToggleActive}
            onEdit={handleEditAgentDetails}
            onDelete={onDeleteAgent}
            onSave={handleSaveAgentDetails}
            onUpdateAgent={onSaveAgent}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center px-8">
              <div className="mb-6">
                <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Robot illustration */}
                  <circle cx="100" cy="80" r="40" fill="#E5E7EB"/>
                  <circle cx="85" cy="75" r="5" fill="#374151"/>
                  <circle cx="115" cy="75" r="5" fill="#374151"/>
                  <path d="M85 90 Q100 95 115 90" stroke="#374151" strokeWidth="2" fill="none"/>
                  <rect x="70" y="120" width="60" height="50" rx="8" fill="#E5E7EB"/>
                  <rect x="55" y="135" width="15" height="30" rx="5" fill="#E5E7EB"/>
                  <rect x="130" y="135" width="15" height="30" rx="5" fill="#E5E7EB"/>
                  {/* Building blocks */}
                  <rect x="130" y="60" width="25" height="25" rx="4" fill="#7C3AED" opacity="0.6"/>
                  <rect x="140" y="40" width="25" height="25" rx="4" fill="#A78BFA" opacity="0.6"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-950 mb-2">
                Nothing configured yet
              </h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Chat with the agent builder to configure your agents and rules
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Resize Handle */}
      {chatOpen && (
        <div
          onMouseDown={handleRightMouseDown}
          className={`w-1 hover:w-1.5 bg-transparent hover:bg-purple-600 cursor-col-resize transition-all ${
            isDraggingRight ? 'w-1.5 bg-purple-600' : ''
          }`}
          style={{ flexShrink: 0 }}
        />
      )}

      {/* Right Column: Chat Panel */}
      {chatOpen && (
        <div className="border-l border-gray-200 flex flex-col" style={{ width: `${rightWidth}px` }}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-950">Chat</h2>
            <button
              onClick={() => setChatOpen(false)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              End chat
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatInterface
              currentAgent={currentAgent}
              onPromptGenerated={handlePromptGenerated}
              agentId={currentAgent?.id}
              currentPrompt={currentAgent?.prompt}
            />
          </div>
        </div>
      )}
    </div>
  )
}
