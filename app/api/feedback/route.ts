import { ensureRuntimeSchema, getDb } from "../../../db";
import { feedback } from "../../../db/schema";
import { requireCurrentUser } from "../../current-user";
import { checkRateLimit } from "../../data-service";

export async function POST(request: Request) {
  try {
    await ensureRuntimeSchema();
    const user = await requireCurrentUser();
    if (!await checkRateLimit(`feedback:${user.email}`, 5, 60 * 60_000)) return Response.json({ error:"Feedback limit reached." }, { status:429 });
    const body = await request.json() as { message?:string };
    const message = String(body.message || "").trim().slice(0,3000);
    if (message.length < 3) return Response.json({ error:"Please add a little more detail." }, { status:400 });
    await getDb().insert(feedback).values({ id:crypto.randomUUID(), userId:user.email, message, createdAt:new Date().toISOString() });
    return Response.json({ ok:true });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error:"Sign in is required." }, { status:401 });
    return Response.json({ error:"Unable to send feedback" }, { status:500 });
  }
}
