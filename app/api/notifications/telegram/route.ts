import { and, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../../db";
import { telegramConnections, telegramLinkTokens, userProfiles } from "../../../../db/schema";
import { requireCurrentUser } from "../../../current-user";
import { checkRateLimit } from "../../../data-service";
import { sendTelegramSignal, telegramConfig } from "../../../telegram-alerts";

const publicStatus = (connection:typeof telegramConnections.$inferSelect | undefined) => {
  const config=telegramConfig();
  return { configured:Boolean(config.token&&config.username&&config.webhookSecret), botUsername:config.username, connected:Boolean(connection?.active), username:connection?.username || "" };
};

export async function GET(request:Request) {
  try {
    await ensureRuntimeSchema();
    const secret=String(process.env.CRON_SECRET || "");
    if (secret && request.headers.get("authorization") === `Bearer ${secret}`) {
      const weekday=new Date().getUTCDay();
      const profiles=(await getDb().select().from(userProfiles)).filter((profile) => profile.alertChannel.includes("Telegram") && (profile.alertFrequency==="Daily" || profile.alertFrequency==="Instant" || (profile.alertFrequency==="Weekly" && weekday===1)));
      let sent=0;
      for (const profile of profiles) {
        const connection=(await getDb().select().from(telegramConnections).where(and(eq(telegramConnections.userId,profile.userId),eq(telegramConnections.active,true))).limit(1))[0];
        if (!connection) continue;
        try { await sendTelegramSignal(profile.userId,profile,connection.chatId); sent+=1; } catch { /* One connection should not stop the digest. */ }
      }
      return Response.json({ok:true,sent});
    }
    const user=await requireCurrentUser();
    const connection=(await getDb().select().from(telegramConnections).where(eq(telegramConnections.userId,user.email)).limit(1))[0];
    return Response.json(publicStatus(connection));
  } catch (error) {
    if (error instanceof Error && error.message==="AUTH_REQUIRED") return Response.json({error:"Sign in is required."},{status:401});
    return Response.json({error:"Unable to load Telegram alerts."},{status:500});
  }
}

export async function POST(request:Request) {
  try {
    await ensureRuntimeSchema();
    const user=await requireCurrentUser();
    if (!await checkRateLimit(`telegram:${user.email}`,8,60*60_000)) return Response.json({error:"Telegram action limit reached."},{status:429});
    const body=await request.json().catch(()=>({})) as {action?:string};
    const config=telegramConfig();
    if (!config.token || !config.username || !config.webhookSecret) return Response.json({error:"Telegram alerts are awaiting bot configuration.",configurationRequired:true},{status:503});
    if (body.action==="link") {
      const token=crypto.randomUUID().replaceAll("-","");
      await getDb().insert(telegramLinkTokens).values({token,userId:user.email,expiresAt:Date.now()+15*60_000,usedAt:null});
      return Response.json({link:`https://t.me/${config.username}?start=${token}`,expiresInMinutes:15});
    }
    if (body.action==="preview") {
      const [profile,connection]=await Promise.all([
        getDb().select().from(userProfiles).where(eq(userProfiles.userId,user.email)).limit(1),
        getDb().select().from(telegramConnections).where(and(eq(telegramConnections.userId,user.email),eq(telegramConnections.active,true))).limit(1),
      ]);
      if (!connection[0]) return Response.json({error:"Connect Telegram first."},{status:400});
      if (!profile[0]) return Response.json({error:"Complete your profile first."},{status:400});
      const result=await sendTelegramSignal(user.email,profile[0],connection[0].chatId,true);
      return Response.json({ok:true,...result});
    }
    return Response.json({error:"Unknown Telegram action."},{status:400});
  } catch (error) {
    if (error instanceof Error && error.message==="AUTH_REQUIRED") return Response.json({error:"Sign in is required."},{status:401});
    return Response.json({error:error instanceof Error&&error.message.startsWith("TELEGRAM_")?"Telegram could not deliver the alert.":"Unable to update Telegram alerts."},{status:500});
  }
}

export async function DELETE() {
  try {
    await ensureRuntimeSchema();
    const user=await requireCurrentUser();
    await getDb().update(telegramConnections).set({active:false,updatedAt:new Date().toISOString()}).where(eq(telegramConnections.userId,user.email));
    return Response.json({ok:true});
  } catch (error) {
    if (error instanceof Error && error.message==="AUTH_REQUIRED") return Response.json({error:"Sign in is required."},{status:401});
    return Response.json({error:"Unable to disconnect Telegram."},{status:500});
  }
}
