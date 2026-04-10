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
if (process.env.SKIP_BUILD !== 'true') {
  console.log('Building project for Cloudflare deployment...');
  const buildRes = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true, 
    env: { ...process.env, CLOUDFLARE: 'false' } });  // Build without CF plugin
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
if (cfEnv === 'production' || cfEnv === 'staging') {
  console.log('Running Wrangler build to validate Cloudflare bundle...');
  const wranglerBuild = spawnSync('wrangler', ['build'], { stdio: 'inherit', shell: true });
  if (wranglerBuild.status && wranglerBuild.status !== 0) {
    console.error('Wrangler build failed. Aborting deployment.');
    process.exit(wranglerBuild.status);
  }
}

console.log('Starting Cloudflare deployment...');
const result = spawnSync('wrangler', ['deploy', '--env', cfEnv], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
