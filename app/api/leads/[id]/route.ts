import { and, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../../db";
import { leads, userLeadState } from "../../../../db/schema";
import { requireCurrentUser } from "../../../current-user";
import { checkRateLimit } from "../../../data-service";

export async function PATCH(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    await ensureRuntimeSchema();
    const user = await requireCurrentUser();
    if (!await checkRateLimit(`lead-state:${user.email}`, 80, 60_000)) return Response.json({ error:"Too many updates. Try again shortly." }, { status:429 });
    const { id } = await context.params;
    const lead = await getDb().select({ id:leads.id }).from(leads).where(eq(leads.id,id)).limit(1);
    if (!lead[0]) return Response.json({ error:"Opportunity not found" }, { status:404 });
    const body = await request.json() as Record<string, unknown>;
    const existing = await getDb().select().from(userLeadState).where(and(eq(userLeadState.userId,user.email),eq(userLeadState.leadId,id))).limit(1);
    const value = {
      userId:user.email, leadId:id,
      saved:typeof body.saved === "boolean" ? body.saved : existing[0]?.saved || false,
      hidden:typeof body.hidden === "boolean" ? body.hidden : existing[0]?.hidden || false,
      pitchedAt:typeof body.pitched === "boolean" ? (body.pitched ? new Date().toISOString() : null) : existing[0]?.pitchedAt || null,
      notes:typeof body.notes === "string" ? body.notes.slice(0,3000) : existing[0]?.notes || "",
      nextActionAt:typeof body.nextActionAt === "string" && body.nextActionAt ? body.nextActionAt.slice(0,40) : body.nextActionAt === null ? null : existing[0]?.nextActionAt || null,
      outcome:typeof body.outcome === "string" ? body.outcome.slice(0,40) : existing[0]?.outcome || "",
      outcomeNote:typeof body.outcomeNote === "string" ? body.outcomeNote.slice(0,500) : existing[0]?.outcomeNote || "",
      updatedAt:new Date().toISOString(),
    };
    await getDb().insert(userLeadState).values(value).onConflictDoUpdate({ target:[userLeadState.userId,userLeadState.leadId], set:value });
    return Response.json({ userState:value });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." }, { status:401 });
    return Response.json({ error:error instanceof Error ? error.message : "Unable to update opportunity" }, { status:500 });
  }
}
