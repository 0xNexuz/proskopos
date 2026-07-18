"use client";

import { useEffect, useMemo, useState } from "react";

type Stage = "New" | "Qualified" | "Contacted" | "Replied" | "Won" | "Lost";

type Lead = {
  id: string;
  project: string;
  repo: string;
  source: string;
  sourceUrl: string;
  discoveredAt: string;
  stack: string;
  category: string;
  reward: string;
  fundingSignal: string;
  deadline: string;
  launchStage: string;
  existingAudits: string;
  bountyProgram: string;
  contact: string;
  fitReason: string;
  suggestedScope: string;
  outreachDraft: string;
  stage: Stage;
  score: number;
  scoreBreakdown: Record<string, number>;
  summary: string;
};

const stages: Stage[] = ["New", "Qualified", "Contacted", "Replied", "Won", "Lost"];

const fallbackLeads: Lead[] = [
  {
    id: "source-immunefi",
    project: "Immunefi bounty watch",
    repo: "Public web3 bounty directory",
    source: "Immunefi",
    sourceUrl: "https://immunefi.com/bug-bounty/",
    discoveredAt: "Live source",
    stack: "Multi-chain",
    category: "Bounty",
    reward: "Program dependent",
    fundingSignal: "Published bounty pool",
    deadline: "Ongoing",
    launchStage: "Live protocols",
    existingAudits: "Check each program",
    bountyProgram: "Active directory",
    contact: "Program security contact",
    fitReason: "Direct access to scoped, permissioned web3 vulnerability programs.",
    suggestedScope: "Filter for EVM, Rust, Move and Soroban assets before reviewing program rules.",
    outreachDraft: "This is a bounty source. Review the program scope and disclosure policy before testing.",
    stage: "New",
    score: 82,
    scoreBreakdown: { Freshness: 17, "Stack fit": 18, "Budget signal": 20, Urgency: 10, "Security gap": 10, Contactability: 7 },
    summary: "A permissioned feed of web3 programs with defined scopes and rewards.",
  },
  {
    id: "source-code4rena",
    project: "Code4rena audit watch",
    repo: "Competitive audit opportunities",
    source: "Code4rena",
    sourceUrl: "https://code4rena.com/audits",
    discoveredAt: "Live source",
    stack: "Solidity / Rust",
    category: "Contest",
    reward: "Contest dependent",
    fundingSignal: "Published prize pool",
    deadline: "Upcoming & active",
    launchStage: "Pre-deployment review",
    existingAudits: "Competition scope provided",
    bountyProgram: "Public audit contest",
    contact: "Sponsor through contest",
    fitReason: "Strong match for competitive smart-contract review and visible proof of work.",
    suggestedScope: "Prioritize contests aligned with EVM, stablecoin, privacy and policy-control experience.",
    outreachDraft: "This is a contest source. Register and review the sponsor scope before beginning work.",
    stage: "Qualified",
    score: 78,
    scoreBreakdown: { Freshness: 16, "Stack fit": 20, "Budget signal": 18, Urgency: 12, "Security gap": 6, Contactability: 6 },
    summary: "Upcoming and active competitive audits with explicit deadlines and scopes.",
  },
  {
    id: "source-hackerone",
    project: "HackerOne directory watch",
    repo: "Public security program directory",
    source: "HackerOne",
    sourceUrl: "https://hackerone.com/directory/programs",
    discoveredAt: "Live source",
    stack: "Web / API",
    category: "Bounty",
    reward: "Program dependent",
    fundingSignal: "Bounty statistics",
    deadline: "Ongoing",
    launchStage: "Production products",
    existingAudits: "Program dependent",
    bountyProgram: "VDP and bounty programs",
    contact: "Defined program channel",
    fitReason: "Useful expansion path from web3 contracts into wallets, APIs and product surfaces.",
    suggestedScope: "Use active-program and bounty filters; read each policy before testing.",
    outreachDraft: "This is a permissioned directory. Confirm assets, exclusions and safe-harbor terms first.",
    stage: "New",
    score: 70,
    scoreBreakdown: { Freshness: 13, "Stack fit": 12, "Budget signal": 17, Urgency: 9, "Security gap": 9, Contactability: 10 },
    summary: "A broad directory for discovering active vulnerability disclosure and bounty programs.",
  },
];

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i className="mark-staff" />
      <i className="mark-wave wave-one" />
      <i className="mark-wave wave-two" />
      <i className="mark-dot" />
    </span>
  );
}

function ScoreDial({ score }: { score: number }) {
  return (
    <div className="score-dial" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}>
      <div><strong>{score}</strong><span>/100</span></div>
    </div>
  );
}

