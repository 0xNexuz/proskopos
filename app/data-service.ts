import { desc, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../db";
import { leads, rateLimits, syncState } from "../db/schema";
import { collectAll } from "./collectors";

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  await ensureRuntimeSchema();
  const db = getDb();
  const current = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
  const timestamp = Date.now();
  if (!current[0] || timestamp - current[0].windowStart >= windowMs) {
    await db.insert(rateLimits).values({ key, windowStart:timestamp, count:1 }).onConflictDoUpdate({ target:rateLimits.key, set:{ windowStart:timestamp, count:1 } });
    return true;
  }
  if (current[0].count >= limit) return false;
  await db.update(rateLimits).set({ count:current[0].count + 1 }).where(eq(rateLimits.key, key));
  return true;
}

export async function refreshLeads() {
  await ensureRuntimeSchema();
  const db = getDb();
  const results = await collectAll();
  for (const result of results) {
    for (const row of result.rows) {
      const { id:_, stage:__, ...fresh } = row;
      await db.insert(leads).values(row).onConflictDoUpdate({ target:leads.id, set:fresh });
    }
    await db.insert(syncState).values({ source:result.source, lastSyncedAt:new Date().toISOString(), status:result.error ? "partial" : "ok", itemCount:result.rows.length, error:result.error }).onConflictDoUpdate({ target:syncState.source, set:{ lastSyncedAt:new Date().toISOString(), status:result.error ? "partial" : "ok", itemCount:result.rows.length, error:result.error } });
  }
  return results;
}

export async function ensureFreshLeads() {
  await ensureRuntimeSchema();
  const db = getDb();
  const state = await db.select().from(syncState).orderBy(desc(syncState.lastSyncedAt)).limit(1);
  const stale = !state[0] || Date.now() - new Date(state[0].lastSyncedAt).getTime() > 6 * 60 * 60 * 1000;
  if (stale) await refreshLeads();
}

export function jsonArray(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}
