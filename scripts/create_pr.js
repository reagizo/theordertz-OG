#!/usr/bin/env node
// Create a PR from the current feature branch to main via GitHub API
// Requires a GitHub token with repo scope to be available in env as GITHUB_TOKEN

(async () => {
  const owner = process.env.GITHUB_OWNER || 'reagizo';
  const repo = process.env.GITHUB_REPO || 'theordertz-OG';
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  const head = 'feat/cf-ci-pr';
  const base = 'main';
  const title = 'feat(cf): Cloudflare opt-in, env-based deploy, pre-deploy validation, and CI/CD workflow';
  const body = `## Summary
- Gate Cloudflare integration behind CLOUDFLARE flag
- Add CI/CD workflow to deploy to Cloudflare environments (staging/production)
- Add pre-deploy validation to ensure dist/server/server.js exists
- Add local preview and deployment scripts
- Update docs

## Changes
- vite.config.ts: conditional cloudflare plugin
- scripts/deploy.js: adds pre-deploy validation, env-based deploy
- scripts/preview.js: supports CF environment
- .github/workflows/cloudflare-ci.yml: workflow with environment inputs
- package.json: updated scripts
- AGENTS.md: docs

## How to test
- Locally run CLOUDFLARE=true npm run preview
- Run CLOUDFLARE=true CF_ENV=staging npm run deploy (requires wrangler and CF API token)
`;

  if (!token) {
    console.error('GitHub token not found. Please set GITHUB_TOKEN (repo-scoped) or GH_TOKEN.');
    console.error('Example: export GITHUB_TOKEN="ghp_..."');
    process.exit(2);
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
  const payload = {
    title,
    head,
    base,
    body,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to create PR:', res.status, err.message || err);
      process.exit(res.status);
    }

    const data = await res.json();
    console.log(`PR created: ${data.html_url}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating PR:', err?.message || err);
    process.exit(1);
  }
})();
