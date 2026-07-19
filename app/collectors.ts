import type { leads } from "../db/schema";

export type LeadRow = typeof leads.$inferInsert;
type GithubRepo = { id:number; name:string; full_name:string; html_url:string; description:string|null; created_at:string; pushed_at:string; language:string|null; stargazers_count:number; homepage?:string|null; owner:{login:string} };

const now = () => new Date().toISOString();
const money = (value: number, token = "") => `${new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(value)}${token && token !== "USD" ? ` ${token}` : ""}`;
const clean = (value: string) => value.replaceAll("\\u0026", "&").replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const dateLabel = (value: string | number | null) => {
  if (!value) return "Ongoing";
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? "Ongoing" : date.toLocaleDateString("en", { month:"short", day:"numeric", year:"numeric" });
};
const breakdown = (legitimacy:number, budget:number, freshness:number, urgency:number, need:number, contactability:number) => ({ Legitimacy:legitimacy, "Budget signal":budget, Freshness:freshness, Urgency:urgency, "Security need":need, Contactability:contactability });
const scoreOf = (parts: Record<string, number>) => Object.values(parts).reduce((sum, part) => sum + part, 0);
const base = (input: Omit<LeadRow, "stage"|"scoreBreakdown"|"syncedAt"> & { scoreBreakdown:Record<string,number> }): LeadRow => ({ ...input, stage:"New", scoreBreakdown:JSON.stringify(input.scoreBreakdown), syncedAt:now() });

