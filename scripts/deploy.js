#!/usr/bin/env node
// Conditional Cloudflare deployment script
// Deploy only when CLOUDFLARE env var is set to "true"

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const useCF = (process.env.CLOUDFLARE === 'true');

if (!useCF) {
  console.log('Cloudflare deployment skipped: CLOUDFLARE is not set to true.');
  process.exit(0);
}

// Optionally skip local build if already produced by CI (default behavior is to build)
if (process.env.SKIP_BUILD !== 'true') {
  console.log('Building project before deployment...');
  const buildRes = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true });
  if (buildRes.status && buildRes.status !== 0) {
    console.error('Build failed. Aborting deployment.');
    process.exit(buildRes.status);
  }
}

// Pre-deployment validation: ensure Cloudflare main entry exists for Wrangler
const mainPath = path.resolve('dist/server/server.js');
if (!fs.existsSync(mainPath)) {
  console.error(`Error: Expected Cloudflare main entry not found at ${mainPath}. Ensure the build outputs dist/server/server.js`);
  process.exit(1);
}

console.log('Starting Cloudflare deployment...');
const cfEnv = process.env.CF_ENV || 'production';
const result = spawnSync('wrangler', ['deploy', '--env', cfEnv], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
