import { NextResponse } from "next/server";
import { adminSession, apiError, AdminApiError, PRIVATE_HEADERS } from "@/lib/admin-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Explicitly acknowledge a received request; opening a tab must never mark items read. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(id))
      throw new AdminApiError(400, "INVALID_ID", "Referencia de solicitud inválida.");
    const { db, uid } = await adminSession(request);
    const ref = db.collection("customer_requests").doc(id);
    let reviewedAt: string | undefined;
    await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data();
      if (!snapshot.exists || data?.status !== "received")
        throw new AdminApiError(404, "REQUEST_NOT_FOUND", "Solicitud recibida no encontrada.");
      if (typeof data.reviewedAt === "string") {
        reviewedAt = data.reviewedAt; // Idempotent across tabs and devices.
        return;
      }
      const now = new Date().toISOString();
      reviewedAt = now;
      transaction.update(ref, { reviewedAt: now, reviewedBy: uid, updatedAt: now });
      transaction.set(db.collection("admin_audit").doc(), {
        resource: "customer_requests", target: id, action: "mark_reviewed", actor: uid, at: now,
      });
    });
    return NextResponse.json({ id, reviewedAt, reviewed: true }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