async function page(url: string) {
  const response = await fetch(url, { headers:{ "User-Agent":"Proskopos/1.0 opportunity intelligence", Accept:"text/html" }, signal:AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.text();
}

export async function collectCode4rena(): Promise<LeadRow[]> {
  const html = await page("https://code4rena.com/audits");
  const pattern = /\\"auditType\\":\\"([^\"]+)\\"[\s\S]{0,2500}?\\"endTime\\":\\"([^\"]+)\\"[\s\S]{0,1000}?\\"formattedAmount\\":\\"([^\"]+)\\"[\s\S]{0,600}?\\"repo\\":(?:\\"([^\"]+)\\"|null)[\s\S]{0,500}?\\"slug\\":\\"([^\"]+)\\",\\"startTime\\":\\"([^\"]+)\\",\\"status\\":\\"([^\"]+)\\",\\"title\\":\\"([^\"]+)\\"/g;
  const rows: LeadRow[] = [];
  for (const match of html.matchAll(pattern)) {
    const [, auditType, endTime, amountRaw, repo, slug, startTime, status, title] = match;
    if (rows.some((row) => row.id === `code4rena-${slug}`)) continue;
    const parts = breakdown(25, 20, 12, /active|live|upcoming|judging|reporting/i.test(status) ? 15 : 7, 15, 10);
    rows.push(base({ id:`code4rena-${slug}`, project:clean(title), repo:repo || "Scope published on Code4rena", source:"Code4rena", sourceUrl:`https://code4rena.com/audits/${slug}`, discoveredAt:dateLabel(startTime), stack:"Solidity / Web3", category:"Audit contest", reward:clean(amountRaw).replace(/^\$\$/, "$"), fundingSignal:"Published contest pool", deadline:dateLabel(endTime), launchStage:status, existingAudits:`${auditType} in progress`, bountyProgram:"Permissioned public audit contest", contact:"Sponsor through Code4rena", fitReason:"A scoped competitive review with a published sponsor, timeline, and reward.", suggestedScope:"Review the published repository, exclusions, known issues, and contest rules before testing.", outreachDraft:"Join through the official Code4rena contest page and keep all findings within the published scope.", score:scoreOf(parts), scoreBreakdown:parts, summary:`${clean(title)} is listed by Code4rena as ${status.toLowerCase()} with an explicit competitive audit scope.`, evidenceConfidence:"verified", evidenceNote:"Title, status, dates, repository, and pool were extracted from the official Code4rena audits page." }));
  }
  return rows.slice(0, 12);
}

export async function collectSherlock(): Promise<LeadRow[]> {
  const html = await page("https://audits.sherlock.xyz/contests");
  const pattern = /\\"token\\":\\"([^\"]+)\\",\\"id\\":(\d+),\\"status\\":\\"([^\"]+)\\",\\"title\\":\\"([^\"]+)\\"[\s\S]{0,500}?\\"rewards\\":(\d+)[\s\S]{0,1800}?\\"shortDescription\\":\\"([^\"]*)\\"[\s\S]{0,900}?\\"startsAt\\":(\d+)[\s\S]{0,700}?\\"typeLabel\\":\\"([^\"]+)\\",\\"prizePool\\":(\d+),\\"endsAt\\":(\d+)/g;
  const rows: LeadRow[] = [];
  for (const match of html.matchAll(pattern)) {
    const [, token, id, status, title, rewards, description, startsAt, typeLabel, prizePool, endsAt] = match;
    const parts = breakdown(25, 20, 15, /created|running/i.test(status) ? 15 : 8, 15, 10);
    rows.push(base({ id:`sherlock-${id}`, project:clean(title), repo:"Scope available after contest access", source:"Sherlock", sourceUrl:`https://audits.sherlock.xyz/contests/${id}`, discoveredAt:dateLabel(Number(startsAt)), stack:/solana/i.test(`${title} ${description}`) ? "Rust / Solana" : "Solidity / EVM", category:"Audit contest", reward:money(Number(prizePool || rewards), token), fundingSignal:`${money(Number(rewards), token)} total rewards`, deadline:dateLabel(Number(endsAt)), launchStage:status, existingAudits:"Sherlock contest review", bountyProgram:typeLabel, contact:"Sponsor through Sherlock", fitReason:"A current security contest with an explicit pool, timeline, and controlled participation channel.", suggestedScope:"Read the official contest scope, private-access requirements, judging rules, and known issues.", outreachDraft:"Participate only through the official Sherlock contest and follow its disclosure and judging process.", score:scoreOf(parts), scoreBreakdown:parts, summary:clean(description) || `${title} is listed as a ${typeLabel} contest on Sherlock.`, evidenceConfidence:"verified", evidenceNote:"Contest status, type, dates, and reward were extracted from Sherlock's official contest page." }));
  }
  return rows.slice(0, 12);
}

export async function collectCantina(): Promise<LeadRow[]> {
  const html = await page("https://cantina.xyz/opportunities/competitions");
  const pattern = /<a[^>]+title="([^"]+)" href="(\/competitions\/[^"]+)"[\s\S]{0,1800}?<h2[^>]*>([^<]+)<\/h2>[\s\S]{0,500}?<p[^>]*>\$([\d,]+)<\/p>[\s\S]{0,1800}?(?:End|Start)/g;
  const rows: LeadRow[] = [];
  for (const match of html.matchAll(pattern)) {
    const [, sponsorTitle, href, title, reward] = match;
    const id = href.split("/").pop()!;
    const parts = breakdown(25, 20, 14, 13, 15, 10);
    rows.push(base({ id:`cantina-${id}`, project:clean(title), repo:"Competition scope on Cantina", source:"Cantina", sourceUrl:`https://cantina.xyz${href}`, discoveredAt:"Current listing", stack:"Web3 / Smart contracts", category:"Audit contest", reward:`$${reward} USDC`, fundingSignal:"Published reward pot", deadline:"See live competition", launchStage:"Live competition listing", existingAudits:"Cantina competition", bountyProgram:"Permissioned security competition", contact:`${clean(sponsorTitle)} through Cantina`, fitReason:"A current Cantina competition with an official scope and published reward.", suggestedScope:"Confirm current phase, scope, allowed severities, and KYC requirements on the official listing.", outreachDraft:"Participate through the official Cantina competition and follow its scope and disclosure rules.", score:scoreOf(parts), scoreBreakdown:parts, summary:`${clean(sponsorTitle)} is currently listed in Cantina's security competition directory.`, evidenceConfidence:"verified", evidenceNote:"Project, sponsor, official competition URL, and reward were extracted from Cantina's live opportunities page." }));
  }
  return rows.slice(0, 10);
}

export async function collectImmunefi(): Promise<LeadRow[]> {
  const html = await page("https://immunefi.com/bug-bounty/");
  const pattern = /\\"slug\\":\\"([^\"]+)\\",\\"url\\":\\"([^\"]+)\\",\\"launchDate\\":\\"([^\"]+)\\",\\"updatedDate\\":\\"([^\"]+)\\"[\s\S]{0,100}?\\"maxBounty\\":(\d+)[\s\S]{0,500}?\\"project\\":\\"([^\"]+)\\"[\s\S]{0,450}?\\"language\\":\[([^\]]*)\][\s\S]{0,350}?\\"productType\\":\[([^\]]*)\]/g;
  const found: Array<LeadRow & { sortDate:string }> = [];
  for (const match of html.matchAll(pattern)) {
    const [, slug, url, launchDate, updatedDate, maxBounty, project, languageRaw, productRaw] = match;
    const languages = clean(languageRaw.replaceAll('\\"', '').replaceAll('"', '').replaceAll(',', ' / ')) || "Multi-chain";
    const product = clean(productRaw.replaceAll('\\"', '').replaceAll('"', '').replaceAll(',', ' / ')) || "Web3 protocol";
    const parts = breakdown(25, 20, 15, 8, 15, 10);
    found.push({ ...base({ id:`immunefi-${slug}`, project:clean(project), repo:"Assets listed in program scope", source:"Immunefi", sourceUrl:`https://immunefi.com${url}`, discoveredAt:dateLabel(launchDate), stack:languages, category:"Bug bounty", reward:`Up to ${money(Number(maxBounty))}`, fundingSignal:"Published maximum bounty", deadline:"Ongoing", launchStage:"Live bounty program", existingAudits:"Not inferred; review program", bountyProgram:`Permissioned ${product} bounty`, contact:"Project team through Immunefi", fitReason:"A live, permissioned web3 bounty with a published maximum award and explicit assets.", suggestedScope:"Read impacts, assets, exclusions, PoC, KYC, and safe-harbor requirements before testing.", outreachDraft:"Use the official Immunefi submission flow. Do not test assets or impacts outside the published program scope.", score:scoreOf(parts), scoreBreakdown:parts, summary:`${clean(project)} maintains an active Immunefi program covering ${product}.`, evidenceConfidence:"verified", evidenceNote:"Project, update date, program URL, stack tags, and maximum bounty were extracted from Immunefi's official directory." }), sortDate:updatedDate });
  }
  return found.sort((a,b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 12).map(({ sortDate:_, ...row }) => row);
}

const daysSince = (date:string) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
export async function collectGithub(): Promise<LeadRow[]> {
  const since = new Date(Date.now() - 21 * 86400000).toISOString().slice(0,10);
  const queries = [`topic:defi language:Solidity created:>=${since} archived:false fork:false`,`topic:blockchain language:Rust created:>=${since} archived:false fork:false`,`topic:sui language:Move created:>=${since} archived:false fork:false`,`topic:starknet language:Cairo created:>=${since} archived:false fork:false`];
  const headers = { Accept:"application/vnd.github+json", "User-Agent":"Proskopos-opportunity-radar", "X-GitHub-Api-Version":"2022-11-28" };
  const groups = await Promise.all(queries.map(async (query) => { const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=3`, { headers, signal:AbortSignal.timeout(12000) }); return response.ok ? ((await response.json()) as {items?:GithubRepo[]}).items ?? [] : []; }));
  const unique = Array.from(new Map(groups.flat().map((repo) => [repo.id, repo])).values()).slice(0,10);
  return Promise.all(unique.map(async (repo) => {
    const policy = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/SECURITY.md`, { headers, signal:AbortSignal.timeout(8000) }).catch(() => null);
    const policyMissing = policy?.status === 404;
    const parts = breakdown(20, repo.stargazers_count >= 25 ? 14 : repo.stargazers_count >= 5 ? 9 : 4, daysSince(repo.created_at) <= 7 ? 15 : 10, daysSince(repo.pushed_at) <= 3 ? 15 : 10, policyMissing ? 12 : 6, repo.homepage ? 10 : 6);
    const stack = repo.language || "Web3";
    return base({ id:`github-${repo.id}`, project:repo.name, repo:repo.full_name, source:"GitHub", sourceUrl:repo.html_url, discoveredAt:dateLabel(repo.created_at), stack, category:"New protocol", reward:"Not published", fundingSignal:`${repo.stargazers_count} GitHub stars`, deadline:"Early discovery", launchStage:daysSince(repo.created_at) <= 7 ? "New repository" : "Active development", existingAudits:"No audit evidence verified", bountyProgram:"No public program verified", contact:`@${repo.owner.login} on GitHub`, fitReason:`A recently created ${stack} codebase with active public development.`, suggestedScope:`Ask permission before offering a narrow architecture and ${stack} code review.`, outreachDraft:`Hi ${repo.owner.login} - I found ${repo.full_name} while tracking newly active web3 codebases. I audit ${stack} systems. If an external review is timely, I can propose a narrow, permissioned scope and send relevant work first.`, score:scoreOf(parts), scoreBreakdown:parts, summary:repo.description || `A recently active public ${stack} repository.`, evidenceConfidence:"inferred", evidenceNote:`Repository activity and root SECURITY.md presence were checked. Funding and audit status are not asserted.${policyMissing ? " No root SECURITY.md was detected." : ""}` });
  }));
}

