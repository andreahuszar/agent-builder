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
  
  // Start node
  nodes.push({
    id: "start",
    type: "start",
    label: "Invoice Received",
    description: stage ? `Stage: ${stage}` : undefined
  })
  
  // Parse prompt sections
  const lines = prompt.split('\n')
  let currentSection = ""
  let inputs: string[] = []
  let steps: string[] = []
  let outputs: string[] = []
  
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
        else if (currentSection === "steps") steps.push(content)
        else if (currentSection === "outputs") outputs.push(content)
      }
    }
  })
  
  // Add input nodes
  if (inputs.length > 0) {
    inputs.slice(0, 3).forEach((input, i) => {
      nodes.push({
        id: `input-${i}`,
        type: "input",
        label: "Input",
        description: input.substring(0, 60) + (input.length > 60 ? "..." : "")
      })
    })
    if (inputs.length > 3) {
      nodes.push({
        id: "input-more",
        type: "input",
        label: "Input",
        description: `+${inputs.length - 3} more inputs...`
      })
    }
  }
  
  // Add decision node based on mode
  if (mode) {
    let decisionLabel = "Evaluate"
    let decisionDesc = ""
    
    if (mode === "observe") {
      decisionLabel = "Observe & Flag"
      decisionDesc = "Monitor for issues"
    } else if (mode === "suggest") {
      decisionLabel = "Analyze & Suggest"
      decisionDesc = "Propose resolution"
    } else if (mode === "auto-apply") {
      decisionLabel = "Analyze & Decide"
      decisionDesc = "Auto-resolve if possible"
    }
    
    nodes.push({
      id: "decision",
      type: "decision",
      label: decisionLabel,
      description: decisionDesc
    })
  }
  
  // Add process steps
  if (steps.length > 0) {
    steps.slice(0, 4).forEach((step, i) => {
      nodes.push({
        id: `step-${i}`,
        type: "process",
        label: `Step ${i + 1}`,
        description: step.substring(0, 60) + (step.length > 60 ? "..." : "")
      })
    })
    if (steps.length > 4) {
      nodes.push({
        id: "step-more",
        type: "process",
        label: "Process",
        description: `+${steps.length - 4} more steps...`
      })
    }
  }
  
  // Add output nodes
  if (outputs.length > 0) {
    outputs.slice(0, 2).forEach((output, i) => {
      nodes.push({
        id: `output-${i}`,
        type: "output",
        label: "Output",
        description: output.substring(0, 60) + (output.length > 60 ? "..." : "")
      })
    })
    if (outputs.length > 2) {
      nodes.push({
        id: "output-more",
        type: "output",
        label: "Output",
        description: `+${outputs.length - 2} more outputs...`
      })
    }
  }
  
  // End node
  nodes.push({
    id: "end",
    type: "end",
    label: "Processing Complete"
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
