"use client";
import type { CartItem } from "@/lib/cart-client";
import { readPrivatePhoto } from "@/lib/private-cart-photos";

async function responseJson(res:Response) {
  const data=await res.json().catch(()=>({error:"El servidor no respondió correctamente."}));
  if(!res.ok)throw new Error(data.error||"No fue posible enviar la solicitud.");
  return data;
}
export type ClientContact={name:string;email:string;phone:string;note:string;consent:boolean;website:string};
export async function submitCustomerRequest(items:CartItem[],contact:ClientContact):Promise<string>{
  if(!items.length)throw new Error("El carrito está vacío.");
  // Read every local attachment first. Do not create a server-side request if files are missing.
  const uploads: Array<{itemId:string;photoId:string;file:File}>=[];
  for(const item of items)for(const photo of item.photoAttachments??[]){
    const file=await readPrivatePhoto(item.id,photo);
    if(file.size>2*1024*1024)throw new Error("La fotografía "+photo.fileName+" supera 2 MB.");
    uploads.push({itemId:item.id,photoId:photo.id,file});
  }
  if(uploads.length>20)throw new Error("Máximo 20 fotografías por solicitud.");
  const body={
    ...contact,
    items:items.map(item=>({
      id:item.id,productId:item.productId,quantity:item.quantity,
      selections:item.selections,
      photos:(item.photoAttachments??[]).map(photo=>({id:photo.id,slotId:photo.slotId,fileName:photo.fileName})),
    })),
  };
  const initialized=await responseJson(await fetch("/api/customer-requests",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",
  })) as {id:string;token:string};
  for(const item of uploads){
    const form=new FormData();
    form.append("token",initialized.token);form.append("photoId",item.photoId);form.append("photo",item.file);
    await responseJson(await fetch("/api/customer-requests/"+encodeURIComponent(initialized.id)+"/photos",{
      method:"POST",body:form,cache:"no-store",
    }));
  }
  const result=await responseJson(await fetch("/api/customer-requests/"+encodeURIComponent(initialized.id)+"/complete",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:initialized.token}),cache:"no-store",
  })) as {reference:string};
  return result.reference;
}
