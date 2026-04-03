---
name: local-auth-tutorial
description: Local authentication workflow for development without Netlify Identity.
---

# Local Authentication (Development) for TanStack Start

This guide provides a Netlify-free, local mock authentication workflow for development. It covers a simple login/logout and role-based access using a minimal client-side store, so you can test admin/auth flows without Netlify Identity.

> Local development note: Netlify Identity is not used. A mock local authentication flow is provided for testing and development.

## Overview

This tutorial outlines how to run and test the admin onboarding flow using the local mock authentication already implemented in the project (src/lib/auth.ts).

## Prerequisites

- The app runs locally without Netlify. No Netlify Identity or related services are required.

## How to use

- Admin credentials: rkaijage@gmail.com / @Eva0191!
- Admin panel: /admin
- Registration for agents/customers: /register/agent and /register/customer
- Admin approves registrations from /admin; approved accounts are created in the mock store

## Seed/Onboarding notes
- Seed and approve data directly via /admin (Seed Demo Data)
- Reset demo data via /admin (Reset Demo Data)

## Files touched in this approach
- src/lib/auth.ts (local mock auth)
- src/routes/admin.tsx (admin panel with logs + seed/approve)
- src/routes/register-agent.tsx
- src/routes/register-customer.tsx
- src/routes/login.tsx
- src/components/AuthProvider.tsx
