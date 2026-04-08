#!/usr/bin/env node
// Preview server: use Cloudflare Wrangler when CLOUDFLARE=true, otherwise run local dev server

import { spawnSync } from 'child_process';

const useCF = (process.env.CLOUDFLARE === 'true');

if (useCF) {
  console.log('Starting Cloudflare Wrangler preview...');
  const result = spawnSync('wrangler', ['dev'], { stdio: 'inherit', shell: true });
  process.exit(result.status ?? 0);
} else {
  console.log('Starting local Vite dev server...');
  const result = spawnSync('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
  process.exit(result.status ?? 0);
}
