"use client"

import { Agent } from "./AgentBuilderPage"
import { Pencil, Clock, Trash2, Save } from "lucide-react"
import { Button } from "@/app/components/ui/button"

interface AgentDetailsViewProps {
  agent: Agent
  onToggleActive: (agentId: string) => void
  onEdit: () => void
  onDelete: (agentId: string) => void
  onSave: () => void
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
}: AgentDetailsViewProps) {
  // Extract KEY ACTIONS from prompt
  const extractKeyActions = (prompt: string) => {
    const match = prompt.match(/KEY ACTIONS?:([\s\S]*?)(?=\n\n|$)/i)
    if (!match) return []
    
    const lines = match[1].split('\n').filter(line => line.trim())
    return lines.map(line => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean)
  }

  const keyActions = extractKeyActions(agent.prompt || '')

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-950">{agent.name}</h1>
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            >
              <Pencil className="h-4 w-4 text-gray-600" />
            </button>
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
              <button className="px-3 py-1 text-xs font-medium border-b-2 border-purple-600 text-gray-950">
                Basic
              </button>
              <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-950">
                Advanced
              </button>
              <button className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-950">
                Flowchart
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4">
            {agent.prompt?.split('\n')[0] || agent.name}
          </p>

          {/* Key Actions */}
          {keyActions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase">KEY ACTIONS:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {keyActions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Required Agent Skills */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-950">Required agent skills</h2>
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
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                    isSelected
                      ? 'bg-purple-50 border-purple-600 text-purple-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {isSelected && (
                    <span className="inline-block w-3 h-3 mr-1.5 rounded-sm bg-purple-600" />
                  )}
                  {skill}
                </button>
              )
            })}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-950 mb-4">Performance metrics</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            <span>Stats will be shown once agent has been live for 24 hours</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
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
