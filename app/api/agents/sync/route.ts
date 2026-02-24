import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const AGENTS_CACHE_PATH = path.join(process.cwd(), '.agents-cache.json');

/**
 * POST /api/agents/sync
 * Sync active agents from client to server for invoice generation
 */
export async function POST(request: NextRequest) {
  try {
    const { agents } = await request.json();
    
    // #region agent log
    const logPath = '/Users/xelix/Desktop/XIP/xelix-inv-processing-full-poc/.cursor/debug-b66162.log';
    const logEntry = JSON.stringify({sessionId:'b66162',location:'route.ts:14',message:'Sync endpoint received agents',data:{agentCount:agents?.length,isArray:Array.isArray(agents),stages:Array.isArray(agents)?agents.reduce((acc,a)=>{acc[a.stage]=(acc[a.stage]||0)+1;return acc;},{}):{}},timestamp:Date.now(),hypothesisId:'D'}) + '\n';
    try { fs.appendFileSync(logPath, logEntry); } catch {}
    // #endregion
    
    if (!Array.isArray(agents)) {
      return NextResponse.json(
        { error: 'Invalid agents data' },
        { status: 400 }
      );
    }
    
    // Write agents to cache file
    fs.writeFileSync(AGENTS_CACHE_PATH, JSON.stringify(agents, null, 2));
    
    // #region agent log
    try { fs.appendFileSync(logPath, JSON.stringify({sessionId:'b66162',location:'route.ts:30',message:'Agents written to cache file',data:{agentCount:agents.length,cacheFilePath:AGENTS_CACHE_PATH},timestamp:Date.now(),hypothesisId:'D'}) + '\n'); } catch {}
    // #endregion
    
    return NextResponse.json({ success: true, count: agents.length });
  } catch (error) {
    console.error('Error syncing agents:', error);
    return NextResponse.json(
      { error: 'Failed to sync agents' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/sync
 * Get cached agents
 */
export async function GET() {
  try {
    if (!fs.existsSync(AGENTS_CACHE_PATH)) {
      return NextResponse.json({ agents: [] });
    }
    
    const data = fs.readFileSync(AGENTS_CACHE_PATH, 'utf-8');
    const agents = JSON.parse(data);
    
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error reading agents cache:', error);
    return NextResponse.json({ agents: [] });
  }
}
