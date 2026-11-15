import { NextResponse } from "next/server";
import { apiError, publicDatabase, AdminApiError } from "@/lib/admin-server";
import { findBusinessLine } from "@/lib/brand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ linea: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { linea } = await params;
    if (!findBusinessLine(linea)) throw new AdminApiError(404, "NOT_FOUND", "Colección desconocida");
    const db = publicDatabase();
    // Never expose suppliers, BOM materials, purchase costs or admin metadata.
    const data = await db.collection("admin_products").where("status", "==", "published").limit(250).get();
    const items = data.docs.map(doc => {
      const product = doc.data();
      return {
        id: doc.id,
        title: product.title,
        description: product.description ?? "",
        imageUrl: product.imageUrl ?? "",
        basePriceCents: product.basePriceCents,
        currency: "MXN",
        optionGroups: product.optionGroups ?? [],
        lineIds: product.lineIds ?? [],
      };
    }).filter(product => product.lineIds.includes(linea));
    return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
