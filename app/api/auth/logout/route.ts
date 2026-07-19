import { cookies } from "next/headers";
export async function POST(){const store=await cookies();store.set("proskopos_session","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});return Response.json({ok:true})}
