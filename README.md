# Proskopos

Proskopos is an explainable Web3 security opportunity radar for independent auditors. It combines major bounty and audit-contest coverage with early public protocol and micro-bounty signals, then ranks each opportunity by quality, personal fit, and realistic earning potential.

## What it includes

- Official listing collectors for Immunefi, Code4rena, Sherlock, and Cantina
- HackerOne directory monitoring, GitHub early-project discovery, and public GitHub security-issue signals
- Three explainable scores: Opportunity Quality, Personal Fit, and Earning Potential (Opportunity Edge)
- Structured opportunity tags for type, topic, ecosystem, technology, reward path, difficulty, visibility, and competition
- Personalized matching from stacks, chains, specialties, tools, experience, weekly availability, difficulty preference, region, and solo/team preference
- Alternative-reward discovery for multiple payouts, contributor rewards, and other non-winner-takes-all paths when supported by evidence
- Private saved, hidden, pitched, notes, next-action, and optional outcome learning
- Daily Signal watchlists with low-visibility, competition, evidence, reward-path, stack, and budget filters
- In-app Daily Signal with saved watches and secure Telegram previews, daily digests, and disconnect controls
- Optional email delivery for operators with a verified sender domain
- A distinctive, opt-in public Security Passport and scope workspace
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
- `RESEND_API_KEY`: Resend API key used for email delivery
- `EMAIL_FROM`: verified sender, for example `Proskopos <signals@example.com>`
- `CRON_SECRET`: shared secret protecting scheduled digest runs
- `TELEGRAM_BOT_TOKEN`: secret token created with Telegram's `@BotFather`
- `TELEGRAM_BOT_USERNAME`: public bot username without the leading `@`
- `TELEGRAM_WEBHOOK_SECRET`: long private value used to authenticate Telegram webhook requests

Do not commit secrets or local environment files.

### Email setup

1. Create a Resend account and verify a domain or sending subdomain.
2. Create a Sending access API key and save it as `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a sender on the verified domain, such as `Proskopos <signals@updates.example.com>`.
4. Generate a long random value for `CRON_SECRET`; it is created by the operator, not supplied by Resend.
5. Add all three values to the hosted production environment and redeploy the saved site version.

`CRON_SECRET` protects `GET /api/notifications/email`, which is intended to be called by a scheduler using `Authorization: Bearer <CRON_SECRET>`. The in-app **Send email preview** action uses the signed-in user's session and does not require that header.

Keep `RESEND_API_KEY` and `CRON_SECRET` secret. Use a restricted Sending access key rather than Full access.

### Telegram setup

1. Open `@BotFather` in Telegram, run `/newbot`, and copy the bot token and username.
2. Save the token as the secret `TELEGRAM_BOT_TOKEN` and the username as `TELEGRAM_BOT_USERNAME`.
3. Generate a long random `TELEGRAM_WEBHOOK_SECRET` and save it as a secret.
4. Register `https://proskopos-audit-radar.elllbest7.chatgpt.site/api/telegram/webhook` with Telegram's `setWebhook` method and pass the same value as `secret_token`.
5. Redeploy, open **Daily Signal**, choose **Connect Telegram**, then start the bot from the one-time link.

Scheduled Telegram delivery calls `GET /api/notifications/telegram` with `Authorization: Bearer <CRON_SECRET>`. Users must start the bot before Telegram permits it to message them. The in-app briefing works without Telegram or email credentials.

## Data model

Global opportunity evidence is stored separately from private user profiles and lead state. Drizzle schema and migrations are in `db/` and `drizzle/`.

## Responsible use

A public repository or missing security policy is never authorization to test. Use Proskopos to find and qualify opportunities, then follow the official scope, disclosure rules, and safe-harbor terms.
