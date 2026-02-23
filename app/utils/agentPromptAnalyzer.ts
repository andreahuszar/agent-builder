/**
 * Analyzes agent prompts to suggest appropriate stage and mode configurations
 */

export interface PromptAnalysis {
  suggestedStage: string;
  suggestedMode: 'auto-apply' | 'suggest' | 'observe';
  confidence: number;
}

// Keywords for each stage
const STAGE_KEYWORDS: Record<string, string[]> = {
  'ingestion': ['email', 'scan', 'receive', 'import', 'upload', 'inbox', 'attachment', 'document'],
  'data-capture': ['extract', 'ocr', 'read', 'capture', 'parse', 'field', 'text', 'value', 'data'],
  'verification': ['verify', 'check', 'validate', 'confirm', 'bank', 'details', 'accuracy', 'correct'],
  'matching': ['match', 'link', 'compare', 'po', 'purchase order', 'line item', 'connect', 'associate'],
  'approval': ['approve', 'route', 'assign', 'workflow', 'escalate', 'manager', 'authorization'],
  'posting': ['post', 'journal', 'gl', 'general ledger', 'accounting', 'erp', 'system']
};

// Keywords for each mode
const MODE_KEYWORDS = {
  'auto-apply': ['automatically', 'always', 'auto', 'correct', 'fix', 'apply', 'change', 'update'],
  'suggest': ['suggest', 'recommend', 'flag', 'highlight', 'propose', 'option', 'alert', 'notify'],
  'observe': ['monitor', 'track', 'report', 'log', 'audit', 'watch', 'record', 'observe']
};

/**
 * Analyzes a prompt to suggest the appropriate agent stage and mode
 */
export function analyzePromptForAgent(prompt: string): PromptAnalysis {
  const lowerPrompt = prompt.toLowerCase();
  
  // Analyze stage
  let maxStageScore = 0;
  let suggestedStage = 'data-capture'; // Default
  
  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        score++;
      }
    }
    if (score > maxStageScore) {
      maxStageScore = score;
      suggestedStage = stage;
    }
  }
  
  // Analyze mode
  let maxModeScore = 0;
  let suggestedMode: 'auto-apply' | 'suggest' | 'observe' = 'suggest'; // Default
  
  for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        score++;
      }
    }
    if (score > maxModeScore) {
      maxModeScore = score;
      suggestedMode = mode as 'auto-apply' | 'suggest' | 'observe';
    }
  }
  
  // Calculate confidence (0-1 scale)
  const totalWords = lowerPrompt.split(/\s+/).length;
  const matchedKeywords = maxStageScore + maxModeScore;
  const confidence = Math.min(matchedKeywords / Math.max(totalWords * 0.2, 1), 1);
  
  return {
    suggestedStage,
    suggestedMode,
    confidence: Math.round(confidence * 100) / 100
  };
}
