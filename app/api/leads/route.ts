import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads, syncState, userLeadState, userProfiles } from "../../../db/schema";
import { getCurrentUser, requireCurrentUser } from "../../current-user";
import { calculateFit } from "../../qualification";
import { checkRateLimit, ensureFreshLeads, jsonArray, refreshLeads } from "../../data-service";

const profileShape = (row: typeof userProfiles.$inferSelect | undefined) => row ? { ...row, goals:jsonArray(row.goals), stacks:jsonArray(row.stacks), chains:jsonArray(row.chains), specialties:jsonArray(row.specialties) } : null;

export async function GET() {
  try {
    await ensureFreshLeads();
    const db = getDb();
    const user = await getCurrentUser();
    const [rows, states, profileRows, sourceState] = await Promise.all([
      db.select().from(leads).orderBy(desc(leads.score), desc(leads.syncedAt)).limit(150),
      user ? db.select().from(userLeadState).where(eq(userLeadState.userId, user.email)) : Promise.resolve([]),
      user ? db.select().from(userProfiles).where(eq(userProfiles.userId, user.email)).limit(1) : Promise.resolve([]),
      db.select().from(syncState).orderBy(desc(syncState.lastSyncedAt)),
    ]);
    const profile = profileShape(profileRows[0]);
    const stateMap = new Map(states.map((state) => [state.leadId, state]));
    const result = rows.map((row) => {
      const qualityBreakdown = (() => { try { return JSON.parse(row.scoreBreakdown); } catch { return {}; } })();
      return { ...row, qualityScore:row.score, qualityBreakdown, ...calculateFit(row, profile), userState:stateMap.get(row.id) || { saved:false, hidden:false, pitchedAt:null, notes:"", nextActionAt:null } };
    });
    return Response.json({ leads:result, profile, sources:sourceState, lastSynced:sourceState[0]?.lastSyncedAt || null, autoRefresh:"Traffic-triggered every 6 hours" });
  } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to load opportunities" }, { status:500 }); }
}

export async function POST() {
  try {
    const user = await requireCurrentUser();
    if (!await checkRateLimit(`sync:${user.email}`, 3, 15 * 60_000)) return Response.json({ error:"Sync limit reached. Automatic refresh will continue in the background." }, { status:429 });
    const results = await refreshLeads();
    return Response.json({ added:results.reduce((sum, result) => sum + result.rows.length, 0), sources:results.map(({source,rows,error}) => ({ source, count:rows.length, error })), lastSynced:new Date().toISOString() });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." }, { status:401 });
    return Response.json({ error:error instanceof Error ? error.message : "Unable to sync" }, { status:500 });
  }
}
