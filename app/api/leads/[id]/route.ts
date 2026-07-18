import { eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../../db";
import { leads } from "../../../../db/schema";

const stages = ["New", "Qualified", "Contacted", "Replied", "Won", "Lost"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json() as { stage?: string };
    if (!payload.stage || !stages.includes(payload.stage)) return Response.json({ error:"Invalid stage" }, { status:400 });
    await ensureRuntimeSchema();
    const db = getDb();
    await db.update(leads).set({ stage:payload.stage }).where(eq(leads.id, id));
    return Response.json({ ok:true });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "Unable to update lead" }, { status:500 });
  }
}
