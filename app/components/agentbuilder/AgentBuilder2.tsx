"use client"

import { useState } from "react"
import { ChevronRight, Plus, X, Paperclip, Send } from "lucide-react"
import { Agent } from "./AgentBuilderPage"
import { ChatInterface } from "./ChatInterface"

interface AgentBuilder2Props {
  agents: Agent[]
  onCreateAgent: (stageId: string) => void
  currentAgent: Agent | null
  onAgentSelect: (agent: Agent | null) => void
  onSaveAgent: (agent: Agent) => void
  isPreviewMode: boolean
}

const WORKFLOW_STAGES = [
  { id: "ingestion", name: "Ingestion" },
  { id: "data-capture", name: "Data capture" },
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
}: AgentBuilder2Props) {
  const [showChat, setShowChat] = useState(true)

  // Count active and inactive agents per stage
  const getStageAgentCounts = (stageId: string) => {
    const stageAgents = agents.filter((a) => a.stage === stageId)
    const active = stageAgents.filter((a) => a.active).length
    const inactive = stageAgents.filter((a) => !a.active).length
    return { active, inactive }
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left Column: Workflow Stages */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-950">Workflow</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {WORKFLOW_STAGES.map((stage) => {
            const counts = getStageAgentCounts(stage.id)
            return (
              <button
                key={stage.id}
                onClick={() => onCreateAgent(stage.id)}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg mb-1 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-950 text-sm mb-1">
                      {stage.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {counts.active} active, {counts.inactive} inactive
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </div>
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onCreateAgent("")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create new agent
          </button>
        </div>
      </div>

      {/* Right Column: Configuration / Chat */}
      <div className="flex-1 flex flex-col">
        {showChat ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-950">Configuration</h2>
              <button
                onClick={() => setShowChat(false)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                End chat
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatInterface
                currentAgent={currentAgent}
                onSaveAgent={onSaveAgent}
                isPreviewMode={isPreviewMode}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                  <Plus className="h-8 w-8 text-purple-900" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-950 mb-2">
                No agent selected
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Select a workflow stage or create a new agent to get started
              </p>
              <button
                onClick={() => setShowChat(true)}
                className="px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors text-sm font-medium"
              >
                Start Configuration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
