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
