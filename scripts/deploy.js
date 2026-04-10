#!/usr/bin/env node
// Conditional Cloudflare deployment script
// Deploy only when CLOUDFLARE env var is set to "true"

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const useCF = (process.env.CLOUDFLARE === 'true');

if (!useCF) {
  console.log('Cloudflare deployment skipped: CLOUDFLARE is not set to true.');
  process.exit(0);
}

// Build without cloudflare plugin - normal vite build creates dist/server/server.js
// This build uses env vars from the environment (set in CI or local)
if (process.env.SKIP_BUILD !== 'true') {
  console.log('Building project for Cloudflare deployment...');
  
  // Debug: log what we're passing
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  console.log('VITE_SUPABASE_URL:', supabaseUrl || '(not set)');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '(set)' : '(not set)');
  
  // Build with explicit env vars passed to the process
  const buildEnv = {
    ...process.env,
    CLOUDFLARE: 'false',
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey,
  };
  
  const buildRes = spawnSync('npm', ['run', 'build'], { 
    stdio: 'inherit', 
    shell: true, 
    env: buildEnv,
    windowsHide: false
  });
  if (buildRes.status && buildRes.status !== 0) {
    console.error('Build failed. Aborting deployment.');
    process.exit(buildRes.status);
  }
}

const mainPath = path.resolve('dist/server/server.js');
if (!fs.existsSync(mainPath)) {
  console.error(`Error: Expected server entry not found at ${mainPath}.`);
  process.exit(1);
}

const cfEnv = process.env.CF_ENV || 'production';

console.log('Starting Cloudflare deployment...');
const result = spawnSync('wrangler', ['deploy', '--env', cfEnv], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
