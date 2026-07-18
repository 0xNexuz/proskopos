import { ensureRuntimeSchema, getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { desc } from "drizzle-orm";

type GithubRepo = {
  id: number; name: string; full_name: string; html_url: string; description: string | null;
  created_at: string; pushed_at: string; language: string | null; stargazers_count: number;
  topics?: string[]; homepage?: string | null; owner: { login: string; html_url: string };
};

const sourceRows = [
  { id:"source-immunefi", project:"Immunefi bounty watch", repo:"Public web3 bounty directory", source:"Immunefi", sourceUrl:"https://immunefi.com/bug-bounty/", discoveredAt:"Live source", stack:"Multi-chain", category:"Bounty", reward:"Program dependent", fundingSignal:"Published bounty pool", deadline:"Ongoing", launchStage:"Live protocols", existingAudits:"Check each program", bountyProgram:"Active directory", contact:"Program security contact", fitReason:"Direct access to scoped, permissioned web3 vulnerability programs.", suggestedScope:"Filter for EVM, Rust, Move and Soroban assets before reviewing program rules.", outreachDraft:"This is a bounty source. Review the program scope and disclosure policy before testing.", stage:"New", score:82, scoreBreakdown:JSON.stringify({Freshness:17,"Stack fit":18,"Budget signal":20,Urgency:10,"Security gap":10,Contactability:7}), summary:"A permissioned feed of web3 programs with defined scopes and rewards." },
  { id:"source-code4rena", project:"Code4rena audit watch", repo:"Competitive audit opportunities", source:"Code4rena", sourceUrl:"https://code4rena.com/audits", discoveredAt:"Live source", stack:"Solidity / Rust", category:"Contest", reward:"Contest dependent", fundingSignal:"Published prize pool", deadline:"Upcoming & active", launchStage:"Pre-deployment review", existingAudits:"Competition scope provided", bountyProgram:"Public audit contest", contact:"Sponsor through contest", fitReason:"Strong match for competitive smart-contract review and visible proof of work.", suggestedScope:"Prioritize contests aligned with EVM, stablecoin, privacy and policy-control experience.", outreachDraft:"This is a contest source. Register and review the sponsor scope before beginning work.", stage:"Qualified", score:78, scoreBreakdown:JSON.stringify({Freshness:16,"Stack fit":20,"Budget signal":18,Urgency:12,"Security gap":6,Contactability:6}), summary:"Upcoming and active competitive audits with explicit deadlines and scopes." },
  { id:"source-hackerone", project:"HackerOne directory watch", repo:"Public security program directory", source:"HackerOne", sourceUrl:"https://hackerone.com/directory/programs", discoveredAt:"Live source", stack:"Web / API", category:"Bounty", reward:"Program dependent", fundingSignal:"Bounty statistics", deadline:"Ongoing", launchStage:"Production products", existingAudits:"Program dependent", bountyProgram:"VDP and bounty programs", contact:"Defined program channel", fitReason:"Useful expansion path from web3 contracts into wallets, APIs and product surfaces.", suggestedScope:"Use active-program and bounty filters; read each policy before testing.", outreachDraft:"This is a permissioned directory. Confirm assets, exclusions and safe-harbor terms first.", stage:"New", score:70, scoreBreakdown:JSON.stringify({Freshness:13,"Stack fit":12,"Budget signal":17,Urgency:9,"Security gap":9,Contactability:10}), summary:"A broad directory for discovering active vulnerability disclosure and bounty programs." },
];

function serialize(row: typeof leads.$inferSelect) {
  return { ...row, scoreBreakdown: JSON.parse(row.scoreBreakdown) as Record<string, number> };
}

async function ensureSeeded() {
  await ensureRuntimeSchema();
  const db = getDb();
  await db.insert(leads).values(sourceRows.map(row => ({ ...row, syncedAt:new Date().toISOString() }))).onConflictDoNothing();
}

function daysSince(date: string) { return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000)); }
function scoreRepo(repo: GithubRepo, missingSecurityPolicy: boolean) {
  const age = daysSince(repo.created_at);
  const pushAge = daysSince(repo.pushed_at);
  const freshness = age <= 3 ? 20 : age <= 7 ? 17 : age <= 14 ? 13 : 8;
  const stackFit = repo.language === "Solidity" || repo.language === "Move" ? 20 : repo.language === "Cairo" ? 18 : repo.language === "Rust" ? 16 : 10;
  const budget = repo.stargazers_count >= 100 ? 20 : repo.stargazers_count >= 25 ? 15 : repo.stargazers_count >= 5 ? 10 : 4;
  const urgency = pushAge <= 2 ? 15 : pushAge <= 7 ? 11 : 7;
  const securityGap = missingSecurityPolicy ? 15 : 4;
  const contactability = repo.homepage ? 10 : 6;
  const breakdown = { Freshness:freshness, "Stack fit":stackFit, "Budget signal":budget, Urgency:urgency, "Security gap":securityGap, Contactability:contactability };
  return { score:Object.values(breakdown).reduce((sum, item) => sum + item, 0), breakdown };
}

