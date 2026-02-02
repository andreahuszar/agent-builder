"use client"

import { ArrowDown, Circle, Square, Diamond } from "lucide-react"

interface PromptFlowchartProps {
  prompt: string
  stage?: string
  mode?: string
}

interface FlowNode {
  id: string
  type: "start" | "input" | "process" | "decision" | "output" | "end"
  label: string
  description?: string
}

function parsePromptToFlowchart(prompt: string, stage?: string, mode?: string): FlowNode[] {
  const nodes: FlowNode[] = []
  const lowerPrompt = prompt.toLowerCase()
  
  // Start node
  nodes.push({
    id: "start",
    type: "start",
    label: "Start",
    description: stage ? `${stage.replace(/-/g, ' ')}` : undefined
  })
  
  // Parse prompt sections
  const lines = prompt.split('\n')
  let currentSection = ""
  let inputs: string[] = []
  let steps: string[] = []
  let outputs: string[] = []
  let decisions: string[] = []
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (trimmed.startsWith('INPUTS:')) {
      currentSection = "inputs"
    } else if (trimmed.startsWith('STEPS:') || trimmed.startsWith('PROCESS:') || trimmed.startsWith('LOGIC:')) {
      currentSection = "steps"
    } else if (trimmed.startsWith('OUTPUTS:') || trimmed.startsWith('RETURNS:')) {
      currentSection = "outputs"
    } else if (trimmed.startsWith('-') || trimmed.match(/^\d+\./)) {
      const content = trimmed.replace(/^[-\d.]\s*/, '').trim()
      if (content) {
        if (currentSection === "inputs") inputs.push(content)
        else if (currentSection === "steps") {
          steps.push(content)
          // Extract decision points
          if (content.toLowerCase().includes('if ') || 
              content.toLowerCase().includes('when ') ||
              content.toLowerCase().includes('check ') ||
              content.toLowerCase().includes('validate ') ||
              content.toLowerCase().includes('escalate') ||
              content.toLowerCase().includes('flag') ||
              content.toLowerCase().includes('review') ||
              content.toLowerCase().includes('confidence')) {
            decisions.push(content)
          }
        }
        else if (currentSection === "outputs") outputs.push(content)
      }
    }
  })
  
  // Single combined input node
  if (inputs.length > 0) {
    nodes.push({
      id: "input",
      type: "input",
      label: "Receive Inputs",
      description: `${inputs.length} input${inputs.length !== 1 ? 's' : ''}`
    })
  }
  
  // Main process node (simplified from all steps)
  const keySteps = steps.filter(s => 
    !s.toLowerCase().includes('if ') && 
    !s.toLowerCase().includes('escalate') && 
    !s.toLowerCase().includes('flag') &&
    !s.toLowerCase().includes('confidence')
  )
  
  if (keySteps.length > 0) {
    nodes.push({
      id: "process",
      type: "process",
      label: "Process Data",
      description: `Execute ${keySteps.length} step${keySteps.length !== 1 ? 's' : ''}`
    })
  }
  
  // Add decision nodes from extracted decisions
  decisions.forEach((decision, i) => {
    let label = "Check Condition"
    let desc = decision.substring(0, 50) + (decision.length > 50 ? "..." : "")
    
    if (decision.toLowerCase().includes('confidence') || decision.toLowerCase().includes('threshold')) {
      label = "Check Quality"
      desc = "Confidence threshold"
    } else if (decision.toLowerCase().includes('escalate') || decision.toLowerCase().includes('flag')) {
      label = "Escalate?"
      desc = "Review required"
    } else if (decision.toLowerCase().includes('validate') || decision.toLowerCase().includes('verify')) {
      label = "Validate"
      desc = "Check accuracy"
    }
    
    nodes.push({
      id: `decision-${i}`,
      type: "decision",
      label,
      description: desc
    })
  })
  
  // If no explicit decisions found, add mode-based decision
  if (decisions.length === 0 && mode) {
    let decisionLabel = "Evaluate"
    let decisionDesc = ""
    
    if (mode === "observe") {
      decisionLabel = "Issue Found?"
      decisionDesc = "Flag for review"
    } else if (mode === "suggest") {
      decisionLabel = "Can Resolve?"
      decisionDesc = "Suggest solution"
    } else if (mode === "auto-apply") {
      decisionLabel = "Can Auto-Fix?"
      decisionDesc = "Apply or escalate"
    }
    
    nodes.push({
      id: "decision-mode",
      type: "decision",
      label: decisionLabel,
      description: decisionDesc
    })
  }
  
  // Single combined output node
  if (outputs.length > 0) {
    nodes.push({
      id: "output",
      type: "output",
      label: "Return Results",
      description: `${outputs.length} output${outputs.length !== 1 ? 's' : ''}`
    })
  }
  
  // End node
  nodes.push({
    id: "end",
    type: "end",
    label: "Complete"
  })
  
  return nodes
}

function FlowNodeComponent({ node }: { node: FlowNode }) {
  const getNodeStyle = () => {
    switch (node.type) {
      case "start":
        return "bg-green-100 text-green-800 border-green-300"
      case "end":
        return "bg-red-100 text-red-800 border-red-300"
      case "input":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "process":
        return "bg-purple-100 text-purple-800 border-purple-300"
      case "decision":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "output":
        return "bg-indigo-100 text-indigo-800 border-indigo-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }
  
  const getIcon = () => {
    switch (node.type) {
      case "start":
      case "end":
        return <Circle className="w-4 h-4" />
      case "decision":
        return <Diamond className="w-4 h-4" />
      default:
        return <Square className="w-4 h-4" />
    }
  }
  
  const getShape = () => {
    if (node.type === "decision") {
      return "rotate-45"
    }
    if (node.type === "start" || node.type === "end") {
      return "rounded-full"
    }
    return "rounded-lg"
  }
  
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          ${getShape()}
          ${getNodeStyle()}
          border-2 p-3 min-w-[140px] max-w-[200px] text-center shadow-sm
          ${node.type === "decision" ? "p-6" : ""}
        `}
      >
        <div className={`flex items-center justify-center gap-2 ${node.type === "decision" ? "-rotate-45" : ""}`}>
          {getIcon()}
          <p className="text-xs font-semibold">{node.label}</p>
        </div>
        {node.description && (
          <p className={`text-xs mt-1 ${node.type === "decision" ? "-rotate-45" : ""}`}>
            {node.description}
          </p>
        )}
      </div>
    </div>
  )
}

export function PromptFlowchart({ prompt, stage, mode }: PromptFlowchartProps) {
  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p>No prompt defined yet</p>
      </div>
    )
  }
  
  const nodes = parsePromptToFlowchart(prompt, stage, mode)
  
  return (
    <div className="flex-1 overflow-y-auto p-4 bg-muted/20 rounded-lg">
      <div className="flex flex-col items-center gap-3 min-h-full">
        {nodes.map((node, index) => (
          <div key={node.id} className="flex flex-col items-center">
            <FlowNodeComponent node={node} />
            {index < nodes.length - 1 && (
              <ArrowDown className="w-5 h-5 text-muted-foreground my-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
