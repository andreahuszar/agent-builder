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

function parsePromptToRules(prompt: string, mode?: string): Rule[] {
  const rules: Rule[] = []
  const lines = prompt.split('\n')
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    const lower = trimmed.toLowerCase()
    
    // Look for IF-THEN patterns
    if (lower.includes('if ') && (lower.includes('then ') || lower.includes(':'))) {
      const parts = trimmed.split(/then |:/i)
      if (parts.length >= 2) {
        const condition = parts[0].replace(/^if /i, '').trim()
        const action = parts.slice(1).join(' ').trim()
        
        let type: Rule['type'] = "general"
        if (lower.includes('threshold') || lower.includes('confidence') || lower.includes('%') || lower.includes('score')) {
          type = "threshold"
        } else if (lower.includes('escalate') || lower.includes('flag') || lower.includes('review')) {
          type = "escalation"
        } else if (lower.includes('validate') || lower.includes('verify') || lower.includes('check')) {
          type = "validation"
        }
        
        rules.push({
          id: `rule-${index}`,
          condition,
          action,
          type
        })
      }
    }
    
    // Look for WHEN patterns
    else if (lower.includes('when ') && !lower.startsWith('when ')) {
      const parts = trimmed.split(/when /i)
      if (parts.length >= 2) {
        const beforeWhen = parts[0].trim()
        const condition = parts[1].trim()
        
        let type: Rule['type'] = "general"
        if (lower.includes('escalate') || lower.includes('flag')) {
          type = "escalation"
        }
        
        rules.push({
          id: `rule-${index}`,
          condition,
          action: beforeWhen,
          type
        })
      }
    }
    
    // Look for threshold patterns like "< 85%" or "> threshold"
    else if ((lower.includes('<') || lower.includes('>') || lower.includes('=')) && 
             (lower.includes('%') || lower.includes('threshold') || lower.includes('confidence'))) {
      const parts = trimmed.split(/[:,]/i)
      if (parts.length >= 2) {
        rules.push({
          id: `rule-${index}`,
          condition: parts[0].trim(),
          action: parts[1].trim(),
          type: "threshold"
        })
      }
    }
    
    // Look for "must" or "should" patterns
    else if ((lower.includes('must ') || lower.includes('should ')) && trimmed.length > 20) {
      const action = trimmed.replace(/^[-\d.]\s*/, '').trim()
      rules.push({
        id: `rule-${index}`,
        condition: "Always",
        action,
        type: "validation"
      })
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
        condition: "Issue can be auto-fixed",
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
