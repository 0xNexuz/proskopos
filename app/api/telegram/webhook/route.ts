import { and, eq, gt, isNull } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../../db";
import { telegramConnections, telegramLinkTokens } from "../../../../db/schema";
import { telegramConfig, telegramRequest } from "../../../telegram-alerts";

type TelegramUpdate={message?:{text?:string;chat:{id:number|string};from?:{username?:string}}};

export async function POST(request:Request) {
  await ensureRuntimeSchema();
  const config=telegramConfig();
  if (!config.webhookSecret || request.headers.get("x-telegram-bot-api-secret-token")!==config.webhookSecret) return Response.json({error:"Unauthorized"},{status:401});
  const update=await request.json().catch(()=>({})) as TelegramUpdate;
  const match=update.message?.text?.match(/^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})/);
  if (!match || !update.message) return Response.json({ok:true});
  const token=(await getDb().select().from(telegramLinkTokens).where(and(eq(telegramLinkTokens.token,match[1]),gt(telegramLinkTokens.expiresAt,Date.now()),isNull(telegramLinkTokens.usedAt))).limit(1))[0];
  if (!token) {
    await telegramRequest("sendMessage",{chat_id:update.message.chat.id,text:"This Proskopos connection link has expired. Create a new one from Daily Signal."});
    return Response.json({ok:true});
  }
  const timestamp=new Date().toISOString();
  await getDb().insert(telegramConnections).values({userId:token.userId,chatId:String(update.message.chat.id),username:update.message.from?.username || "",active:true,connectedAt:timestamp,updatedAt:timestamp}).onConflictDoUpdate({target:telegramConnections.userId,set:{chatId:String(update.message.chat.id),username:update.message.from?.username || "",active:true,connectedAt:timestamp,updatedAt:timestamp}});
  await getDb().update(telegramLinkTokens).set({usedAt:timestamp}).where(eq(telegramLinkTokens.token,token.token));
  await telegramRequest("sendMessage",{chat_id:update.message.chat.id,text:"Proskopos is connected. Your in-app Daily Signal remains private, and Telegram alerts will follow your saved watches and profile."});
  return Response.json({ok:true});
}
