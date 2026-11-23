import { NextResponse } from "next/server";
import { AdminApiError, apiError, publicDatabase } from "@/lib/admin-server";
import { checkOrigin, publicUploadGate, requireOpen, requireToken, saveCustomerImage, validateImageUpload, type RequestAttachment } from "@/lib/customer-requests-server";
export const runtime="nodejs"; export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Params){
  try{
    checkOrigin(request);publicUploadGate();
    const {id}=await params;
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(id))throw new AdminApiError(400,"INVALID_ID","Solicitud no válida.");
    if(Number(request.headers.get("content-length")||0)>3_000_000)throw new AdminApiError(413,"UPLOAD_TOO_LARGE","Máximo 2 MB por fotografía.");
    const form=await request.formData();
    const token=form.get("token"),photoId=form.get("photoId"),photo=form.get("photo");
    if(typeof token!=="string"||typeof photoId!=="string"||!(photo instanceof File))
      throw new AdminApiError(400,"INVALID_UPLOAD","Fotografía no válida.");
    validateImageUpload(photo);
    const db=publicDatabase(),ref=db.collection("customer_requests").doc(id);
    const snap=await ref.get(),data=snap.data();
    requireOpen(data);requireToken(token,data?.uploadTokenHash);
    const target=(data?.photos as RequestAttachment[]).find(x=>x.id===photoId);
    if(!target||target.uploaded)throw new AdminApiError(409,"PHOTO_NOT_EXPECTED","La fotografía no corresponde a esta solicitud.");
    await saveCustomerImage(id,photoId,photo);
    await db.runTransaction(async tx=>{
      const current=await tx.get(ref),record=current.data();
      requireOpen(record);requireToken(token,record?.uploadTokenHash);
      const photos=record?.photos as RequestAttachment[];
      const index=photos.findIndex(x=>x.id===photoId&&!x.uploaded);
      if(index<0)throw new AdminApiError(409,"PHOTO_NOT_EXPECTED","La fotografía ya fue recibida.");
      const revised=photos.map((p,i)=>i===index?{...p,uploaded:true,contentType:photo.type,size:photo.size}:p);
      tx.update(ref,{photos:revised,updatedAt:new Date().toISOString()});
    });
    return NextResponse.json({ok:true,id:photoId},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e);}
}
