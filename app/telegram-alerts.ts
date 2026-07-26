import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { leads, notificationLog, userProfiles, watchlists } from "../db/schema";
import { calculateFit } from "./qualification";
import { jsonArray } from "./data-service";

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character] || character));
const rewardNumber = (value:string) => Number((value.match(/[\d,.]+/)?.[0] || "0").replaceAll(",", ""));
const competitionRank:Record<string,number> = { Low:1, Moderate:2, High:3, Unknown:4 };
const withinDays = (deadline:string, days:number) => {
  if (!days) return true;
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return false;
  const left = Math.ceil((date.getTime() - Date.now()) / 86400000);
  return left >= 0 && left <= days;
};
const profileShape = (row:typeof userProfiles.$inferSelect) => ({ ...row, goals:jsonArray(row.goals), stacks:jsonArray(row.stacks), chains:jsonArray(row.chains), specialties:jsonArray(row.specialties), tools:jsonArray(row.tools) });
const leadShape = (lead:typeof leads.$inferSelect) => ({ ...lead, topics:jsonArray(lead.topics), technologies:jsonArray(lead.technologies), rewardPaths:jsonArray(lead.rewardPaths), earningBreakdown:{} });

export const telegramConfig = () => ({
  token:String(process.env.TELEGRAM_BOT_TOKEN || ""),
  username:String(process.env.TELEGRAM_BOT_USERNAME || "").replace(/^@/, ""),
  webhookSecret:String(process.env.TELEGRAM_WEBHOOK_SECRET || ""),
});

export async function telegramRequest(method:string, body:Record<string,unknown>) {
  const { token } = telegramConfig();
  if (!token) throw new Error("TELEGRAM_NOT_CONFIGURED");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body), signal:AbortSignal.timeout(15000) });
  const detail = await response.text();
  if (!response.ok) throw new Error(`TELEGRAM_SEND_FAILED:${detail.slice(0,180)}`);
  return detail;
}

export async function sendTelegramSignal(userId:string, profile:typeof userProfiles.$inferSelect, chatId:string, preview=false) {
  const selected = await getDb().select().from(leads).orderBy(desc(leads.earningScore), desc(leads.score), desc(leads.syncedAt)).limit(150);
  const ownerCategories=new Set(["Hackathon","Job","Internship"]);
  const rows=selected.filter((lead)=>!ownerCategories.has(lead.category)||(process.env.OWNER_EMAIL&&userId.toLowerCase()===process.env.OWNER_EMAIL.toLowerCase()));
  const watches = (await getDb().select().from(watchlists).where(eq(watchlists.userId,userId))).filter((watch) => watch.active);
  const candidates = watches.length ? rows.filter((lead) => watches.some((watch) => {
    const stacks=jsonArray(watch.stacks), categories=jsonArray(watch.categories), paths=jsonArray(lead.rewardPaths);
    const maxCompetition=watch.maxCompetitionLevel==="Any" || competitionRank[lead.competitionLevel] <= competitionRank[watch.maxCompetitionLevel];
    return (!stacks.length || stacks.some((stack) => `${lead.stack} ${lead.ecosystem} ${lead.technologies}`.toLowerCase().includes(stack.toLowerCase()))) &&
      (!categories.length || categories.includes(lead.category)) && (!watch.minReward || rewardNumber(lead.reward) >= watch.minReward) &&
      (!watch.verifiedOnly || lead.evidenceConfidence === "verified") && (!watch.lowVisibilityOnly || lead.visibilityLevel === "Low") &&
      (!watch.alternativeRewardsOnly || lead.participationRewards || paths.length > 1) && maxCompetition && withinDays(lead.deadline, watch.deadlineDays);
  })) : rows;
  const fitted = candidates.map((row) => { const lead=leadShape(row); return { ...lead, ...calculateFit(lead,profileShape(profile)) }; });
  const rank = (lead:typeof fitted[number]) => lead.fitScore + lead.score + lead.earningScore;
  const qualified = fitted.filter((lead) => lead.qualified).sort((a,b) => rank(b)-rank(a)).slice(0,3);
  const matches = qualified.length ? qualified : fitted.sort((a,b) => rank(b)-rank(a)).slice(0,3);
  const cards = matches.map((lead,index) => `<b>${index+1}. ${escapeHtml(lead.project)}</b>\n${lead.score} quality | ${lead.fitScore} fit | ${lead.earningScore} earning potential\n${escapeHtml(lead.reward)} | ${escapeHtml(lead.competitionLevel)} competition\n<a href="${escapeHtml(lead.sourceUrl)}">Review official source</a>`).join("\n\n");
  const text = `<b>PROSKOPOS ${preview ? "PREVIEW" : "DAILY SIGNAL"}</b>\n\n${matches.length ? cards : "No matching opportunities are available yet."}\n\n<i>Permission first: follow the official scope and safe-harbor terms.</i>`;
  const detail = await telegramRequest("sendMessage", { chat_id:chatId, text, parse_mode:"HTML", disable_web_page_preview:true });
  await getDb().insert(notificationLog).values({ id:crypto.randomUUID(), userId, channel:"Telegram", status:"sent", itemCount:matches.length, detail:detail.slice(0,500), sentAt:new Date().toISOString() });
  return { itemCount:matches.length };
}
