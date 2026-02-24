/**
 * Server-side agent loading
 * This file is only imported server-side to avoid bundling fs in client
 */

import fs from 'fs';
import path from 'path';
import { AgentConfig } from '@/app/components/agentbuilder/agentSimulator';

const AGENTS_CACHE_PATH = path.join(process.cwd(), '.agents-cache.json');

/**
 * Get default active agents (fallback when cache doesn't exist)
 */
function getDefaultActiveAgents(): AgentConfig[] {
  // Return a minimal set of key agents that should always be active
  // These match the pre-built agents from AgentBuilderPage
  console.log('[AgentLoader] Constructing default hardcoded agents');
  const defaults = [
    {
      name: "OCR and Field Extraction Agent",
      stage: "data-capture",
      lane: "OCR Extraction",
      mode: "auto-apply",
      prompt: "ROLE: Optical Character Recognition and Field Extraction Agent",
      skills: ["Extract text", "Verify Data"]
    },
    {
      name: "Field Normalisation Agent",
      stage: "data-capture",
      lane: "Field Normalisation",
      mode: "auto-apply",
      prompt: "ROLE: Field Normalisation Agent - standardizes extracted field values",
      skills: ["Extract Text", "Verify Data", "Process Documents"]
    },
    {
      name: "Routing approval for IT spend",
      stage: "approval",
      lane: "Approval Routing",
      mode: "auto-apply",
      prompt: `ROLE: IT Spend Approval Routing Agent - exclusively routes non-PO invoices for software and IT services to designated approver

AGENT INSTRUCTIONS:

If any non PO invoice relates to the procurement of software / IT services, route for approval to Thomas Eaton (thomas.eaton@xx.com)

OUTPUT:
- Approval routing status: Routed to IT Approver
- Assigned approver: Thomas Eaton (thomas.eaton@xx.com) for IT spend invoices
- Routing reason: "Non-PO invoice for software/IT services"`,
      skills: ["Route for Approval", "Find Vendor Information"]
    }
  ];
  
  // Log IT routing agent details for debugging
  const itAgent = defaults.find(a => a.name === "Routing approval for IT spend");
  if (itAgent) {
    console.log('[AgentLoader] IT Routing agent prompt excerpt:', itAgent.prompt.substring(0, 200));
  }
  
  return defaults;
}

/**
 * Load active agents from cache file (server-side only)
 */
export function loadActiveAgentsServer(): AgentConfig[] {
  try {
    console.log('[AgentLoader] Checking cache at:', AGENTS_CACHE_PATH);
    
    if (!fs.existsSync(AGENTS_CACHE_PATH)) {
      console.log('[AgentLoader] Cache file does not exist, using default agents');
      return getDefaultActiveAgents();
    }
    
    const data = fs.readFileSync(AGENTS_CACHE_PATH, 'utf-8');
    const agents = JSON.parse(data);
    
    console.log('[AgentLoader] Loaded agents from cache:', agents.length);
    
    if (!Array.isArray(agents)) {
      console.log('[AgentLoader] Agents data is not an array, using default agents');
      return getDefaultActiveAgents();
    }
    
    return agents;
  } catch (e) {
    console.error('[AgentLoader] Failed to load agents from cache, using default agents:', e);
    return getDefaultActiveAgents();
  }
}
