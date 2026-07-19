import { cookies, headers } from "next/headers";
import { verifySession } from "./google-session";
export type CurrentUser={displayName:string;email:string};
export async function getCurrentUser():Promise<CurrentUser|null>{const requestHeaders=await headers();const sitesEmail=requestHeaders.get("oai-authenticated-user-email");if(sitesEmail){const encoded=requestHeaders.get("oai-authenticated-user-full-name");let fullName="";if(encoded){try{fullName=decodeURIComponent(encoded)}catch{fullName=""}}return{email:sitesEmail.toLowerCase(),displayName:fullName||sitesEmail.split("@")[0]}}const cookieStore=await cookies();const googleUser=await verifySession(cookieStore.get("proskopos_session")?.value);if(googleUser)return googleUser;if(process.env.NODE_ENV==="development")return{email:"tester@proskopos.local",displayName:"Private tester"};return null}
export async function requireCurrentUser(){const user=await getCurrentUser();if(!user)throw new Error("AUTH_REQUIRED");return user}
