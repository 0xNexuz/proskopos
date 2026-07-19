# Proskopos

Proskopos is an explainable Web3 security opportunity radar for independent auditors. It collects official bounty and audit-contest listings, finds early public protocol signals, scores opportunity quality, and calculates personal fit from each auditor's private profile.

## What it includes

- Official listing collectors for Immunefi, Code4rena, Sherlock, and Cantina
- HackerOne directory monitoring and GitHub early-project discovery
- Separate Opportunity Quality and Personal Fit scores
- Private saved, hidden, pitched, notes, and next-action state
- Google authentication with server-side credential verification
- Permission-first evidence labels and responsible-testing guidance
- Cloudflare D1 persistence through OpenAI Sites
- A short Vercel public edge URL that proxies the stateful Sites deployment

## Local development

Requires Node.js 22.13 or later.

```bash
npm install
npm run dev
npm run build
```

The local Vinext environment simulates the declared `DB` binding. Hosted runtime values are managed outside the repository.

## Runtime configuration

- `GOOGLE_CLIENT_ID`: Google Identity Services Web application client ID
- `SESSION_SECRET`: private HMAC secret for authenticated sessions
- `DB`: Cloudflare D1 binding declared in `.openai/hosting.json`

Do not commit secrets or local environment files.

## Data model

Global opportunity evidence is stored separately from private user profiles and lead state. Drizzle schema and migrations are in `db/` and `drizzle/`.

## Responsible use

A public repository or missing security policy is never authorization to test. Use Proskopos to find and qualify opportunities, then follow the official scope, disclosure rules, and safe-harbor terms.
