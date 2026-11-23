import { NextResponse } from "next/server";
import { publicDatabase, apiError, AdminApiError } from "@/lib/admin-server";
import { productImageBucket } from "@/lib/product-image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Params = { params: Promise<{id: string}> };

export async function GET(_request: Request, {params}: Params) {
  try {
    const {id} = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AdminApiError(404,"NOT_FOUND","Imagen no disponible");
    const imageUrl = "/api/catalog/images/" + id;
    // Read-only Preview without Firebase credentials: delegate to production's
    // PUBLIC catalogue-image route, which already verifies publication.
    if(process.env.VERCEL_ENV==="preview" && process.env.ATHELIER_FIRESTORE_RULES_CONFIRMED!=="true"){
      const response=await fetch("https://athelier.mx"+imageUrl,{cache:"no-store"});
      if(!response.ok)throw new AdminApiError(404,"NOT_FOUND","Imagen no disponible");
      const mime=response.headers.get("content-type")??"";
      if(!["image/jpeg","image/png","image/webp"].includes(mime))
        throw new AdminApiError(404,"NOT_FOUND","Imagen no disponible");
      return new NextResponse(new Uint8Array(await response.arrayBuffer()),{
        headers:{"Content-Type":mime,"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"},
      });
    }
    const db = publicDatabase();
    const [main, gallery] = await Promise.all([
      db.collection("admin_products").where("imageUrl", "==", imageUrl).limit(10).get(),
      db.collection("admin_products").where("galleryImageUrls", "array-contains", imageUrl).limit(10).get(),
    ]);
    if (![...main.docs, ...gallery.docs].some(doc => doc.get("status") === "published"))
      throw new AdminApiError(404,"NOT_FOUND","Imagen no disponible");
    const object = productImageBucket().file("catalog-products/" + id);
    const [metadata] = await object.getMetadata();
    const mime = metadata.contentType || "";
    if (!["image/jpeg","image/png","image/webp"].includes(mime))
      throw new AdminApiError(404,"NOT_FOUND","Imagen no disponible");
    const [bytes] = await object.download();
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      }
    });
  } catch (error) {
    // Do not expose object existence or internal Storage details to public clients.
    if (error instanceof AdminApiError) return apiError(error);
    return NextResponse.json({error:"Imagen no disponible"},{status:404,headers:{"Cache-Control":"no-store"}});
  }
}
