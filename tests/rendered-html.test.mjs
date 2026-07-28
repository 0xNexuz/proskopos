import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("ships the personalized retention loop", async () => {
  const [app, qualification, schema] = await Promise.all([
    source("app/proskopos-app.tsx"),
    source("app/qualification.ts"),
    source("db/schema.ts"),
  ]);

  assert.match(app, /Daily Signal/);
  assert.match(app, /Saved watches/);
  assert.match(app, /What would qualify me/);
  assert.match(app, /What happened next/);
  assert.match(app, /SCOPE WORKSPACE/);
  assert.match(app, /Security Passport/);
  assert.match(qualification, /qualificationGaps/);
  assert.match(schema, /export const watchlists/);
  assert.match(schema, /outcomeNote/);
  assert.match(schema, /passportPublic/);
});

test("keeps email delivery private and configurable", async () => {
  const [emailRoute, meRoute, passportPage] = await Promise.all([
    source("app/api/notifications/email/route.ts"),
    source("app/api/me/route.ts"),
    source("app/passport/[slug]/page.tsx"),
  ]);

  assert.match(emailRoute, /RESEND_API_KEY/);
  assert.match(emailRoute, /CRON_SECRET/);
  assert.match(emailRoute, /requireCurrentUser/);
  assert.match(emailRoute, /Permission first/);
  assert.match(meRoute, /alertDestination/);
  assert.match(passportPage, /passportPublic,true/);
  assert.doesNotMatch(passportPage, /userId/);
});

test("explains the Opportunity Edge and finds underrated public signals", async () => {
  const [app, qualification, collectors, schema, watchRoute] = await Promise.all([
    source("app/proskopos-app.tsx"),
    source("app/qualification.ts"),
    source("app/collectors.ts"),
    source("db/schema.ts"),
    source("app/api/watchlists/route.ts"),
  ]);

  assert.match(app, /Earning potential/);
  assert.match(app, /Opportunity Edge/);
  assert.match(app, /taxonomy-strip/);
  assert.match(app, /Micro-bounties/);
  assert.match(app, /Low visibility/);
  assert.match(qualification, /lead\.earningScore >= 50/);
  assert.match(qualification, /competitionConfidence/);
  assert.match(collectors, /collectGithubIssues/);
  assert.match(collectors, /permission|authorized scope/i);
  assert.match(schema, /earningBreakdown/);
  assert.match(schema, /participationRewards/);
  assert.match(schema, /weeklyHours/);
  assert.match(watchRoute, /alternativeRewardsOnly/);
  assert.match(watchRoute, /maxCompetitionLevel/);
});
test("keeps Telegram alerts private and owner opportunities server-gated", async () => {
  const [app, telegramRoute, webhookRoute, telegramService, ownerCollectors, leadsRoute, schema] = await Promise.all([
    source("app/proskopos-app.tsx"),
    source("app/api/notifications/telegram/route.ts"),
    source("app/api/telegram/webhook/route.ts"),
    source("app/telegram-alerts.ts"),
    source("app/owner-collectors.ts"),
    source("app/api/leads/route.ts"),
    source("db/schema.ts"),
  ]);

  assert.match(app, /Connect Telegram/);
  assert.match(app, /Hackathons/);
  assert.match(app, /Builder feed/);
  assert.match(telegramRoute, /CRON_SECRET/);
  assert.match(telegramRoute, /requireCurrentUser/);
  assert.match(webhookRoute, /x-telegram-bot-api-secret-token/);
  assert.match(telegramService, /OWNER_EMAIL/);
  assert.match(ownerCollectors, /collectEthGlobal/);
  assert.match(ownerCollectors, /collectDoraHacks/);
  assert.match(ownerCollectors, /collectDevpost/);
  assert.match(ownerCollectors, /collectTaikai/);
  assert.match(ownerCollectors, /collectColosseum/);
  assert.match(ownerCollectors, /collectWeb3Jobs/);
  assert.match(leadsRoute, /DoraHacks/);
  assert.match(leadsRoute, /Colosseum/);
  assert.match(leadsRoute, /ownerCategories/);
  assert.match(leadsRoute, /OWNER_EMAIL/);
  assert.match(schema, /telegramConnections/);
  assert.match(schema, /telegramLinkTokens/);
});

test("aligns owner header actions and keeps private release notes out of the README", async () => {
  const [app, styles, readme] = await Promise.all([source("app/proskopos-app.tsx"), source("app/globals.css"), source("README.md")]);
  assert.match(app, /header-tool owner-feed-button/);
  assert.match(styles, /reference-nav \.header-tool\{inline-size:118px;min-block-size:50px/);
  assert.doesNotMatch(readme, /Builder Feed/i);
});

test("loads privacy-friendly Vercel visitor analytics", async () => {
  const [layout, manifest] = await Promise.all([source("app/layout.tsx"), source("package.json")]);
  assert.match(layout, /@vercel\/analytics\/next/);
  assert.match(layout, /<Analytics \/>/);
  assert.match(manifest, /@vercel\/analytics/);
});
