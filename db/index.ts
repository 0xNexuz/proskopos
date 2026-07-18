import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureRuntimeSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY NOT NULL,
      project TEXT NOT NULL,
      repo TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      stack TEXT NOT NULL,
      category TEXT NOT NULL,
      reward TEXT NOT NULL,
      funding_signal TEXT NOT NULL,
      deadline TEXT NOT NULL,
      launch_stage TEXT NOT NULL,
      existing_audits TEXT NOT NULL,
      bounty_program TEXT NOT NULL,
      contact TEXT NOT NULL,
      fit_reason TEXT NOT NULL,
      suggested_scope TEXT NOT NULL,
      outreach_draft TEXT NOT NULL,
      stage TEXT DEFAULT 'New' NOT NULL,
      score INTEGER NOT NULL,
      score_breakdown TEXT NOT NULL,
      summary TEXT NOT NULL,
      synced_at TEXT NOT NULL
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS leads_score_idx ON leads (score DESC)"),
  ]);
}
