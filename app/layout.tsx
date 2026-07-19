import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  return { metadataBase:base, title:"Proskopos - Web3 Audit Opportunity Intelligence", description:"Find and qualify emerging Web3 audit opportunities before the window closes.", openGraph:{ title:"Proskopos - Find Web3 security work that fits", description:"Explainable opportunity intelligence for Web3 security auditors.", type:"website", images:[{url:new URL("/og.png",base),width:1728,height:900,alt:"Proskopos opportunity forest and Web3 security radar"}] }, twitter:{ card:"summary_large_image", title:"Proskopos", description:"Web3 audit opportunity intelligence.", images:[new URL("/og.png",base)] } };
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
