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

// Determine Cloudflare environment up front for pre-deploy steps
const cfEnv = process.env.CF_ENV || 'production';
// If Cloudflare is enabled, perform a dedicated build step to catch compile errors early
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
