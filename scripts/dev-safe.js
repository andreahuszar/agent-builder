#!/usr/bin/env node

/**
 * Safe dev server launcher
 * Ensures only one Next.js dev server runs at a time
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCK_FILE = path.join(__dirname, '..', '.next', 'dev.lock');
const PORT = process.env.PORT || 3001;

console.log('🔍 Checking for existing Next.js dev servers...');

try {
  // Kill any existing Next.js dev processes
  try {
    execSync('pkill -f "next dev"', { stdio: 'ignore' });
    console.log('✅ Cleaned up existing dev servers');
  } catch (e) {
    // No existing processes to kill
  }

  // Wait a moment for processes to terminate
  execSync('sleep 1', { stdio: 'ignore' });

  // Create .next directory if it doesn't exist
  const nextDir = path.join(__dirname, '..', '.next');
  if (!fs.existsSync(nextDir)) {
    fs.mkdirSync(nextDir, { recursive: true });
  }

  // Clean up stale lock file
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
  }

  // Create new lock file
  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    port: PORT,
    startTime: new Date().toISOString()
  }));

  console.log(`🚀 Starting Next.js dev server on port ${PORT}...`);

  // Start the dev server
  const devServer = spawn('next', ['dev', '--turbopack'], {
    stdio: 'inherit',
    env: { ...process.env, PORT }
  });

  // Cleanup on exit
  const cleanup = () => {
    console.log('\n🛑 Shutting down dev server...');
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
    devServer.kill();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  devServer.on('error', (err) => {
    console.error('❌ Dev server error:', err);
    cleanup();
  });

} catch (error) {
  console.error('❌ Failed to start dev server:', error.message);
  process.exit(1);
}
