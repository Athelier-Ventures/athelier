import { NextResponse } from "next/server";
import { adminSession, apiError, PRIVATE_HEADERS } from "@/lib/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { uid, email } = await adminSession(request);
    return NextResponse.json({ authorized: true, uid, email }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
