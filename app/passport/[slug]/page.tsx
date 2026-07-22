import { and, eq } from "drizzle-orm";
import { ensureRuntimeSchema, getDb } from "../../../db";
import { userProfiles } from "../../../db/schema";
import { jsonArray } from "../../data-service";

export const dynamic = "force-dynamic";

function Logo(){return <span className="logo"><span className="logo-mark" aria-hidden="true"><i/><i/><i/></span><span>PROSKOPOS</span></span>}

export default async function PassportPage({params}:{params:Promise<{slug:string}>}){
  await ensureRuntimeSchema();
  const {slug}=await params;
  const rows=await getDb().select().from(userProfiles).where(and(eq(userProfiles.passportSlug,slug),eq(userProfiles.passportPublic,true))).limit(1);
  const profile=rows[0];
  if(!profile)return <main className="passport-not-found"><Logo/><h1>This Security Passport is private.</h1><p>Ask its owner for an active public link.</p><a href="/">Return to Proskopos</a></main>;
  const stacks=jsonArray(profile.stacks),chains=jsonArray(profile.chains),specialties=jsonArray(profile.specialties),reports=jsonArray(profile.auditReportUrls);
  const code=slug.split("").reduce((sum,character)=>sum+character.charCodeAt(0),0).toString(16).toUpperCase().padStart(6,"0").slice(-6);
  return <main className="passport-public">
    <nav><Logo/><a href="/">Opportunity radar</a></nav>
    <section className="passport-intro"><p>PROSKOPOS SECURITY PASSPORT</p><h1>Proof of focus.<br/>Ready for the right scope.</h1><span>An opt-in professional identity for responsible Web3 security work.</span></section>
    <article className="security-passport-card">
      <div className="passport-orbit" aria-hidden="true"><i/><i/><i/></div>
      <header><div><small>SECURITY PASSPORT</small><b>P-{code}</b></div><span className="passport-live"><i/> AVAILABLE</span></header>
      <div className="passport-identity"><div className="passport-portrait">{profile.displayName.split(/\s+/).map((part)=>part[0]).join("").slice(0,2).toUpperCase()}</div><div><p>RESEARCHER</p><h2>{profile.displayName}</h2><strong>{profile.passportHeadline}</strong></div></div>
      <p className="passport-bio">{profile.passportBio||"Independent researcher focused on careful scoping, explainable risk, and permission-first security work."}</p>
      <div className="passport-field-grid"><div><small>CORE STACKS</small><p>{stacks.join(" · ")||"Not listed"}</p></div><div><small>ECOSYSTEMS</small><p>{chains.join(" · ")||"Multi-chain"}</p></div><div><small>FOCUS AREAS</small><p>{specialties.join(" · ")||"Smart contract security"}</p></div><div><small>ENGAGEMENT</small><p>{profile.availability} · {profile.region}</p></div></div>
      <footer><span>Verified by owner · Permission-first</span><b>PROSKOPOS / {code}</b></footer>
    </article>
    <section className="passport-proof"><div><p>SELECTED PROOF</p><h2>A compact trail of public work.</h2></div><div className="proof-links">{profile.githubUrl&&<a href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub profile <span>↗</span></a>}{profile.portfolioUrl&&<a href={profile.portfolioUrl} target="_blank" rel="noreferrer">Portfolio <span>↗</span></a>}{reports.map((url,index)=><a href={url} key={url} target="_blank" rel="noreferrer">Audit report {index+1} <span>↗</span></a>)}{!profile.githubUrl&&!profile.portfolioUrl&&!reports.length&&<p>Public reports will appear here when the owner adds them.</p>}</div></section>
    <footer className="passport-page-footer"><Logo/><p>Opportunity intelligence for responsible Web3 security work.</p></footer>
  </main>
}
