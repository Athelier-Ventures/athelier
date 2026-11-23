import { NextResponse } from "next/server";
import { adminSession,apiError,PRIVATE_HEADERS } from "@/lib/admin-server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){
  try{
    const {db}=await adminSession(request);
    const snapshot=await db.collection("customer_requests").orderBy("createdAt","desc").limit(100).get();
    const items=snapshot.docs.map(doc=>{
      const {uploadTokenHash,...data}=doc.data();
      return {id:doc.id,...data};
    }).filter(item=>item.status==="received");
    return NextResponse.json({items},{headers:PRIVATE_HEADERS});
  }catch(e){return apiError(e);}
}
