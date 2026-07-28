import type { leads } from "../db/schema";

type LeadRow=typeof leads.$inferInsert;
type JobPosting={"@type"?:string;title?:string;description?:string;datePosted?:string;validThrough?:string;url?:string;employmentType?:string|string[];hiringOrganization?:{name?:string};baseSalary?:unknown};
type DevpostHackathon={id:number;title:string;displayed_location?:{location?:string};open_state?:string;url:string;time_left_to_submission?:string;submission_period_dates?:string;themes?:Array<{name:string}>;prize_amount?:string;prizes_counts?:{cash?:number;other?:number};registrations_count?:number;organization_name?:string;managed_by_devpost_badge?:boolean};

const now=()=>new Date().toISOString();
const clean=(value:string)=>value.replaceAll("&amp;","&").replaceAll("&gt;",">").replaceAll("&lt;","<").replaceAll("&quot;",'"').replaceAll("&#x24;","$").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
const dateLabel=(value:string|null|undefined)=>{if(!value)return "See official source";const date=new Date(value);return Number.isNaN(date.getTime())?"See official source":date.toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})};
const money=(value:number,currency="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency,maximumFractionDigits:0}).format(value);
const scoreParts=(quality:number,earning:number)=>({qualityBreakdown:JSON.stringify({Legitimacy:25,"Budget signal":quality>=80?18:12,Freshness:15,Urgency:12,"Opportunity clarity":12,Contactability:10}),earningBreakdown:JSON.stringify({"Reward strength":earning>=70?20:12,"Competition advantage":18,"Reward options":18,Timing:15,Difficulty:8,Evidence:5})});

function row(input:{id:string;project:string;source:string;sourceUrl:string;stack:string;category:"Hackathon"|"Job"|"Internship";reward:string;deadline:string;summary:string;evidenceNote:string;rewardPaths:string[];difficulty:string;competitionLevel:string;visibilityLevel:string;quality:number;earning:number;technologies?:string[];topics?:string[];ecosystem?:string;launchStage:string;winnerCount?:number;participationRewards?:boolean;competitionConfidence?:"estimated"|"unknown"|"observed";evidenceConfidence?:"verified"|"observed"|"inferred"|"directory"}):LeadRow{
  const scores=scoreParts(input.quality,input.earning);
  return {id:input.id,project:input.project,repo:input.category==="Hackathon"?"Build submission":"Official application page",source:input.source,sourceUrl:input.sourceUrl,discoveredAt:"Current listing",stack:input.stack,category:input.category,reward:input.reward,fundingSignal:input.reward.includes("not published")?"Compensation not published":"Published or event-level reward signal",deadline:input.deadline,launchStage:input.launchStage,existingAudits:"Not applicable",bountyProgram:input.category==="Hackathon"?"Official builder competition":"Employment opportunity",contact:`Use the official ${input.source} application route`,fitReason:input.category==="Hackathon"?"Multiple prize tracks can create a stronger reward-to-competition edge when matched to reusable skills.":`A fresh ${input.category.toLowerCase()} listing ranked by stack match, experience fit, and recency.`,suggestedScope:input.category==="Hackathon"?"Compare sponsor tracks, participant visibility, delivery time, and reusable code before committing. Prefer the narrowest credible track where your existing work creates an edge.":"Confirm the role is open, review location and eligibility, then tailor your application to the official description.",outreachDraft:input.category==="Hackathon"?"Apply through the official event page and map your strongest existing work to the least-crowded credible prize track.":`I am interested in ${input.project}. My background aligns with the published stack, and I would be glad to share relevant work.`,stage:"New",score:input.quality,scoreBreakdown:scores.qualityBreakdown,summary:input.summary,evidenceConfidence:input.evidenceConfidence||"observed",evidenceNote:input.evidenceNote,topics:JSON.stringify(input.topics||[input.category]),technologies:JSON.stringify(input.technologies||input.stack.split(/\s*\/\s*/)),ecosystem:input.ecosystem||"Multi-chain",sourceTier:"Owner feed",rewardPaths:JSON.stringify(input.rewardPaths),difficulty:input.difficulty,competitionLevel:input.competitionLevel,competitionConfidence:input.competitionConfidence||"estimated",visibilityLevel:input.visibilityLevel,winnerCount:input.winnerCount??(input.category==="Hackathon"?3:1),participationRewards:input.participationRewards??false,earningScore:input.earning,earningBreakdown:scores.earningBreakdown,syncedAt:now()};
}

async function page(url:string){const response=await fetch(url,{headers:{"User-Agent":"Proskopos/1.0 owner opportunity feed",Accept:"text/html"},signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error(`${response.status} from ${url}`);return response.text()}
function careerStack(text:string){const rules:Array<[RegExp,string]>= [[/solidity|ethereum|evm/i,"Solidity / EVM"],[/rust|solana/i,"Rust / Solana"],[/\bmove\b|sui|aptos/i,"Move"],[/cairo|starknet/i,"Cairo"],[/soroban|stellar/i,"Soroban"],[/react|typescript|javascript|node/i,"Web / API"]];return rules.find(([pattern])=>pattern.test(text))?.[1]||"Web3"}
function salaryLabel(value:unknown){if(!value||typeof value!=="object")return "Salary not published";const salary=value as {currency?:string;value?:number|{minValue?:number;maxValue?:number;value?:number;unitText?:string}};const amount=typeof salary.value==="number"?salary.value:salary.value?.value||salary.value?.maxValue||salary.value?.minValue;return amount?`${money(amount,salary.currency||"USD")}${typeof salary.value==="object"&&salary.value.unitText?` / ${salary.value.unitText.toLowerCase()}`:""}`:"Salary not published"}

async function collectCareerPage(url:string,forceInternship=false):Promise<LeadRow[]>{
  const html=await page(url);const rows:LeadRow[]=[];
  for(const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){
    let posting:JobPosting;try{posting=JSON.parse(match[1]) as JobPosting}catch{continue}
    if(posting["@type"]!=="JobPosting"||!posting.title)continue;
    const description=clean(posting.description||"").slice(0,600);const company=clean(posting.hiringOrganization?.name||"Web3 company");const category=forceInternship||/intern|graduate|trainee|apprentice/i.test(`${posting.title} ${posting.employmentType||""}`)?"Internship":"Job";const stack=careerStack(`${posting.title} ${description}`);const salary=salaryLabel(posting.baseSalary);const slug=`${company}-${posting.title}-${posting.datePosted||""}`.toLowerCase().replace(/[^a-z0-9]+/g,"-").slice(0,100);
    rows.push(row({id:`web3career-${slug}`,project:`${posting.title} ? ${company}`,source:"Web3 Career",sourceUrl:posting.url||url,stack,category,reward:salary,deadline:dateLabel(posting.validThrough),summary:description||`${company} has a recently listed ${posting.title} opening.`,evidenceNote:"Title, employer, posting date, deadline, compensation when available, and application URL were observed in structured JobPosting data.",rewardPaths:[category==="Internship"?"Paid experience":"Employment compensation"],difficulty:category==="Internship"?"Beginner":"Intermediate",competitionLevel:"Moderate",visibilityLevel:"High",quality:salary==="Salary not published"?74:84,earning:salary==="Salary not published"?60:74,topics:[category==="Internship"?"Early Career":"Web3 Careers"],launchStage:"Recently posted"}));
  }
  return rows.slice(0,forceInternship?8:12);
}

export async function collectWeb3Jobs():Promise<LeadRow[]>{const [jobs,internships]=await Promise.all([collectCareerPage("https://web3.career/remote-jobs"),collectCareerPage("https://web3.career/intern%2Bremote-jobs",true)]);return Array.from(new Map([...internships,...jobs].map((item)=>[item.id,item])).values()).slice(0,16)}

export async function collectEthGlobal():Promise<LeadRow[]>{
  const html=await page("https://ethglobal.com/events");const rows:LeadRow[]=[];
  for(const match of html.matchAll(/href="\/events\/([^"]+)"[^>]*>([\s\S]{0,12000}?)<\/a>/g)){
    const [,slug,body]=match;const title=clean(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1]||"");const eventType=clean(body.match(/<span class="[^"]*">([^<]*(?:Hackathon|Online)[^<]*)<\/span>/i)?.[1]||"");
    if(!title||!/hackathon|online/i.test(eventType)||rows.some((item)=>item.id===`ethglobal-${slug}`))continue;
    const month=clean(body.match(/uppercase[^>]*>([^<]+)</)?.[1]||"");const days=[...body.matchAll(/<span class="">(\d{1,2})<\/span>/g)].map((item)=>item[1]).slice(0,2);const deadline=[month,...days].filter(Boolean).join("?")||"See event page";
    rows.push(row({id:`ethglobal-${slug}`,project:title,source:"ETHGlobal",sourceUrl:`https://ethglobal.com/events/${slug}`,stack:"Solidity / EVM",category:"Hackathon",reward:"Prize tracks published per event",deadline,summary:`${title} is listed by ETHGlobal as ${eventType}. Multiple sponsor tracks create more than one path to earning.`,evidenceNote:"Event name, format, and application route were extracted from ETHGlobal's official upcoming events page. Prize and participant estimates should be confirmed on the event page.",rewardPaths:["Sponsor tracks","Finalist recognition","Multiple winners"],difficulty:"Intermediate",competitionLevel:"High",visibilityLevel:"High",quality:82,earning:67,technologies:["Solidity","EVM"],topics:["Web3 Hackathon","Builder Competition"],ecosystem:"Ethereum",launchStage:/online/i.test(eventType)?"Upcoming online hackathon":"Upcoming IRL hackathon"}));
  }
  return rows.slice(0,8);
}

function stackFromTags(tags:string[]){const joined=tags.join(" ");return careerStack(joined)==="Web3"?(tags.slice(0,3).join(" / ")||"Web3"):careerStack(joined)}
function competitionFromCount(count:number|undefined){if(!count)return {level:"Unknown",visibility:"Medium",confidence:"unknown" as const};if(count<200)return {level:"Low",visibility:"Low",confidence:"observed" as const};if(count<800)return {level:"Moderate",visibility:"Medium",confidence:"observed" as const};return {level:"High",visibility:"High",confidence:"observed" as const}}

export async function collectDoraHacks():Promise<LeadRow[]>{
  const directory=await page("https://dorahacks.io/hackathon");
  const slugs=Array.from(new Set([...directory.matchAll(/\/hackathon\/([a-z0-9][a-z0-9-]{4,})\//gi)].map((match)=>match[1]))).filter((slug)=>!/[{}()]/.test(slug)).slice(0,6);
  const details=await Promise.all(slugs.map(async (slug)=>({slug,html:await page(`https://dorahacks.io/hackathon/${slug}/detail`).catch(()=>"")})));
  const rows:LeadRow[]=[];
  for(const {slug,html} of details){
    if(!html)continue;
    const title=clean(html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]||slug.replaceAll("-"," ")).replace(/\s*\|\s*Hackathon.*$/i,"");
    const bonus=Number(html.match(/\\"bonusPrice\\":(\d+)/)?.[1]||0);
    const endTime=Number(html.match(/\\"endTime\\":(\d+)/)?.[1]||0);
    const ecosystemRaw=html.match(/\\"ecosystem\\":\[(.*?)\]/)?.[1]||"";
    const fieldRaw=html.match(/\\"field\\":\[(.*?)\]/)?.[1]||"";
    const ecosystem=[...ecosystemRaw.matchAll(/\\"([^"\\]+)\\"/g)].map((match)=>clean(match[1]));
    const fields=[...fieldRaw.matchAll(/\\"([^"\\]+)\\"/g)].map((match)=>clean(match[1]));
    const tags=Array.from(new Set([...ecosystem,...fields])).filter(Boolean);
    rows.push(row({id:`dorahacks-${slug}`,project:title,source:"DoraHacks",sourceUrl:`https://dorahacks.io/hackathon/${slug}/detail`,stack:stackFromTags(tags),category:"Hackathon",reward:bonus?`${money(bonus)} total pool`:"Prize pool on official event page",deadline:endTime?dateLabel(new Date(endTime).toISOString()):"See official event page",summary:`${title} is a promoted DoraHacks builder competition${ecosystem.length?` in the ${ecosystem.slice(0,3).join(", ")} ecosystem`:""}.`,evidenceNote:"The event was discovered in DoraHacks' official promoted listings. Title, ecosystem, deadline, and total prize signal are read from the official event page; track rules remain the source of truth.",rewardPaths:["Track prizes","Multiple winners","Ecosystem support"],difficulty:"Intermediate",competitionLevel:"Moderate",visibilityLevel:"Medium",quality:bonus?86:78,earning:bonus>=100000?79:bonus>=20000?71:62,technologies:tags.slice(0,8),topics:Array.from(new Set(["Web3 Hackathon",...fields.slice(0,5)])),ecosystem:ecosystem.slice(0,3).join(" / ")||"Multi-chain",launchStage:"Promoted live or upcoming event",winnerCount:3,evidenceConfidence:"verified"}));
  }
  return rows;
}

export async function collectDevpost():Promise<LeadRow[]>{
  const response=await fetch("https://devpost.com/api/hackathons?themes[]=Blockchain&status[]=upcoming&status[]=open",{headers:{"User-Agent":"Proskopos/1.0 owner opportunity feed",Accept:"application/json"},signal:AbortSignal.timeout(18000)});
  if(!response.ok)throw new Error(`${response.status} from Devpost`);
  const payload=await response.json() as {hackathons?:DevpostHackathon[]};
  return (payload.hackathons||[]).slice(0,12).map((hackathon)=>{
    const tags=(hackathon.themes||[]).map((theme)=>theme.name);
    const prize=Number((hackathon.prize_amount||"").replace(/[^\d]/g,""));
    const winnerCount=(hackathon.prizes_counts?.cash||0)+(hackathon.prizes_counts?.other||0)||1;
    const competition=competitionFromCount(hackathon.registrations_count);
    const earning=Math.max(48,Math.min(88,50+(prize>=50000?18:prize>=10000?12:prize?6:0)+(competition.level==="Low"?14:competition.level==="Moderate"?7:0)+(winnerCount>=3?8:0)));
    return row({id:`devpost-${hackathon.id}`,project:hackathon.title,source:"Devpost",sourceUrl:hackathon.url,stack:stackFromTags(tags),category:"Hackathon",reward:clean(hackathon.prize_amount||"Prize not published"),deadline:[hackathon.time_left_to_submission,hackathon.submission_period_dates].filter(Boolean).join(" · ")||"See official event page",summary:`${hackathon.organization_name||"An organizer"} lists ${hackathon.title} on Devpost${hackathon.displayed_location?.location?` as ${hackathon.displayed_location.location}`:""}. ${hackathon.registrations_count||"Unreported"} registrations and ${winnerCount} prize path${winnerCount===1?"":"s"} are currently visible.`,evidenceNote:hackathon.managed_by_devpost_badge?"Listing data and the Managed by Devpost badge were observed through Devpost's official public endpoint.":"Listing data was observed through Devpost's official public endpoint. This event is organizer-run, so verify sponsor legitimacy, rules, and prize delivery before committing time.",rewardPaths:winnerCount>1?["Multiple prizes","Track awards"]:["Main prize"],difficulty:"Intermediate",competitionLevel:competition.level,visibilityLevel:competition.visibility,competitionConfidence:competition.confidence,quality:hackathon.managed_by_devpost_badge?86:77,earning,technologies:tags,topics:["Hackathon",...tags],ecosystem:tags.includes("Blockchain")?"Multi-chain":"General technology",launchStage:hackathon.open_state||"Open listing",winnerCount,evidenceConfidence:hackathon.managed_by_devpost_badge?"verified":"observed"});
  });
}

export async function collectTaikai():Promise<LeadRow[]>{
  const html=await page("https://taikai.network/en/hackathons");const rows:LeadRow[]=[];
  for(const match of html.matchAll(/<a href="(\/en\/[^\"]+\/hackathons\/[^\"]+\/?)">([\s\S]{0,9000}?)<\/a>/g)){
    const [,href,body]=match;const title=clean(body.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]||"");if(!title||rows.some((item)=>item.sourceUrl===`https://taikai.network${href}`))continue;
    const summary=clean(body.match(/<div style="overflow:hidden"><span>([\s\S]*?)<\/span>/)?.[1]||"").slice(0,420);
    const tags=[...body.matchAll(/class="[^"]*tags[^"]*">([\s\S]*?)<\/div>/g)].flatMap((tagBlock)=>[...tagBlock[1].matchAll(/<span>([^<]+)<\/span>/g)].map((tag)=>clean(tag[1]))).filter(Boolean);
    const prizeMatch=body.match(/<span>Prize<\/span><div><span>([^<]+)<\/span><span>([^<]+)<\/span>/);const reward=prizeMatch?`${clean(prizeMatch[2])}${clean(prizeMatch[1])}`:"Prize not published";
    const text=clean(body);const days=text.match(/(\d+)\s+days?\s+left/i)?.[1];
    rows.push(row({id:`taikai-${href.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,project:title,source:"TAIKAI",sourceUrl:`https://taikai.network${href}`,stack:stackFromTags(tags),category:"Hackathon",reward,deadline:days?`${days} days left`:"See official event page",summary:summary||`${title} is currently visible in TAIKAI's official hackathon directory.`,evidenceNote:"Event title, public URL, topic tags, timing when visible, and prize signal were extracted from TAIKAI's official directory. Participant pressure is not asserted when the directory does not expose it.",rewardPaths:["Prize pool","Multiple submissions"],difficulty:"Intermediate",competitionLevel:"Unknown",visibilityLevel:"Medium",competitionConfidence:"unknown",quality:reward==="Prize not published"?72:80,earning:reward==="Prize not published"?55:66,technologies:tags,topics:["Hackathon",...tags],ecosystem:tags.join(" / ")||"Multi-ecosystem",launchStage:"Current public listing",winnerCount:3,evidenceConfidence:"observed"}));
  }
  return rows.slice(0,12);
}

export async function collectColosseum():Promise<LeadRow[]>{
  const html=await page("https://colosseum.com/eternal");
  const name=clean(html.match(/name:"(Eternal Challenge[^"]+)"/)?.[1]||"Colosseum Eternal");
  const participantCount=Number(html.match(/participantCount:(\d+)/)?.[1]||0);
  const deadline=html.match(/countdownTarget:"([^"]+)"/)?.[1];
  const competition=competitionFromCount(participantCount);
  return [row({id:"colosseum-eternal",project:name,source:"Colosseum",sourceUrl:"https://colosseum.com/eternal",stack:"Rust / Solana",category:"Hackathon",reward:"$250,000 in pre-seed funding",deadline:deadline?dateLabel(deadline):"Recurring four-week build window",summary:`Colosseum's open Eternal Challenge gives Solana builders a four-week product sprint and a path to pre-seed funding${participantCount?`; ${participantCount} active participants are currently shown`:""}.`,evidenceNote:"Program status, current participant count, deadline, four-week format, and funding signal were observed on Colosseum's official Eternal page. Participation can change quickly and funding is selective, not guaranteed.",rewardPaths:["Pre-seed funding","Accelerator consideration","Eternal Award"],difficulty:"Advanced",competitionLevel:competition.level,visibilityLevel:competition.visibility,competitionConfidence:competition.confidence,quality:91,earning:participantCount&&participantCount<50?88:76,technologies:["Rust","Solana"],topics:["Solana","Builder Program","Startup Challenge"],ecosystem:"Solana",launchStage:"Open recurring challenge",winnerCount:1,evidenceConfidence:"verified"})];
}