function formatSyncDate(value?: string) {
  if (!value) return "Not synced yet";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function ProskoposApp() {
  const [leads, setLeads] = useState<Lead[]>(fallbackLeads);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All sources");
  const [stack, setStack] = useState("All stacks");
  const [stage, setStage] = useState("Active pipeline");
  const [sort, setSort] = useState("Highest score");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/leads", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load feed");
        return response.json() as Promise<{ leads: Lead[]; lastSynced?: string }>;
      })
      .then(data => {
        if (!active) return;
        if (data.leads?.length) setLeads(data.leads);
        setLastSynced(data.lastSynced);
      })
      .catch(() => {
        if (active) setNotice("Source watch is available; live GitHub discovery will resume on the next sync.");
      });
    return () => { active = false; };
  }, []);

  async function syncSignals() {
    setSyncing(true);
    setNotice("");
    try {
      const response = await fetch("/api/leads", { method: "POST" });
      const data = (await response.json()) as { leads?: Lead[]; lastSynced?: string; added?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "Sync failed");
      if (data.leads?.length) setLeads(data.leads);
      setLastSynced(data.lastSynced);
      setNotice(`${data.added ?? 0} fresh public-code signal${data.added === 1 ? "" : "s"} added. Scores recalculated.`);
    } catch {
      setNotice("The live source is rate-limited right now. Existing leads remain available.");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStage(id: string, nextStage: Stage) {
    const previous = leads;
    setLeads(items => items.map(item => item.id === id ? { ...item, stage: nextStage } : item));
    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: nextStage }),
      });
      if (!response.ok) throw new Error("Save failed");
      setNotice(`Moved to ${nextStage}.`);
    } catch {
      setLeads(previous);
      setNotice("That pipeline change could not be saved. Please retry.");
    }
  }

  const sources = useMemo(() => ["All sources", ...Array.from(new Set(leads.map(item => item.source))).sort()], [leads]);
  const stacks = useMemo(() => ["All stacks", ...Array.from(new Set(leads.map(item => item.stack))).sort()], [leads]);

  const visibleLeads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = leads.filter(item => {
      const matchesText = !normalized || [item.project, item.repo, item.stack, item.source, item.summary].join(" ").toLowerCase().includes(normalized);
      const matchesSource = source === "All sources" || item.source === source;
      const matchesStack = stack === "All stacks" || item.stack === stack;
      const matchesStage = stage === "All stages" || (stage === "Active pipeline" ? !["Won", "Lost"].includes(item.stage) : item.stage === stage);
      return matchesText && matchesSource && matchesStack && matchesStage;
    });
    return filtered.sort((a, b) => sort === "Newest" ? b.discoveredAt.localeCompare(a.discoveredAt) : sort === "Deadline" ? a.deadline.localeCompare(b.deadline) : b.score - a.score);
  }, [leads, query, source, stack, stage, sort]);

  const topLead = [...leads].sort((a, b) => b.score - a.score)[0] ?? fallbackLeads[0];
  const qualified = leads.filter(item => item.stage === "Qualified").length;
  const contacted = leads.filter(item => item.stage === "Contacted").length;
  const active = leads.filter(item => !["Won", "Lost"].includes(item.stage)).length;

  return (
    <main>
      <header className="site-header">
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open navigation"><span /><span /></button>
        <a className="brand" href="#top"><Mark /><span>PROSKOPOS</span></a>
        <a className="account-link" href="#pipeline">Your pipeline <b>{active}</b></a>
        {menuOpen && <nav className="menu-panel"><a href="#radar" onClick={() => setMenuOpen(false)}>Opportunity radar</a><a href="#method" onClick={() => setMenuOpen(false)}>Scoring method</a><a href="#pipeline" onClick={() => setMenuOpen(false)}>Pipeline</a><a href="#faq" onClick={() => setMenuOpen(false)}>Questions</a></nav>}
      </header>

      <section className="hero" id="top">
        <div className="pastel-block mint-block" />
        <div className="pastel-block lilac-block" />
        <div className="hero-signal signal-left"><span>NEW SIGNAL</span><b>Move repository</b><small>Fresh push · no security policy</small></div>
        <div className="hero-signal signal-right"><span>BOUNTY</span><b>Scope opens soon</b><small>Prize pool detected</small></div>
        <div className="hero-copy">
          <p className="eyebrow">Web3 security opportunity intelligence</p>
          <h1>Reach the audit window<br />before it closes.</h1>
          <p className="lede">Proskopos finds fresh bounties, codebases and launch signals—then explains which opportunities deserve your attention.</p>
          <a className="primary-button" href="#radar">Open today&apos;s radar <span>→</span></a>
          <small>Permission-first discovery · every score explained</small>
        </div>
      </section>

      <section className="steps-section">
        <p className="section-kicker">A clear morning brief</p>
        <h2>From scattered signals to one qualified pipeline.</h2>
        <div className="three-up">
          <article><span className="step-icon">01</span><h3>Watch the right sources</h3><p>Public GitHub repositories, bounty directories and competitive-audit boards arrive in one feed.</p></article>
          <article><span className="step-icon">02</span><h3>See the reason behind 86</h3><p>Freshness, stack fit, budget, urgency, security gap and contactability stay visible.</p></article>
          <article><span className="step-icon">03</span><h3>Move while it is timely</h3><p>Qualify the lead, shape a relevant scope and track outreach without losing context.</p></article>
        </div>
      </section>

      <section className="dispatch-section">
        <div className="dispatch-panel">
          <div className="dispatch-visual">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><Mark /></div>
            <span className="visual-label">Strongest dispatch today</span>
          </div>
          <div className="dispatch-copy">
            <p className="eyebrow">Lead of the day · {topLead.source}</p>
            <h2>{topLead.project}</h2>
            <p>“{topLead.fitReason}”</p>
            <div className="dispatch-meta"><ScoreDial score={topLead.score} /><div><small>Suggested first move</small><strong>{topLead.suggestedScope}</strong></div></div>
          </div>
        </div>
      </section>

      <section className="radar-section" id="radar">
        <div className="radar-heading">
          <div><p className="section-kicker">Opportunity radar</p><h2>Signals worth a closer look.</h2><p>Live public-code discovery plus trusted bounty and contest watchlists.</p></div>
          <div className="sync-box"><span className={syncing ? "sync-dot spinning" : "sync-dot"}>↻</span><div><small>Last source sync</small><strong>{formatSyncDate(lastSynced)}</strong></div><button onClick={syncSignals} disabled={syncing}>{syncing ? "Scanning…" : "Sync signals"}</button></div>
        </div>

        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

        <div className="filter-bar">
          <label className="search-field"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects, stacks or sources" /></label>
          <label><span>Source</span><select value={source} onChange={event => setSource(event.target.value)}>{sources.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Stack</span><select value={stack} onChange={event => setStack(event.target.value)}>{stacks.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Stage</span><select value={stage} onChange={event => setStage(event.target.value)}><option>Active pipeline</option><option>All stages</option>{stages.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>Sort</span><select value={sort} onChange={event => setSort(event.target.value)}><option>Highest score</option><option>Newest</option><option>Deadline</option></select></label>
        </div>

        <div className="results-line"><span>{visibleLeads.length} opportunities</span><span>Scores refresh when source evidence changes</span></div>
        <div className="lead-grid">
          {visibleLeads.map(lead => {
            const isExpanded = expanded === lead.id;
            return (
              <article className={`lead-card ${isExpanded ? "expanded" : ""}`} key={lead.id}>
                <div className="lead-card-top"><div><span className={`category-tag ${lead.category.toLowerCase()}`}>{lead.category}</span><span className="source-name">via {lead.source}</span></div><ScoreDial score={lead.score} /></div>
                <p className="discovered">Discovered {lead.discoveredAt}</p>
                <h3>{lead.project}</h3>
                <p className="repo-name">{lead.repo}</p>
                <p className="lead-summary">{lead.summary}</p>
                <div className="signal-row"><span><small>Stack</small><b>{lead.stack}</b></span><span><small>Budget signal</small><b>{lead.fundingSignal}</b></span><span><small>Timing</small><b>{lead.deadline}</b></span></div>
                <div className="fit-note"><span>Why it fits</span><p>{lead.fitReason}</p></div>
                <button className="details-toggle" onClick={() => setExpanded(isExpanded ? null : lead.id)} aria-expanded={isExpanded}>{isExpanded ? "Close evidence" : "View evidence & score"}<span>{isExpanded ? "−" : "+"}</span></button>
                {isExpanded && (
                  <div className="lead-details">
                    <div className="score-breakdown">
                      <h4>Explainable score</h4>
                      {Object.entries(lead.scoreBreakdown).map(([label, value]) => {
                        const max = label === "Urgency" || label === "Security gap" ? 15 : label === "Contactability" ? 10 : 20;
                        return <div className="score-row" key={label}><span>{label}</span><div><i style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div><b>{value}/{max}</b></div>;
                      })}
                    </div>
                    <dl className="evidence-list"><div><dt>Launch stage</dt><dd>{lead.launchStage}</dd></div><div><dt>Existing audits</dt><dd>{lead.existingAudits}</dd></div><div><dt>Bounty program</dt><dd>{lead.bountyProgram}</dd></div><div><dt>Public contact</dt><dd>{lead.contact}</dd></div><div><dt>Suggested scope</dt><dd>{lead.suggestedScope}</dd></div></dl>
                    <div className="outreach-draft"><span>Permission-first outreach draft</span><p>{lead.outreachDraft}</p><button onClick={() => { void navigator.clipboard?.writeText(lead.outreachDraft); setNotice("Outreach draft copied."); }}>Copy draft</button></div>
                  </div>
                )}
                <div className="card-actions"><label><span>Pipeline stage</span><select value={lead.stage} onChange={event => updateStage(lead.id, event.target.value as Stage)}>{stages.map(item => <option key={item}>{item}</option>)}</select></label><a href={lead.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div>
              </article>
            );
          })}
          {!visibleLeads.length && <div className="empty-state"><Mark /><h3>No matching dispatches</h3><p>Clear a filter or sync the sources to widen today&apos;s radar.</p></div>}
        </div>
      </section>

      <section className="method-section" id="method">
        <div className="method-copy"><p className="section-kicker">No mystery ranking</p><h2>Six signals make every score defensible.</h2><p>A high number is only useful when you can explain it. Proskopos shows the evidence, weight and trade-off behind every lead.</p><a href="#faq">Read the scoring notes →</a></div>
        <div className="weights-card">
          {[['Freshness',20,'How recently the project or program appeared.'],['Stack fit',20,'Match with Solidity, Rust, Move, Cairo or Soroban.'],['Budget signal',20,'Reward, funding, TVL or credible traction.'],['Launch urgency',15,'Release, contest or deployment timing.'],['Security gap',15,'Missing policy, audit or recent coverage.'],['Contactability',10,'A legitimate public route to the team.']].map(([label, weight, description]) => <div className="weight-row" key={String(label)}><strong>{weight}</strong><div><b>{label}</b><p>{description}</p></div></div>)}
        </div>
      </section>

      <section className="pipeline-section" id="pipeline">
        <div className="pipeline-intro"><p className="eyebrow">Your working pipeline</p><h2>Discovery is only useful when it becomes a conversation.</h2><p>Move each lead from signal to qualified scope, keep the reason for contact attached, and preserve a clean record of outcomes.</p></div>
        <div className="pipeline-board">
          {stages.slice(0, 5).map(item => <div key={item} className="pipeline-column"><span>{item}</span><strong>{leads.filter(lead => lead.stage === item).length}</strong><div className="pipeline-line"><i style={{ width: `${Math.max(8, leads.length ? leads.filter(lead => lead.stage === item).length / leads.length * 100 : 0)}%` }} /></div></div>)}
        </div>
        <div className="pipeline-proof"><div><span>{active}</span><p>active signals</p></div><div><span>{qualified}</span><p>qualified leads</p></div><div><span>{contacted}</span><p>outreach started</p></div></div>
      </section>

      <section className="faq-section" id="faq">
        <p className="section-kicker">Frequently asked questions</p><h2>Useful boundaries, clearly stated.</h2>
        <div className="faq-list">
          {[['Does Proskopos test projects automatically?','No. Discovery is passive. Testing begins only inside an explicit bounty scope or after written audit authorization.'],['Where do the opportunity scores come from?','The six visible factors total 100 points: freshness 20, stack fit 20, budget signal 20, urgency 15, security gap 15 and contactability 10.'],['Are GitHub leads confirmed audit buyers?','No. They are public-code signals to qualify, not guaranteed buyers. Funding, launch timing and a public contact make a lead stronger, but human review stays essential.'],['What happens when I change a pipeline stage?','The change is saved to the project database so your working state survives refreshes and future sessions.'],['Can this expand beyond web3?','Yes. The same model can add SaaS, API and mobile-product sources later without weakening the web3-first launch.']].map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}
        </div>
      </section>

      <section className="final-cta">
        <p className="eyebrow">The next strong lead may already be public</p><h2>Know where to look.<br />Know why to move.</h2><p>Sync the sources, qualify the evidence and start with a scope that fits the project.</p><a className="primary-button" href="#radar">Return to the radar <span>↑</span></a>
      </section>

      <footer>
        <div className="footer-top"><div><a className="brand footer-brand" href="#top"><Mark /><span>PROSKOPOS</span></a><p>Web3 audit opportunity intelligence.</p></div><div><span>Product</span><a href="#radar">Radar</a><a href="#method">Scoring</a><a href="#pipeline">Pipeline</a></div><div><span>Sources</span><a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a><a href="https://immunefi.com/bug-bounty/" target="_blank" rel="noreferrer">Immunefi</a><a href="https://code4rena.com/audits" target="_blank" rel="noreferrer">Code4rena</a></div><div><span>Principle</span><p>Passive discovery.<br />Permissioned review.<br />Evidence before outreach.</p></div></div>
        <div className="footer-bottom"><span>© 2026 Proskopos</span><span>Built for precise, respectful security work.</span><a href="#top">Back to top ↑</a></div>
      </footer>
    </main>
  );
}
