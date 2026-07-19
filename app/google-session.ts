import { env } from "cloudflare:workers";

const encoder = new TextEncoder();
const runtime = () => env as unknown as Record<string,string|undefined>;
export const googleClientId = () => runtime().GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
const sessionSecret = () => runtime().SESSION_SECRET || process.env.SESSION_SECRET || (process.env.NODE_ENV === "development" ? "proskopos-local-development-session-secret" : "");
const b64url = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"");
const fromB64url = (value:string) => Uint8Array.from(atob(value.replaceAll("-","+").replaceAll("_","/").padEnd(Math.ceil(value.length/4)*4,"=")),(character)=>character.charCodeAt(0));

export type GoogleIdentity = { email:string; displayName:string };

async function hmac(value:string) {
  const key=await crypto.subtle.importKey("raw",encoder.encode(sessionSecret()),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(value))));
}

export async function createSession(identity:GoogleIdentity) {
  if (!sessionSecret()) throw new Error("Google session secret is not configured.");
  const payload=b64url(encoder.encode(JSON.stringify({...identity,exp:Math.floor(Date.now()/1000)+60*60*24*30})));
  return `${payload}.${await hmac(payload)}`;
}

export async function verifySession(token:string|undefined):Promise<GoogleIdentity|null> {
  if (!token || !sessionSecret()) return null;
  const [payload,signature]=token.split("."); if(!payload||!signature||await hmac(payload)!==signature)return null;
  try { const value=JSON.parse(new TextDecoder().decode(fromB64url(payload))) as GoogleIdentity&{exp:number}; return value.exp>Date.now()/1000?{email:value.email,displayName:value.displayName}:null; } catch { return null; }
}

export async function verifyGoogleCredential(credential:string):Promise<GoogleIdentity> {
  const clientId=googleClientId(); if(!clientId)throw new Error("Google sign-in is not configured.");
  const parts=credential.split("."); if(parts.length!==3)throw new Error("Invalid Google credential.");
  const header=JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as {kid?:string;alg?:string};
  const payload=JSON.parse(new TextDecoder().decode(fromB64url(parts[1]))) as {aud?:string;iss?:string;exp?:number;email?:string;email_verified?:boolean;name?:string};
  const keysResponse=await fetch("https://www.googleapis.com/oauth2/v3/certs",{signal:AbortSignal.timeout(8000)}); if(!keysResponse.ok)throw new Error("Google key verification is unavailable.");
  const {keys}=await keysResponse.json() as {keys:Array<JsonWebKey&{kid?:string}>}; const jwk=keys.find((key)=>key.kid===header.kid); if(!jwk||header.alg!=="RS256")throw new Error("Unrecognized Google signing key.");
  const key=await crypto.subtle.importKey("jwk",jwk,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  const valid=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,fromB64url(parts[2]),encoder.encode(`${parts[0]}.${parts[1]}`));
  if(!valid||payload.aud!==clientId||!['accounts.google.com','https://accounts.google.com'].includes(payload.iss||"")||!payload.exp||payload.exp<Date.now()/1000||!payload.email||!payload.email_verified)throw new Error("Google credential verification failed.");
  return {email:payload.email.toLowerCase(),displayName:payload.name||payload.email.split("@")[0]};
}
