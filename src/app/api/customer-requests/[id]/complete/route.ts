import { NextResponse } from "next/server";
import { AdminApiError, apiError, publicDatabase } from "@/lib/admin-server";
import { checkOrigin, publicUploadGate, requireOpen, requireToken, type RequestAttachment } from "@/lib/customer-requests-server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Params){
  try{
    checkOrigin(request);publicUploadGate();
    const {id}=await params,body=await request.json();
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)||typeof body.token!=="string")
      throw new AdminApiError(400,"INVALID_INPUT","Solicitud no válida.");
    const db=publicDatabase(),ref=db.collection("customer_requests").doc(id);
    await db.runTransaction(async tx=>{
      const snapshot=await tx.get(ref),data=snapshot.data();
      requireOpen(data);requireToken(body.token,data?.uploadTokenHash);
      const photos=data?.photos as RequestAttachment[];
      if(photos.some(photo=>!photo.uploaded))
        throw new AdminApiError(409,"PHOTOS_PENDING","Aún faltan fotografías por adjuntar.");
      const now = new Date().toISOString();
      tx.update(ref,{status:"received",updatedAt:now,receivedAt:now,uploadTokenHash:null});
      // Durable outbox marker, committed atomically with receipt. No provider calls here.
      // This prevents false alerts for drafts or incomplete photo uploads.
      tx.set(db.collection("customer_request_notification_outbox").doc(id), {
        type:"customer_request.received",requestId:id,createdAt:now,
        channels:{
          ownerEmail:"awaiting_provider_configuration",
          customerEmail:data?.email ? "awaiting_provider_configuration" : "not_applicable",
          ownerWhatsApp:"awaiting_provider_configuration",
        },
        deliveryEnabled:false,
      });
    });
    return NextResponse.json({received:true,reference:id},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e);}
}
