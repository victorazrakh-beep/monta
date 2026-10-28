import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { dataForSeoConfigured, importGoogleVenues } from "@/lib/dataforseo";

export const maxDuration = 60;

// Vercel Cron (weekly): refreshes /espacios from Google Maps through DataForSEO.
export async function GET(req: Request) {
  if (env.cronSecret && req.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!dataForSeoConfigured()) return NextResponse.json({ error: "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD missing" }, { status: 500 });
  const result = await importGoogleVenues();
  console.log("[import-venues]", JSON.stringify(result));
  revalidatePath("/espacios");
  return NextResponse.json(result);
}
