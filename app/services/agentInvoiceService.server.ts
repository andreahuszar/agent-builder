/**
 * Server-side agent loading
 * This file is only imported server-side to avoid bundling fs in client
 */

import fs from 'fs';
import path from 'path';
import { AgentConfig } from '@/app/components/agentbuilder/agentSimulator';

const AGENTS_CACHE_PATH = path.join(process.cwd(), '.agents-cache.json');

/**
 * Load active agents from cache file (server-side only)
 */
export function loadActiveAgentsServer(): AgentConfig[] {
  try {
    console.log('[AgentLoader] Checking cache at:', AGENTS_CACHE_PATH);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agentInvoiceService.server.ts:18',message:'Cache path check',data:{path:AGENTS_CACHE_PATH,cwd:process.cwd()},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!fs.existsSync(AGENTS_CACHE_PATH)) {
      console.log('[AgentLoader] Cache file does not exist');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agentInvoiceService.server.ts:22',message:'Cache file missing',data:{exists:false},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return [];
    }
    
    const data = fs.readFileSync(AGENTS_CACHE_PATH, 'utf-8');
    const agents = JSON.parse(data);
    
    console.log('[AgentLoader] Loaded agents from cache:', agents.length);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agentInvoiceService.server.ts:30',message:'Agents loaded from cache',data:{agentCount:agents.length,isArray:Array.isArray(agents)},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!Array.isArray(agents)) {
      console.log('[AgentLoader] Agents data is not an array');
      return [];
    }
    
    return agents;
  } catch (e) {
    console.error('[AgentLoader] Failed to load agents from cache:', e);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7ce79cee-5c59-4083-8710-3081faad7e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'agentInvoiceService.server.ts:41',message:'Cache load error',data:{error:String(e),message:e instanceof Error?e.message:'unknown'},timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return [];
  }
}
