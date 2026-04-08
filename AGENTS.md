# AGENTS.md

This document provides an overview of the project structure for developers and AI agents working on this codebase.

## Project Overview

An interactive resume/portfolio application with an AI-powered assistant. Built with TanStack Start; deployed locally or to hosting of your choice.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start |
| Frontend | React 19, TanStack Router v1 |
| Build | Vite 7 |
| Styling | Tailwind CSS 4 |
| UI Components | Radix UI + custom components |
| Content | Content Collections (type-safe markdown) |
| AI | TanStack AI with multi-provider support |
| Language | TypeScript 5.7 (strict mode) |
| Deployment | Local (Netlify-free) |

## Directory Structure

```
├── public
│   ├── favicon.ico
│   ├── tanstack-circle-logo.png
│   └── tanstack-word-logo-white.svg  # TanStack wordmark logo (white) used in header/nav.
├── src
│   ├── components
│   │   ├── Header.tsx  # Header component.
│   │   └── HeaderNav.tsx  # Navigation sidebar template: mobile menu, Home link, add-on routes; EJS-driven for dynamic route generation.
│   ├── routes
│   │   ├── __root.tsx  # Root layout: Header, styles.
│   │   └── index.tsx  # Dashboard home: Bar, Line, Doughnut charts (revenue, users, sales).
│   ├── router.tsx  # TanStack Router setup: creates router from generated routeTree with scroll restoration.
│   └── styles.css  # Global styles: Tailwind import plus base body/code font styling.
├── .gitignore  # Template for .gitignore: node_modules, dist, .env, .tanstack, etc.
├── AGENTS.md  # This document provides an overview of the project structure for developers and AI agents working on this codebase.
<!-- Netlify config removed. Deploy artifacts to hosting of your choice. -->
├── package.json  # Project manifest with TanStack Start, React 19, Vite 7, Tailwind CSS 4, and Netlify plugin dependencies; defines dev and build scripts.
├── pnpm-lock.yaml
├── tsconfig.json  # TypeScript config: ES2022 target, strict mode, @/* path alias for src/*, bundler module resolution.
└── vite.config.ts  # Vite config template: TanStack Start, React, Tailwind, and optional add-on integrations; processed by EJS.
```

## Key Concepts

### File-Based Routing (TanStack Router)

Routes are defined by files in `src/routes/`:

- `__root.tsx` - Root layout wrapping all pages
- `index.tsx` - Route for `/`
- `api.*.ts` - Server API endpoints (e.g., `api.resume-chat.ts` → `/api/resume-chat`)

### Component Architecture

**UI Primitives** (`src/components/ui/`):
- Radix UI-based, Tailwind-styled
- Card, Badge, Checkbox, Separator, HoverCard

**Feature Components** (`src/components/`):
- Header, HeaderNav, ResumeAssistant

## Configuration Files

| File | Purpose |
|------|---------|
| `vite.config.ts` | Vite plugins: TanStack Start, Tailwind, Content Collections |
| `tsconfig.json` | TypeScript config with `@/*` path alias for `src/*` |
<removed Netlify config> | Netlify-specific config has been removed; deploy artifacts using your hosting of choice.
| `content-collections.ts` | Zod schemas for jobs and education frontmatter |
| `styles.css` | Tailwind imports + CSS custom properties (oklch colors) |

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Conventions

### Naming
- Components: PascalCase
- Utilities/hooks: camelCase
- Routes: kebab-case files

### Styling
- Tailwind CSS utility classes
- `cn()` helper for conditional class merging
- CSS variables for theme tokens in `styles.css`

### TypeScript
- Strict mode enabled
- Import paths use `@/` alias
- Zod for runtime validation
- Type-only imports with `type` keyword

### State Management
- React hooks for local state
- Zustand if you need it for global state
### Chart.js Dashboard

Analytics dashboard with Chart.js and react-chartjs-2.

**Dependencies:** chart.js, react-chartjs-2

**Chart types:**
- Bar - Revenue by month
- Line - User growth
- Doughnut - Sales by category

**Setup:** Register Chart.js components before use (CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler).

## Application Name

This starter uses "Application Name" as a placeholder throughout the UI and metadata. Replace it with the user's desired application name in the following locations:

### UI Components
- `src/components/Header.tsx` — app name displayed in the header
- `src/components/HeaderNav.tsx` — app name in the mobile navigation header

### SEO Metadata
- `src/routes/__root.tsx` — the `title` field in the `head()` configuration

Search for all occurrences of "Application Name" in the `src/` directory and replace with the user's application name.

## CI/CD for Cloudflare Deployment

- The repository now supports optional Cloudflare deployment via GitHub Actions.
- To enable CF deployment in CI, set the following secret in your repository: `CF_API_TOKEN` with a Cloudflare API token that has permissions to manage workers.
- The build workflow will always build artifacts first. If `CF_API_TOKEN` is present, a separate Cloudflare deployment step will run using the provided token.
- Local development should not require Cloudflare credentials unless you explicitly simulate Cloudflare deployment with `CLOUDFLARE=true` in your environment.
- To simulate CF deployment locally, set `CLOUDFLARE=true` and run `npm run deploy`; this will build (unless SKIP_BUILD is set) and deploy via Wrangler.