export async function collectAll() {
  const collectors = [{source:"Code4rena", run:collectCode4rena},{source:"Sherlock", run:collectSherlock},{source:"Cantina", run:collectCantina},{source:"Immunefi", run:collectImmunefi},{source:"GitHub", run:collectGithub}];
  const results = await Promise.all(collectors.map(async ({source,run}) => { try { return { source, rows:await run(), error:null }; } catch (error) { return { source, rows:[] as LeadRow[], error:error instanceof Error ? error.message : "Collector failed" }; } }));
  results.push({ source:"HackerOne", rows:[base({ id:"hackerone-directory", project:"HackerOne program directory", repo:"Official program directory", source:"HackerOne", sourceUrl:"https://hackerone.com/directory/programs", discoveredAt:"Current source", stack:"Web / API", category:"Bug bounty", reward:"Program dependent", fundingSignal:"Program-level bounty statistics", deadline:"Ongoing", launchStage:"Live program directory", existingAudits:"Program dependent", bountyProgram:"VDP and bounty programs", contact:"Defined program channel", fitReason:"A permissioned expansion path from smart contracts into wallets, APIs, and product surfaces.", suggestedScope:"Use active-program filters and read each policy before testing.", outreachDraft:"Confirm assets, exclusions, and safe-harbor terms before any testing.", score:70, scoreBreakdown:breakdown(25,14,10,6,15,10), summary:"HackerOne's official directory lists permissioned disclosure and bounty programs.", evidenceConfidence:"directory", evidenceNote:"Official directory verified. Program-level extraction is limited by the directory's client-side access controls." })], error:null });
  return results;
}
