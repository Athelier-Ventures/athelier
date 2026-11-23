import { NextResponse } from "next/server";
import { apiError, publicDatabase, AdminApiError } from "@/lib/admin-server";
import { findBusinessLine } from "@/lib/brand";
import { permitsBasePurchase, type CommercialProduct } from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{ linea: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { linea } = await params;
    if (!findBusinessLine(linea)) throw new AdminApiError(404, "NOT_FOUND", "Colección desconocida");
    // When preview has no Firestore credentials, use PUBLIC production catalogue data (GET only).
    // No write requests, secrets, photos or admin resources are proxied.
    if (process.env.VERCEL_ENV === "preview" && process.env.ATHELIER_FIRESTORE_RULES_CONFIRMED !== "true") {
      const response = await fetch("https://athelier.mx/api/catalog/" + encodeURIComponent(linea), {cache:"no-store"});
      if(!response.ok)throw new AdminApiError(503,"PREVIEW_CATALOG_UNAVAILABLE","Catálogo de prueba temporalmente no disponible.");
      const payload:unknown=await response.json();
      if(!payload||typeof payload!=="object"||!("items" in payload)||!Array.isArray(payload.items))
        throw new AdminApiError(503,"PREVIEW_CATALOG_INVALID","Catálogo de prueba inválido.");
      const items=payload.items.map((raw:unknown)=>{
        const p=raw as {id:string;title:string;description?:string;imageUrl?:string;allowBasePurchase?:boolean;photoSlots?:unknown[];basePriceCents:number;optionGroups:unknown[];lineIds:string[]};
        return {id:p.id,title:p.title,description:p.description??"",imageUrl:p.imageUrl??"",
          allowBasePurchase:permitsBasePurchase(p as CommercialProduct),
          photoSlots:p.photoSlots??[],basePriceCents:p.basePriceCents,currency:"MXN",
          optionGroups:p.optionGroups??[],lineIds:p.lineIds??[]};
      }).filter((p:{lineIds:string[]})=>p.lineIds.includes(linea));
      return NextResponse.json({items},{headers:{"Cache-Control":"no-store","X-Athelier-Preview-Data":"public-catalog-read-only"}});
    }
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
        allowBasePurchase: permitsBasePurchase(product as CommercialProduct),
        photoSlots: Array.isArray(product.photoSlots) ? product.photoSlots : [],
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