async function discoverGithub() {
  const since = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
  const queries = [
    `topic:defi language:Solidity created:>=${since} archived:false fork:false`,
    `topic:blockchain language:Rust created:>=${since} archived:false fork:false`,
    `topic:sui language:Move created:>=${since} archived:false fork:false`,
    `topic:starknet language:Cairo created:>=${since} archived:false fork:false`,
  ];
  const headers = { Accept:"application/vnd.github+json", "User-Agent":"Proskopos-opportunity-radar", "X-GitHub-Api-Version":"2022-11-28" };
  const groups = await Promise.all(queries.map(async query => {
    const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=4`, { headers });
    if (!response.ok) return [] as GithubRepo[];
    const payload = await response.json() as { items?: GithubRepo[] };
    return payload.items ?? [];
  }));
  const unique = Array.from(new Map(groups.flat().map(repo => [repo.id, repo])).values()).slice(0, 12);
  const enriched = await Promise.all(unique.map(async repo => {
    const policy = await fetch(`https://api.github.com/repos/${repo.full_name}/contents/SECURITY.md`, { headers });
    const missingSecurityPolicy = policy.status === 404;
    const { score, breakdown } = scoreRepo(repo, missingSecurityPolicy);
    const stack = repo.language ?? "Web3";
    return {
      id:`github-${repo.id}`, project:repo.name, repo:repo.full_name, source:"GitHub", sourceUrl:repo.html_url,
      discoveredAt:new Date(repo.created_at).toLocaleDateString("en", { month:"short", day:"numeric", year:"numeric" }), stack, category:"Prospect",
      reward:"Not published", fundingSignal:`${repo.stargazers_count} GitHub stars`, deadline:"Early discovery", launchStage:daysSince(repo.created_at) <= 7 ? "New repository" : "Active development",
      existingAudits:"No audit verified", bountyProgram:"No public program verified", contact:`@${repo.owner.login} on GitHub`,
      fitReason:`A recently created ${stack} codebase with active public development${missingSecurityPolicy ? " and no root SECURITY.md detected" : ""}.`,
      suggestedScope:`Offer a permissioned architecture and ${stack} code review focused on trust boundaries, access control and high-impact state transitions.`,
      outreachDraft:`Hi ${repo.owner.login} — I came across ${repo.full_name} while tracking newly active web3 codebases. I audit ${stack} systems and noticed the project is moving quickly. If an external review is timely, I can propose a narrow, permissioned scope around trust boundaries, access control and critical state transitions. Happy to send a short methodology and relevant work first.`,
      stage:"New", score, scoreBreakdown:JSON.stringify(breakdown), summary:repo.description || `A recently active public ${stack} repository surfaced by the Proskopos discovery query.`, syncedAt:new Date().toISOString(),
    };
  }));
  return enriched;
}

async function listLeads() {
  const db = getDb();
  const rows = await db.select().from(leads).orderBy(desc(leads.score), desc(leads.syncedAt)).limit(100);
  return rows.map(serialize);
}

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await listLeads();
    return Response.json({ leads:rows, lastSynced:rows.find(item => item.source === "GitHub")?.syncedAt });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "Unable to load leads" }, { status:500 });
  }
}

export async function POST() {
  try {
    await ensureSeeded();
    const db = getDb();
    const discovered = await discoverGithub();
    for (const row of discovered) {
      const freshEvidence = Object.fromEntries(Object.entries(row).filter(([key]) => key !== "stage")) as Omit<typeof row, "stage">;
      await db.insert(leads).values(row).onConflictDoUpdate({ target:leads.id, set:freshEvidence });
    }
    const rows = await listLeads();
    return Response.json({ leads:rows, added:discovered.length, lastSynced:new Date().toISOString() });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "Unable to sync sources" }, { status:500 });
  }
}
