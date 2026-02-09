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
    
    if (!fs.existsSync(AGENTS_CACHE_PATH)) {
      console.log('[AgentLoader] Cache file does not exist');
      return [];
    }
    
    const data = fs.readFileSync(AGENTS_CACHE_PATH, 'utf-8');
    const agents = JSON.parse(data);
    
    console.log('[AgentLoader] Loaded agents from cache:', agents.length);
    
    if (!Array.isArray(agents)) {
      console.log('[AgentLoader] Agents data is not an array');
      return [];
    }
    
    return agents;
  } catch (e) {
    console.error('[AgentLoader] Failed to load agents from cache:', e);
    return [];
  }
}
