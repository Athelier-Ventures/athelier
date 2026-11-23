import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { z } from "zod";
import { AdminApiError, publicDatabase } from "@/lib/admin-server";
import { productImageBucket, verifyImage } from "@/lib/product-image-storage";
import { configuredUnitPriceCents, photoSlotsForProduct, type CommercialProduct } from "@/lib/commerce";

const id = z.string().uuid();
const customerItem = z.object({
  id,
  productId: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(1000),
  selections: z.array(z.object({
    groupId: z.string().min(1).max(200), optionId: z.string().min(1).max(200),
    units: z.number().int().min(1).max(1000).optional(),
  }).strict()).max(50),
  photos: z.array(z.object({
    id, slotId: z.string().min(1).max(200), fileName: z.string().min(1).max(180),
  }).strict()).max(10),
}).strict();
export const requestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.union([z.email().max(180), z.literal("")]).default(""),
  phone: z.string().trim().max(32).default(""),
  note: z.string().trim().max(1500).default(""),
  consent: z.literal(true),
  website: z.literal("").default(""), // Honeypot: reject automated submissions that fill this field.
  items: z.array(customerItem).min(1).max(15),
}).strict().refine(x => x.email || x.phone.replace(/\D/g,"").length >= 10, "Proporciona correo o teléfono válido.");

export function publicUploadGate() {
  if (process.env.VERCEL_ENV === "preview" && process.env.ATHELIER_PREVIEW_UPLOADS_ENABLED !== "true")
    throw new AdminApiError(503,"PREVIEW_UPLOADS_DISABLED","El envío de imágenes está deshabilitado en Preview hasta configurar almacenamiento de prueba aislado.");
  productImageBucket(); // Fail closed if private storage is not configured.
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new AdminApiError(403,"INVALID_ORIGIN","Origen no permitido.");
}
export function sha(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function newToken() { return randomBytes(32).toString("hex"); }
export function requireToken(value: string, stored: unknown) {
  if (!/^[a-f0-9]{64}$/.test(value) || sha(value) !== stored)
    throw new AdminApiError(403, "ACCESS_DENIED", "La solicitud no está autorizada.");
}
export function requireOpen(doc: FirebaseFirestore.DocumentData | undefined) {
  if (!doc || doc.status !== "uploading" || Date.parse(String(doc.expiresAt)) <= Date.now())
    throw new AdminApiError(409,"REQUEST_EXPIRED","La solicitud ya finalizó o expiró.");
}
export async function limitRequests(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!ip || !key) throw new AdminApiError(503,"RATE_LIMIT_UNAVAILABLE","No es posible verificar el límite de solicitudes.");
  const day = new Date().toISOString().slice(0,10);
  const hash = createHmac("sha256",key).update(day + ":" + ip).digest("hex");
  const db=publicDatabase();
  const doc=db.collection("customer_request_limits").doc(hash);
  await db.runTransaction(async tx=>{
    const old=await tx.get(doc);
    const count = Number(old.get("count") || 0);
    if (count>=5) throw new AdminApiError(429,"RATE_LIMIT","Se alcanzó el límite diario de solicitudes.");
    tx.set(doc,{count:count+1,date:day,expiresAt:new Date(Date.now()+2*86400000).toISOString()});
  });
}

export type RequestAttachment = {
  id:string;itemId:string;productId:string;slotId:string;slotLabel:string;fileName:string;uploaded:boolean;contentType?:string;size?:number;
};
export async function verifyRequestItems(items: z.infer<typeof customerItem>[]) {
  const db=publicDatabase();
  const result: Array<{id:string;productId:string;productTitle:string;quantity:number;unitPriceCents:number;linePriceCents:number;selections:z.infer<typeof customerItem>["selections"]}>=[];
  const photos:RequestAttachment[]=[];
  for (const item of items) {
    const productRef=db.collection("admin_products").doc(item.productId);
    const doc=await productRef.get();
    const product=doc.data();
    if (!doc.exists || product?.status!=="published") throw new AdminApiError(409,"PRODUCT_UNAVAILABLE","Uno de los productos ya no está publicado.");
    let unitPriceCents:number;
    try {unitPriceCents=configuredUnitPriceCents({...product,id:doc.id} as CommercialProduct,item.selections);} catch {
      throw new AdminApiError(409,"OPTIONS_CHANGED","Las opciones del producto cambiaron. Actualiza el carrito.");
    }
    const slots=photoSlotsForProduct(product as CommercialProduct);
    for (const photo of item.photos) {
      const slot=slots.find(x=>x.id===photo.slotId);
      if (!slot) throw new AdminApiError(400,"INVALID_PHOTO_SLOT","La sección de fotos ya no está disponible.");
      if (item.photos.filter(x=>x.slotId===slot.id).length>slot.maxFiles)
        throw new AdminApiError(400,"TOO_MANY_PHOTOS","Superaste el máximo de fotos permitido para esta sección.");
      photos.push({id:photo.id,itemId:item.id,productId:item.productId,slotId:slot.id,slotLabel:slot.label,fileName:photo.fileName,uploaded:false});
    }
    result.push({id:item.id,productId:item.productId,productTitle:String(product.title),quantity:item.quantity,unitPriceCents,linePriceCents:unitPriceCents*item.quantity,selections:item.selections});
  }
  if(photos.length>20) throw new AdminApiError(400,"TOO_MANY_PHOTOS","Máximo 20 fotografías por solicitud.");
  if(new Set(photos.map(p=>p.id)).size!==photos.length)throw new AdminApiError(400,"DUPLICATE_PHOTO","Fotografías repetidas.");
  return {items:result,photos,totalCents:result.reduce((n,x)=>n+x.linePriceCents,0)};
}
export function validateImageUpload(file: File) {
  if(file.size<=0 || file.size>2*1024*1024)throw new AdminApiError(413,"IMAGE_SIZE","Cada fotografía puede tener máximo 2 MB.");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))
    throw new AdminApiError(400,"IMAGE_TYPE","Sólo fotografías JPG, PNG o WebP.");
}
export async function saveCustomerImage(id:string,photoId:string,file:File) {
  validateImageUpload(file);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!verifyImage(bytes,file.type)) throw new AdminApiError(400,"IMAGE_CONTENT","El archivo no es una fotografía válida.");
  await productImageBucket().file("customer-requests/"+id+"/"+photoId).save(Buffer.from(bytes),{
    resumable:false, metadata:{contentType:file.type,cacheControl:"private, no-store"},
  });
}
