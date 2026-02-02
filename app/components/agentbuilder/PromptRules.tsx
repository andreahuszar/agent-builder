"use client"

import { Check, X, AlertTriangle, ArrowRight } from "lucide-react"

interface PromptRulesProps {
  prompt: string
  mode?: string
}

interface Rule {
  id: string
  condition: string
  action: string
  type: "threshold" | "validation" | "escalation" | "general"
}

function isComplexAgent(prompt: string): boolean {
  const lower = prompt.toLowerCase()
  
  // Agents that are too complex for rules view
  const complexityIndicators = [
    // Too many detailed steps
    (prompt.match(/\d+\./g) || []).length > 10,
    // Extensive field listings
    lower.includes('fields to extract') && lower.includes('line items'),
    // Complex data transformations
    (lower.includes('convert') || lower.includes('transform')) && 
    (lower.includes('calculate') || lower.includes('sum') || lower.includes('normalize')),
    // ERP/technical integration steps
    (lower.includes('erp') || lower.includes('api') || lower.includes('post')) && 
    (lower.includes('journal entry') || lower.includes('document number')),
    // Payment/banking complexity
    lower.includes('payment') && lower.includes('bank') && lower.includes('ach'),
  ]
  
  return complexityIndicators.filter(Boolean).length >= 2
}

function parsePromptToRules(prompt: string, mode?: string): Rule[] {
  const rules: Rule[] = []
  const lines = prompt.split('\n')
  
  // Check for AGENT INSTRUCTIONS section (simpler rules)
  const hasInstructionsSection = prompt.includes('AGENT INSTRUCTIONS')
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()
    
    // Skip empty lines and section headers
    if (!trimmed || trimmed.endsWith(':') || trimmed.startsWith('ROLE:')) {
      return
    }
    
    // Look for numbered instructions (1., 2., etc) in AGENT INSTRUCTIONS section
    if (hasInstructionsSection && trimmed.match(/^\d+\./)) {
      const instruction = trimmed.replace(/^\d+\.\s*/, '').trim()
      const instrLower = instruction.toLowerCase()
      
      // Parse instruction into condition and action
      if (instrLower.startsWith('if ')) {
        const parts = instruction.split(/,\s*(?:then\s+)?/i)
        if (parts.length >= 2) {
          const condition = parts[0].replace(/^if /i, '').trim()
          const action = parts.slice(1).join(', ').trim()
          
          let type: Rule['type'] = "general"
          if (instrLower.includes('above') || instrLower.includes('exceeds') || instrLower.includes('threshold')) {
            type = "threshold"
          } else if (instrLower.includes('route') || instrLower.includes('approval')) {
            type = "escalation"
          } else if (instrLower.includes('increase') || instrLower.includes('adjust')) {
            type = "validation"
          }
          
          rules.push({
            id: `rule-${index}`,
            condition,
            action,
            type
          })
          return
        }
      }
    }
    
    // Look for IF-THEN patterns
    if (lower.includes('if ') && (lower.includes('then ') || lower.includes(', '))) {
      // Handle "If X, Y" pattern (common in instructions)
      const ifMatch = trimmed.match(/if\s+(.+?),\s*(.+)/i)
      if (ifMatch && ifMatch[1] && ifMatch[2]) {
        const condition = ifMatch[1].trim()
        const action = ifMatch[2].trim()
        
        let type: Rule['type'] = "general"
        if (lower.includes('above') || lower.includes('exceeds') || lower.includes('$')) {
          type = "threshold"
        } else if (lower.includes('route') || lower.includes('flag') || lower.includes('raise') || lower.includes('escalate')) {
          type = "escalation"
        } else if (lower.includes('increase') || lower.includes('adjust') || lower.includes('apply')) {
          type = "validation"
        }
        
        rules.push({
          id: `rule-${index}`,
          condition,
          action,
          type
        })
        return
      }
      
      // Handle "If X then Y" pattern
      const parts = trimmed.split(/\s+then\s+/i)
      if (parts.length >= 2) {
        const condition = parts[0].replace(/^if /i, '').trim()
        const action = parts.slice(1).join(' ').trim()
        
        let type: Rule['type'] = "general"
        if (lower.includes('confidence') || lower.includes('%') || lower.includes('threshold')) {
          type = "threshold"
        } else if (lower.includes('escalate') || lower.includes('flag') || lower.includes('review')) {
          type = "escalation"
        } else if (lower.includes('validate') || lower.includes('verify')) {
          type = "validation"
        }
        
        rules.push({
          id: `rule-${index}`,
          condition,
          action,
          type
        })
        return
      }
    }
    
    // Look for threshold patterns with → symbol
    if (trimmed.includes('→') || trimmed.includes('->')) {
      const parts = trimmed.split(/→|->/)
      if (parts.length >= 2) {
        rules.push({
          id: `rule-${index}`,
          condition: parts[0].trim(),
          action: parts[1].trim(),
          type: lower.includes('flag') || lower.includes('review') ? "escalation" : "threshold"
        })
        return
      }
    }
  })
  
  // Add mode-based default rule if we found some rules
  if (rules.length > 0 && mode) {
    let defaultRule: Rule | null = null
    
    if (mode === "observe") {
      defaultRule = {
        id: "default-observe",
        condition: "Issue detected",
        action: "Flag for human review (no changes made)",
        type: "escalation"
      }
    } else if (mode === "suggest") {
      defaultRule = {
        id: "default-suggest",
        condition: "Issue can be resolved",
        action: "Propose solution for human approval",
        type: "escalation"
      }
    } else if (mode === "auto-apply") {
      defaultRule = {
        id: "default-auto",
        condition: "High confidence resolution available",
        action: "Apply fix automatically",
        type: "general"
      }
    }
    
    if (defaultRule) {
      rules.push(defaultRule)
    }
  }
  
  return rules
}

