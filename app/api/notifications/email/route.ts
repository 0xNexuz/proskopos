import { desc, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../../db";
import { leads, notificationLog, userProfiles, watchlists } from "../../../../db/schema";
import { requireCurrentUser } from "../../../current-user";
import { calculateFit } from "../../../qualification";
import { checkRateLimit, jsonArray } from "../../../data-service";

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[character]||character));
const profileShape=(row:typeof userProfiles.$inferSelect)=>({...row,goals:jsonArray(row.goals),stacks:jsonArray(row.stacks),chains:jsonArray(row.chains),specialties:jsonArray(row.specialties),tools:jsonArray(row.tools)});
const rewardNumber=(value:string)=>Number((value.match(/[\d,.]+/)?.[0]||"0").replaceAll(",",""));
const objectValue=(value:string)=>{try{return JSON.parse(value) as Record<string,number>}catch{return {}}};
const leadShape=(lead:typeof leads.$inferSelect)=>({...lead,topics:jsonArray(lead.topics),technologies:jsonArray(lead.technologies),rewardPaths:jsonArray(lead.rewardPaths),earningBreakdown:objectValue(lead.earningBreakdown)});
const competitionRank:Record<string,number>={Low:1,Moderate:2,High:3,Unknown:4};
const withinDays=(deadline:string,days:number)=>{if(!days)return true;const date=new Date(deadline);if(Number.isNaN(date.getTime()))return false;const left=Math.ceil((date.getTime()-Date.now())/86400000);return left>=0&&left<=days};

async function sendFor(email:string,profile:typeof userProfiles.$inferSelect,preview=false){
  const apiKey=String(process.env.RESEND_API_KEY||"");
  const from=String(process.env.EMAIL_FROM||"");
  if(!apiKey||!from) throw new Error("EMAIL_NOT_CONFIGURED");
  const rows=await getDb().select().from(leads).orderBy(desc(leads.earningScore),desc(leads.score),desc(leads.syncedAt)).limit(120);
  const shapedProfile=profileShape(profile);
  const watches=(await getDb().select().from(watchlists).where(eq(watchlists.userId,email))).filter((watch)=>watch.active);
  const candidates=watches.length?rows.filter((lead)=>watches.some((watch)=>{
    const stacks=jsonArray(watch.stacks),categories=jsonArray(watch.categories),paths=jsonArray(lead.rewardPaths);
    const maxCompetition=watch.maxCompetitionLevel==="Any"||competitionRank[lead.competitionLevel]<=competitionRank[watch.maxCompetitionLevel];
    return(!stacks.length||stacks.some((stack)=>`${lead.stack} ${lead.ecosystem} ${lead.technologies}`.toLowerCase().includes(stack.toLowerCase())))&&
      (!categories.length||categories.includes(lead.category))&&(!watch.minReward||rewardNumber(lead.reward)>=watch.minReward)&&
      (!watch.verifiedOnly||lead.evidenceConfidence==="verified")&&(!watch.lowVisibilityOnly||lead.visibilityLevel==="Low")&&
      (!watch.alternativeRewardsOnly||lead.participationRewards||paths.length>1)&&maxCompetition&&withinDays(lead.deadline,watch.deadlineDays);
  })):rows;
  const fitted=candidates.map((row)=>{const lead=leadShape(row);return{...lead,...calculateFit(lead,shapedProfile)}});
  const rank=(lead:typeof fitted[number])=>lead.fitScore+lead.score+lead.earningScore;
  const matches=fitted.filter((lead)=>lead.qualified).sort((a,b)=>rank(b)-rank(a)).slice(0,3);
  const fallbacks=matches.length?matches:fitted.sort((a,b)=>rank(b)-rank(a)).slice(0,3);
  const destination=profile.alertDestination||email;
  const cards=fallbacks.map((lead)=>`<div style="border:1px solid #c7d978;border-radius:16px;padding:18px;margin:12px 0;background:#f9f4ea"><strong style="font-size:18px;color:#32233e">${escapeHtml(lead.project)}</strong><p style="color:#655a61">${escapeHtml(lead.summary)}</p><p style="font-size:13px;color:#245f56">${escapeHtml([lead.category,...lead.topics.slice(0,1),lead.ecosystem,...lead.technologies.slice(0,1),...lead.rewardPaths.slice(0,1)].join(" | "))}</p><p><b>${lead.score} quality</b> &middot; <b>${lead.fitScore} fit</b> &middot; <b>${lead.earningScore} earning potential</b></p><p>${escapeHtml(lead.reward)} &middot; ${escapeHtml(lead.competitionLevel)} competition &middot; ${escapeHtml(lead.deadline)}</p><a href="${escapeHtml(lead.sourceUrl)}" style="color:#245f56">Review official source &rarr;</a></div>`).join("");
  const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#f3ede3;padding:28px;color:#32233e"><p style="letter-spacing:.15em;color:#53786d">PROSKOPOS &middot; DAILY SIGNAL</p><h1 style="font-family:Georgia,serif;font-size:38px">The work worth seeing today.</h1><p>These leads balance opportunity quality, your personal fit, and realistic earning potential. Estimates are labelled so you can judge the evidence yourself.</p>${cards}<p style="font-size:12px;color:#766c70">Permission first: always follow the official scope and safe-harbor terms. Manage notifications from your private radar.</p></div>`;
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[destination],subject:preview?"Your Proskopos Daily Signal preview":"Your Proskopos Daily Signal",html})});
  const detail=await response.text();
  await getDb().insert(notificationLog).values({id:crypto.randomUUID(),userId:email,channel:"Email",status:response.ok?"sent":"failed",itemCount:fallbacks.length,detail:detail.slice(0,500),sentAt:new Date().toISOString()});
  if(!response.ok) throw new Error("EMAIL_SEND_FAILED");
  return {destination,itemCount:fallbacks.length};
}

export async function POST(){
  try{
    await ensureRuntimeSchema();
    const user=await requireCurrentUser();
    if(!await checkRateLimit(`email-preview:${user.email}`,3,60*60_000))return Response.json({error:"Email preview limit reached."},{status:429});
    const rows=await getDb().select().from(userProfiles).where(eq(userProfiles.userId,user.email)).limit(1);
    if(!rows[0])return Response.json({error:"Complete your profile first."},{status:400});
    const result=await sendFor(user.email,rows[0],true);
    return Response.json({ok:true,...result});
  }catch(error){
    if(error instanceof Error&&error.message==="AUTH_REQUIRED")return Response.json({error:"Sign in is required."},{status:401});
    if(error instanceof Error&&error.message==="EMAIL_NOT_CONFIGURED")return Response.json({error:"Email delivery needs its production sender key before the first message can be sent.",configurationRequired:true},{status:503});
    return Response.json({error:"The email could not be sent. Check the sender configuration."},{status:500});
  }
}

export async function GET(request:Request){
  try{
    await ensureRuntimeSchema();
    const secret=String(process.env.CRON_SECRET||"");
    if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return Response.json({error:"Unauthorized"},{status:401});
    const profiles=await getDb().select().from(userProfiles);
    const weekday=new Date().getUTCDay();
    const eligible=profiles.filter((profile)=>profile.alertChannel==="Email"&&(profile.alertFrequency==="Daily"||profile.alertFrequency==="Instant"||(profile.alertFrequency==="Weekly"&&weekday===1)));
    let sent=0;
    for(const profile of eligible){try{await sendFor(profile.userId,profile);sent+=1}catch{/* One user should not stop the digest run. */}}
    return Response.json({ok:true,sent});
  }catch{return Response.json({error:"Digest run failed."},{status:500})}
}
