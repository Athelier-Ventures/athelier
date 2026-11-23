import { NextResponse } from "next/server";
import { adminSession,apiError,AdminApiError } from "@/lib/admin-server";
import { productImageBucket } from "@/lib/product-image-storage";
import type { RequestAttachment } from "@/lib/customer-requests-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Params={params:Promise<{id:string;photoId:string}>};
export async function GET(request:Request,{params}:Params){
  try{
    const {db}=await adminSession(request);
    const {id,photoId}=await params;
    if(!/^[A-Za-z0-9_-]{10,100}$/.test(id)|| !/^[0-9a-f-]{36}$/i.test(photoId))
      throw new AdminApiError(404,"NOT_FOUND","Fotografía no disponible.");
    const data=(await db.collection("customer_requests").doc(id).get()).data();
    if(data?.status!=="received")throw new AdminApiError(404,"NOT_FOUND","Fotografía no disponible.");
    const photo=(data.photos as RequestAttachment[]).find(x=>x.id===photoId&&x.uploaded);
    if(!photo)throw new AdminApiError(404,"NOT_FOUND","Fotografía no disponible.");
    const [bytes]=await productImageBucket().file("customer-requests/"+id+"/"+photoId).download();
    return new NextResponse(new Uint8Array(bytes),{headers:{
      "Content-Type":photo.contentType||"application/octet-stream",
      "Cache-Control":"private, no-store","Content-Disposition":'attachment; filename="athelier-photo-'+photoId+'.'+(photo.contentType==="image/png"?"png":photo.contentType==="image/webp"?"webp":"jpg")+'"',
      "X-Content-Type-Options":"nosniff",
    }});
  }catch(e){return apiError(e);}
}