function RuleCard({ rule }: { rule: Rule }) {
  const getIcon = () => {
    switch (rule.type) {
      case "threshold":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />
      case "validation":
        return <Check className="w-4 h-4 text-green-600" />
      case "escalation":
        return <X className="w-4 h-4 text-red-600" />
      default:
        return <ArrowRight className="w-4 h-4 text-blue-600" />
    }
  }
  
  const getColors = () => {
    switch (rule.type) {
      case "threshold":
        return "border-orange-200 bg-orange-50"
      case "validation":
        return "border-green-200 bg-green-50"
      case "escalation":
        return "border-red-200 bg-red-50"
      default:
        return "border-blue-200 bg-blue-50"
    }
  }
  
  return (
    <div className={`border-2 rounded-lg p-3 ${getColors()}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">IF</span>
            <p className="text-sm font-medium text-gray-950">{rule.condition}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-shrink-0">THEN</span>
            <p className="text-sm text-gray-700">{rule.action}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PromptRules({ prompt, mode }: PromptRulesProps) {
  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <p>No prompt defined yet</p>
      </div>
    )
  }
  
  // Check if agent is too complex for rules view
  if (isComplexAgent(prompt)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-gray-950 mb-2">Too complex for rules view</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          This agent uses sophisticated processing logic with multiple data transformations. 
          View the <strong>Text</strong> or <strong>Flowchart</strong> for better understanding.
        </p>
      </div>
    )
  }
  
  const rules = parsePromptToRules(prompt, mode)
  
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <AlertTriangle className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-1">No clear if-then rules detected</p>
        <p className="text-xs text-muted-foreground">
          This agent uses complex logic better shown in Text or Flowchart view
        </p>
      </div>
    )
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-950 mb-1">Agent Rules</h4>
        <p className="text-xs text-muted-foreground">
          {rules.length} rule{rules.length !== 1 ? 's' : ''} extracted from prompt
        </p>
      </div>
      
      {rules.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}
    </div>
  )
}
