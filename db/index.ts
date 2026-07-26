import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return drizzle(env.DB, { schema });
}

export async function ensureRuntimeSchema() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  const statements = [
    `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY NOT NULL, project TEXT NOT NULL, repo TEXT NOT NULL, source TEXT NOT NULL, source_url TEXT NOT NULL, discovered_at TEXT NOT NULL, stack TEXT NOT NULL, category TEXT NOT NULL, reward TEXT NOT NULL, funding_signal TEXT NOT NULL, deadline TEXT NOT NULL, launch_stage TEXT NOT NULL, existing_audits TEXT NOT NULL, bounty_program TEXT NOT NULL, contact TEXT NOT NULL, fit_reason TEXT NOT NULL, suggested_scope TEXT NOT NULL, outreach_draft TEXT NOT NULL, stage TEXT DEFAULT 'New' NOT NULL, score INTEGER NOT NULL, score_breakdown TEXT NOT NULL, summary TEXT NOT NULL, evidence_confidence TEXT DEFAULT 'inferred' NOT NULL, evidence_note TEXT DEFAULT '' NOT NULL, topics TEXT DEFAULT '[]' NOT NULL, technologies TEXT DEFAULT '[]' NOT NULL, ecosystem TEXT DEFAULT 'Multi-chain' NOT NULL, source_tier TEXT DEFAULT 'Major' NOT NULL, reward_paths TEXT DEFAULT '[]' NOT NULL, difficulty TEXT DEFAULT 'Intermediate' NOT NULL, competition_level TEXT DEFAULT 'Unknown' NOT NULL, competition_confidence TEXT DEFAULT 'unknown' NOT NULL, visibility_level TEXT DEFAULT 'Unknown' NOT NULL, winner_count INTEGER DEFAULT 0 NOT NULL, participation_rewards INTEGER DEFAULT 0 NOT NULL, earning_score INTEGER DEFAULT 0 NOT NULL, earning_breakdown TEXT DEFAULT '{}' NOT NULL, synced_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS leads_score_idx ON leads (score DESC)`,
    `CREATE TABLE IF NOT EXISTS user_profiles (user_id TEXT PRIMARY KEY NOT NULL, display_name TEXT NOT NULL, goals TEXT DEFAULT '[]' NOT NULL, stacks TEXT DEFAULT '[]' NOT NULL, chains TEXT DEFAULT '[]' NOT NULL, specialties TEXT DEFAULT '[]' NOT NULL, tools TEXT DEFAULT '[]' NOT NULL, experience_level TEXT DEFAULT 'Growing' NOT NULL, portfolio_url TEXT DEFAULT '' NOT NULL, min_reward INTEGER DEFAULT 0 NOT NULL, availability TEXT DEFAULT 'Flexible' NOT NULL, weekly_hours INTEGER DEFAULT 10 NOT NULL, difficulty_preference TEXT DEFAULT 'Any' NOT NULL, participation_mode TEXT DEFAULT 'Either' NOT NULL, region TEXT DEFAULT 'Global' NOT NULL, scoped_only INTEGER DEFAULT 1 NOT NULL, alert_frequency TEXT DEFAULT 'Daily' NOT NULL, alert_channel TEXT DEFAULT 'In-app' NOT NULL, alert_destination TEXT DEFAULT '' NOT NULL, passport_headline TEXT DEFAULT 'Independent Web3 security researcher' NOT NULL, passport_bio TEXT DEFAULT '' NOT NULL, passport_slug TEXT DEFAULT '' NOT NULL, passport_public INTEGER DEFAULT 0 NOT NULL, github_url TEXT DEFAULT '' NOT NULL, audit_report_urls TEXT DEFAULT '[]' NOT NULL, onboarding_complete INTEGER DEFAULT 0 NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_lead_state (user_id TEXT NOT NULL, lead_id TEXT NOT NULL, saved INTEGER DEFAULT 0 NOT NULL, hidden INTEGER DEFAULT 0 NOT NULL, pitched_at TEXT, notes TEXT DEFAULT '' NOT NULL, next_action_at TEXT, outcome TEXT DEFAULT '' NOT NULL, outcome_note TEXT DEFAULT '' NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id, lead_id))`,
    `CREATE TABLE IF NOT EXISTS watchlists (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, name TEXT NOT NULL, stacks TEXT DEFAULT '[]' NOT NULL, categories TEXT DEFAULT '[]' NOT NULL, min_reward INTEGER DEFAULT 0 NOT NULL, verified_only INTEGER DEFAULT 0 NOT NULL, low_visibility_only INTEGER DEFAULT 0 NOT NULL, alternative_rewards_only INTEGER DEFAULT 0 NOT NULL, max_competition_level TEXT DEFAULT 'Any' NOT NULL, deadline_days INTEGER DEFAULT 0 NOT NULL, active INTEGER DEFAULT 1 NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS watchlists_user_idx ON watchlists (user_id, active)`,
    `CREATE TABLE IF NOT EXISTS telegram_connections (user_id TEXT PRIMARY KEY NOT NULL, chat_id TEXT NOT NULL, username TEXT DEFAULT '' NOT NULL, active INTEGER DEFAULT 1 NOT NULL, connected_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS telegram_link_tokens (token TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS notification_log (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, item_count INTEGER DEFAULT 0 NOT NULL, detail TEXT DEFAULT '' NOT NULL, sent_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sync_state (source TEXT PRIMARY KEY NOT NULL, last_synced_at TEXT NOT NULL, status TEXT NOT NULL, item_count INTEGER DEFAULT 0 NOT NULL, error TEXT)`,
    `CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY NOT NULL, window_start INTEGER NOT NULL, count INTEGER DEFAULT 0 NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS feedback (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL)`,
  ];
  for (const sql of statements) await env.DB.prepare(sql).run();
  for (const sql of [
    `ALTER TABLE leads ADD COLUMN evidence_confidence TEXT DEFAULT 'inferred' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN evidence_note TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN topics TEXT DEFAULT '[]' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN technologies TEXT DEFAULT '[]' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN ecosystem TEXT DEFAULT 'Multi-chain' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN source_tier TEXT DEFAULT 'Major' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN reward_paths TEXT DEFAULT '[]' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN difficulty TEXT DEFAULT 'Intermediate' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN competition_level TEXT DEFAULT 'Unknown' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN competition_confidence TEXT DEFAULT 'unknown' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN visibility_level TEXT DEFAULT 'Unknown' NOT NULL`,
    `ALTER TABLE leads ADD COLUMN winner_count INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE leads ADD COLUMN participation_rewards INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE leads ADD COLUMN earning_score INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE leads ADD COLUMN earning_breakdown TEXT DEFAULT '{}' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN tools TEXT DEFAULT '[]' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN weekly_hours INTEGER DEFAULT 10 NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN difficulty_preference TEXT DEFAULT 'Any' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN participation_mode TEXT DEFAULT 'Either' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN passport_headline TEXT DEFAULT 'Independent Web3 security researcher' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN passport_bio TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN passport_slug TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN passport_public INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN github_url TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE user_profiles ADD COLUMN audit_report_urls TEXT DEFAULT '[]' NOT NULL`,
    `ALTER TABLE user_lead_state ADD COLUMN outcome TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE user_lead_state ADD COLUMN outcome_note TEXT DEFAULT '' NOT NULL`,
    `ALTER TABLE watchlists ADD COLUMN low_visibility_only INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE watchlists ADD COLUMN alternative_rewards_only INTEGER DEFAULT 0 NOT NULL`,
    `ALTER TABLE watchlists ADD COLUMN max_competition_level TEXT DEFAULT 'Any' NOT NULL`,
    `ALTER TABLE watchlists ADD COLUMN deadline_days INTEGER DEFAULT 0 NOT NULL`,
  ]) {
    try { await env.DB.prepare(sql).run(); } catch { /* Existing production column. */ }
  }
}
