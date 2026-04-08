#!/usr/bin/env node
// Conditional Cloudflare deployment script
// Deploy only when CLOUDFLARE env var is set to "true"

const { spawnSync } = require('child_process');
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

console.log('Starting Cloudflare deployment...');
const result = spawnSync('wrangler', ['deploy'], { stdio: 'inherit', shell: true });
process.exit(result.status ?? 0);
