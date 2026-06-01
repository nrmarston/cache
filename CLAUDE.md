# Personal Preferences

## Typescript

- never use 'any' unless 100% necessary or otherwise specified

## Commands

- Don't run dev server commands (eg. npm run dev) - assume it's already running
- Don't run build commands unless specified to do so
- Focus on checking commands

## Package managers

- use npm if the project already uses it, otherwise use pnpm
- Never use yarn

## Tech stack

- When uncertain, prefer: Tailwind, Typescript, npm, React, Better Auth, Cloudflare

## Code style

- Always strive for concise, simple solutions
- If a problem can be solved in a simpler way, propose it

## Workflow

- If asked to do much work at once, stop and state that clearly

## Agent skills

### Issue tracker

Issues and PRDs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: root `CONTEXT.md` plus root `docs/adr/` when present. See `docs/agents/domain.md`.
