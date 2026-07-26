import { and, desc, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../db";
import { watchlists } from "../../../db/schema";
import { requireCurrentUser } from "../../current-user";
import { checkRateLimit, jsonArray } from "../../data-service";

const serialize = (row: typeof watchlists.$inferSelect) => ({ ...row, stacks:jsonArray(row.stacks), categories:jsonArray(row.categories) });

export async function GET() {
  try {
    await ensureRuntimeSchema();
    const user = await requireCurrentUser();
    const rows = await getDb().select().from(watchlists).where(eq(watchlists.userId,user.email)).orderBy(desc(watchlists.updatedAt));
    return Response.json({ watchlists:rows.map(serialize) });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." },{status:401});
    return Response.json({ error:"Unable to load watchlists." },{status:500});
  }
}

export async function POST(request:Request) {
  try {
    await ensureRuntimeSchema();
    const user = await requireCurrentUser();
    if (!await checkRateLimit(`watchlists:${user.email}`,20,60_000)) return Response.json({error:"Too many watchlist changes."},{status:429});
    const body = await request.json() as Record<string,unknown>;
    const values = (key:string) => Array.isArray(body[key]) ? (body[key] as unknown[]).map(String).slice(0,12) : [];
    const timestamp = new Date().toISOString();
    const row = {
      id:String(body.id || crypto.randomUUID()).slice(0,80), userId:user.email,
      name:String(body.name || "My watch").trim().slice(0,80) || "My watch",
      stacks:JSON.stringify(values("stacks")), categories:JSON.stringify(values("categories")),
      minReward:Math.max(0,Number(body.minReward)||0), verifiedOnly:body.verifiedOnly===true,
      lowVisibilityOnly:body.lowVisibilityOnly===true, alternativeRewardsOnly:body.alternativeRewardsOnly===true,
      maxCompetitionLevel:String(body.maxCompetitionLevel || "Any").slice(0,20), deadlineDays:Math.min(365,Math.max(0,Number(body.deadlineDays)||0)),
      active:body.active!==false, createdAt:timestamp, updatedAt:timestamp,
    };
    await getDb().insert(watchlists).values(row).onConflictDoUpdate({target:watchlists.id,set:{...row,userId:user.email}});
    return Response.json({ watchlist:serialize(row as typeof watchlists.$inferSelect) });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." },{status:401});
    return Response.json({ error:error instanceof Error?error.message:"Unable to save watchlist." },{status:500});
  }
}

export async function DELETE(request:Request) {
  try {
    await ensureRuntimeSchema();
    const user = await requireCurrentUser();
    const id=new URL(request.url).searchParams.get("id")||"";
    await getDb().delete(watchlists).where(and(eq(watchlists.id,id),eq(watchlists.userId,user.email)));
    return Response.json({ok:true});
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." },{status:401});
    return Response.json({error:"Unable to remove watchlist."},{status:500});
  }
}
