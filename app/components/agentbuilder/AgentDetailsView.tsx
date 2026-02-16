"use client"

import { useState } from "react"
import { Agent } from "./AgentBuilderPage"
import { Pencil, Clock, Trash2, Save, Check, X } from "lucide-react"
import { Button } from "@/app/components/ui/button"

interface AgentDetailsViewProps {
  agent: Agent
  onToggleActive: (agentId: string) => void
  onEdit: () => void
  onDelete: (agentId: string) => void
  onSave: () => void
  onUpdateAgent: (updatedAgent: Agent) => void
}

const AVAILABLE_SKILLS = [
  "Connect to ERP",
  "Extract text",
  "Find purchase orders",
  "Find vendor information",
  "Flag issues",
  "Intelligent matching",
  "Map to General Ledger",
  "Process documents",
  "Route for approval",
  "Run workflows",
  "Send messages",
  "Verify data",
]

export function AgentDetailsView({
  agent,
  onToggleActive,
  onEdit,
  onDelete,
  onSave,
  onUpdateAgent,
}: AgentDetailsViewProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(agent.name)
  const [promptView, setPromptView] = useState<"basic" | "advanced" | "flowchart">("basic")

  // Extract KEY ACTIONS from prompt (combines STEPS, KEY ACTIONS, and other action sections)
  const extractKeyActions = (prompt: string) => {
    const actions: string[] = []
    
    // Extract from STEPS section
    const stepsMatch = prompt.match(/STEPS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (stepsMatch) {
      const lines = stepsMatch[1].split('\n').filter(line => line.trim())
      actions.push(...lines.map(line => line.replace(/^\d+\.\s*[-•]?\s*/, '').trim()).filter(Boolean))
    }
    
    // Extract from KEY ACTIONS section
    const keyActionsMatch = prompt.match(/KEY ACTIONS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (keyActionsMatch) {
      const lines = keyActionsMatch[1].split('\n').filter(line => line.trim())
      actions.push(...lines.map(line => line.replace(/^\d+\.\s*[-•]?\s*/, '').trim()).filter(Boolean))
    }
    
    // Extract from PROCESS section if no STEPS or KEY ACTIONS found
    if (actions.length === 0) {
      const processMatch = prompt.match(/PROCESS:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
      if (processMatch) {
        const lines = processMatch[1].split('\n').filter(line => line.trim())
        actions.push(...lines.map(line => line.replace(/^\d+\.\s*[-•]?\s*/, '').trim()).filter(Boolean))
      }
    }
    
    return actions
  }

  // Extract ROLE from prompt for basic view
  const extractRole = (prompt: string) => {
    const match = prompt.match(/ROLE:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    return match ? match[1].trim() : ""
  }
  
  // Extract INPUTS from prompt
  const extractInputs = (prompt: string) => {
    const match = prompt.match(/INPUTS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!match) return []
    const lines = match[1].split('\n').filter(line => line.trim())
    return lines.map(line => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
  }
  
  // Extract OUTPUTS from prompt
  const extractOutputs = (prompt: string) => {
    const match = prompt.match(/OUTPUTS?:([\s\S]*?)(?=\n\n[A-Z]+:|$)/i)
    if (!match) return []
    const lines = match[1].split('\n').filter(line => line.trim())
    return lines.map(line => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
  }

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== agent.name) {
      onUpdateAgent({
        ...agent,
        name: editedName.trim(),
      })
    }
    setIsEditingName(false)
  }

  const handleCancelEdit = () => {
    setEditedName(agent.name)
    setIsEditingName(false)
  }

  const keyActions = extractKeyActions(agent.prompt || '')

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  className="text-xl font-semibold text-gray-950 border border-purple-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 hover:bg-green-100 rounded transition-colors"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1.5 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-semibold text-gray-950">{agent.name}</h1>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                >
                  <Pencil className="h-4 w-4 text-gray-600" />
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Active</span>
            <button
              onClick={() => onToggleActive(agent.id)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                agent.active ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  agent.active ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Deployment Info */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-950 mb-4">Deployment info</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Mode</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                <option value="observe">Observe</option>
                <option value="suggest">Suggest</option>
                <option value="auto-apply" selected={agent.mode === "auto-apply"}>Auto-apply</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Stage</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white">
                <option value="ingestion">Ingestion</option>
                <option value="data-capture">Data capture</option>
                <option value="verification">Verification</option>
                <option value="matching" selected={agent.stage === "matching"}>Matching</option>
                <option value="approval">Approval</option>
                <option value="posting">Posting</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Lane</label>
              <input
                type="text"
                value={agent.lane || "Unit conversion"}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white"
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Agent Details */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-950">Agent details</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setPromptView("basic")}
                className={`px-3 py-1 text-xs font-medium border-b-2 ${
                  promptView === "basic" 
                    ? "border-purple-600 text-gray-950" 
                    : "border-transparent text-gray-500 hover:text-gray-950"
                }`}
              >
                Basic
              </button>
              <button 
                onClick={() => setPromptView("advanced")}
                className={`px-3 py-1 text-xs font-medium border-b-2 ${
                  promptView === "advanced" 
                    ? "border-purple-600 text-gray-950" 
                    : "border-transparent text-gray-500 hover:text-gray-950"
                }`}
              >
                Advanced
              </button>
              <button 
                onClick={() => setPromptView("flowchart")}
                className={`px-3 py-1 text-xs font-medium border-b-2 ${
                  promptView === "flowchart" 
                    ? "border-purple-600 text-gray-950" 
                    : "border-transparent text-gray-500 hover:text-gray-950"
                }`}
              >
                Flowchart
              </button>
            </div>
          </div>

          {/* Basic View */}
          {promptView === "basic" && (
            <>
              {/* Role */}
              {extractRole(agent.prompt || "") && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">ROLE:</h3>
                  <p className="text-sm text-gray-700">{extractRole(agent.prompt || "")}</p>
                </div>
              )}

              {/* Key Actions */}
              {keyActions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">KEY ACTIONS:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    {keyActions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}

          {/* Advanced View */}
          {promptView === "advanced" && (
            <>
              {/* Full Prompt */}
              <div className="mb-6">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {agent.prompt || "No prompt configured"}
                </div>
              </div>

              {/* Required Agent Skills */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-700 uppercase">Required agent skills</h3>
                  <span className="text-xs text-gray-500">
                    {agent.skills?.length || 0} of {AVAILABLE_SKILLS.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map((skill) => {
                    const isSelected = agent.skills?.includes(skill)
                    return (
                      <button
                        key={skill}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-purple-50 border-purple-600 text-purple-700 font-medium'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && (
                          <span className="flex items-center justify-center w-4 h-4 rounded bg-green-500 text-white shrink-0">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                        {skill}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Referenced Files */}
              {agent.documents && agent.documents.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">REFERENCED FILES:</h3>
                  <div className="space-y-2">
                    {agent.documents.map((doc, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
                        <span className="font-mono">{doc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Flowchart View */}
          {promptView === "flowchart" && (
            <div className="py-4">
              {/* Start Node */}
              <div className="flex flex-col items-center">
                <div className="px-6 py-3 bg-green-100 border-2 border-green-500 rounded-full text-sm font-semibold text-green-700">
                  START
                </div>
                <div className="w-0.5 h-8 bg-gray-300"></div>
              </div>

              {/* Role Node */}
              {extractRole(agent.prompt || "") && (
                <>
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-lg text-sm text-gray-950">
                      <div className="font-semibold text-purple-700 mb-1">ROLE</div>
                      <div>{extractRole(agent.prompt || "")}</div>
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                </>
              )}

              {/* Inputs Node */}
              {extractInputs(agent.prompt || "").length > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-sm text-gray-950">
                      <div className="font-semibold text-blue-700 mb-2">INPUTS</div>
                      <ul className="space-y-1">
                        {extractInputs(agent.prompt || "").map((input, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{input}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                </>
              )}

              {/* Actions/Steps Nodes */}
              {keyActions.length > 0 && (
                <>
                  <div className="flex flex-col items-center space-y-4">
                    {keyActions.map((action, index) => (
                      <div key={index} className="flex flex-col items-center w-full">
                        <div className="w-full max-w-md px-4 py-3 bg-white border-2 border-gray-300 rounded text-sm text-gray-950">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-purple-700">{index + 1}.</span>
                            <span>{action}</span>
                          </div>
                        </div>
                        {index < keyActions.length - 1 && <div className="w-0.5 h-8 bg-gray-300"></div>}
                      </div>
                    ))}
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                </>
              )}

              {/* Outputs Node */}
              {extractOutputs(agent.prompt || "").length > 0 && (
                <>
                  <div className="flex flex-col items-center">
                    <div className="w-full max-w-md px-4 py-3 bg-amber-50 border-2 border-amber-300 rounded-lg text-sm text-gray-950">
                      <div className="font-semibold text-amber-700 mb-2">OUTPUTS</div>
                      <ul className="space-y-1">
                        {extractOutputs(agent.prompt || "").map((output, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>{output}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                  </div>
                </>
              )}

              {/* End Node */}
              <div className="flex flex-col items-center">
                <div className="px-6 py-3 bg-red-100 border-2 border-red-500 rounded-full text-sm font-semibold text-red-700">
                  END
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-950 mb-4">Performance metrics</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Stats will be shown once agent has been live for 24 hours</span>
          </div>
        </div>
        </div>
      </div>

      {/* Sticky Footer with Action Buttons */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onDelete(agent.id)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete agent
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors"
          >
            <Save className="h-4 w-4" />
            Save agent
          </button>
        </div>
      </div>
    </div>
  )
}
