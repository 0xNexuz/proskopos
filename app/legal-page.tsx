import Link from "next/link";
export function LegalPage({title,updated,children}:{title:string;updated:string;children:React.ReactNode}){return <main className="legal"><Link href="/" className="legal-back">← Back to Proskopos</Link><p className="eyebrow">Private beta policy</p><h1>{title}</h1><p className="legal-date">Last updated {updated}</p><div className="legal-copy">{children}</div></main>}
