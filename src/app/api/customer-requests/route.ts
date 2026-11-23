import { NextResponse } from "next/server";
import { AdminApiError, apiError, publicDatabase } from "@/lib/admin-server";
import { checkOrigin, limitRequests, newToken, publicUploadGate, requestSchema, sha, verifyRequestItems } from "@/lib/customer-requests-server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    checkOrigin(request);
    publicUploadGate();
    if(Number(request.headers.get("content-length")||0)>65_536)throw new AdminApiError(413,"PAYLOAD_TOO_LARGE","Solicitud demasiado grande.");
    const parsed=requestSchema.safeParse(await request.json());
    if(!parsed.success)throw new AdminApiError(400,"INVALID_INPUT","Verifica nombre, contacto, fotografías y consentimiento.");
    const {name,email,phone,note,items}=parsed.data;
    const normalized=await verifyRequestItems(items);
    // Enforce rate limit before any persistent customer request is written.
    await limitRequests(request);
    const token=newToken(),db=publicDatabase(),ref=db.collection("customer_requests").doc();
    const now=new Date().toISOString(),expiresAt=new Date(Date.now()+60*60*1000).toISOString();
    await ref.set({
      name,email,phone,note,consentAt:now,createdAt:now,updatedAt:now,
      status:"uploading",expiresAt,uploadTokenHash:sha(token),
      ...normalized, currency:"MXN",
    });
    return NextResponse.json({id:ref.id,token,photoCount:normalized.photos.length},{status:201,headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e);}
}
