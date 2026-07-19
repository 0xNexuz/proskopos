import { eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../db";
import { userProfiles } from "../../../db/schema";
import { getCurrentUser, requireCurrentUser } from "../../current-user";
import { checkRateLimit, jsonArray } from "../../data-service";
import { googleClientId } from "../../google-session";

function serialize(row: typeof userProfiles.$inferSelect | undefined) {
  if (!row) return null;
  return { ...row, goals:jsonArray(row.goals), stacks:jsonArray(row.stacks), chains:jsonArray(row.chains), specialties:jsonArray(row.specialties) };
}

export async function GET() {
  await ensureRuntimeSchema();
  const user = await getCurrentUser();
  if (!user) return Response.json({ user:null, profile:null, authMode:"google", googleClientId:googleClientId() });
  const rows = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, user.email)).limit(1);
  return Response.json({ user, profile:serialize(rows[0]), authMode:"private-sites-session", googleClientId:googleClientId() });
}

export async function PUT(request: Request) {
  try {
    const user = await requireCurrentUser();
    if (!await checkRateLimit(`profile:${user.email}`, 20, 60_000)) return Response.json({ error:"Too many profile updates. Try again shortly." }, { status:429 });
    const body = await request.json() as Record<string, unknown>;
    const arrays = (key:string) => Array.isArray(body[key]) ? (body[key] as unknown[]).map(String).slice(0,20) : [];
    const existing = await getDb().select().from(userProfiles).where(eq(userProfiles.userId, user.email)).limit(1);
    const timestamp = new Date().toISOString();
    const value = {
      userId:user.email, displayName:String(body.displayName || user.displayName).slice(0,80),
      goals:JSON.stringify(arrays("goals")), stacks:JSON.stringify(arrays("stacks")), chains:JSON.stringify(arrays("chains")), specialties:JSON.stringify(arrays("specialties")),
      experienceLevel:String(body.experienceLevel || "Growing").slice(0,30), portfolioUrl:String(body.portfolioUrl || "").slice(0,300), minReward:Math.max(0, Number(body.minReward) || 0),
      availability:String(body.availability || "Flexible").slice(0,60), region:String(body.region || "Global").slice(0,80), scopedOnly:body.scopedOnly !== false,
      alertFrequency:String(body.alertFrequency || "Daily").slice(0,30), alertChannel:String(body.alertChannel || "In-app").slice(0,30), alertDestination:String(body.alertDestination || "").slice(0,160),
      onboardingComplete:arrays("goals").length > 0 && arrays("stacks").length > 0, createdAt:existing[0]?.createdAt || timestamp, updatedAt:timestamp,
    };
    await getDb().insert(userProfiles).values(value).onConflictDoUpdate({ target:userProfiles.userId, set:value });
    return Response.json({ user, profile:serialize(value as typeof userProfiles.$inferSelect) });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." }, { status:401 });
    return Response.json({ error:error instanceof Error ? error.message : "Unable to save profile" }, { status:500 });
  }
}
