"use client";
import Link from "next/link";
import "./cart.css";
import { useEffect, useState } from "react";
import { loadCart, saveCart, type CartItem } from "@/lib/cart-client";
import { useSiteLanguage } from "@/lib/language-client";
import { inclusiveTaxBreakdown } from "@/lib/iva";
import { deletePrivatePhotos } from "@/lib/private-cart-photos";
import { submitCustomerRequest } from "@/lib/customer-request-client";
import type { FormEvent } from "react";

export default function CartPage() {
  const { language } = useSiteLanguage();
  const en = language === "en";
  const money = (cents: number) => new Intl.NumberFormat(en ? "en-MX" : "es-MX", {style:"currency",currency:"MXN"}).format(cents/100);
  const [items, setItems] = useState<CartItem[]>([]);
  const [contact,setContact] = useState({name:"",email:"",phone:"",note:"",consent:false,website:""});
  const [sending,setSending]=useState(false);
  const [sendError,setSendError]=useState("");
  const [reference,setReference]=useState("");
  useEffect(() => { setItems(loadCart()); }, []);
  const total = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  async function sendToWorkshop(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setSendError("");setReference("");setSending(true);
    try{
      const ref=await submitCustomerRequest(items,contact);
      setReference(ref);
    }catch(err){setSendError(err instanceof Error?err.message:"No se pudo enviar la solicitud.");}
    finally{setSending(false);}
  }
  function remove(id: string) { const removed=items.find(item=>item.id===id); const next = items.filter(item=>item.id!==id); setItems(next); saveCart(next); if(removed) void deletePrivatePhotos(id,removed.photoAttachments??[]).catch(()=>{}); }
  // Indicative only; fiscal treatment of each product is determined at checkout.
  const illustrativeVat = inclusiveTaxBreakdown(total).taxCents;
  return <main className="cart">
    <header className="cart__top">
      <Link href="/#lineas">{en ? "← Continue exploring" : "← Seguir explorando"}</Link>
      <span>ATHELIER · MXN</span>
    </header>
    <h1>{en ? "Your cart" : "Tu carrito"}</h1>
    <p>{en ? "One cart for Dulce Tentación, Manchas y Trazos, and Eco en Tinta." : "Un mismo carrito para Dulce Tentación, Manchas y Trazos y Eco en Tinta."}</p>
    {!items.length ?
      <section className="cart__empty"><p>{en ? "Your cart is empty." : "Tu carrito está vacío."}</p>
        <Link href="/#lineas">{en ? "Discover the collections" : "Descubrir las colecciones"}</Link>
      </section> :
      <section className="cart__items">
        {items.map(item=><article key={item.id} className="cart__item">
          <div><h2>{item.productTitle}</h2>
            {item.optionLabels.length>0&&<ul>{item.optionLabels.map((label,i)=><li key={i}>{label}</li>)}</ul>}
            {(item.photoAttachments?.length??0)>0&&<p>{en ? "Private photos stored on this device" : "Fotografías privadas guardadas en este dispositivo"}: {item.photoAttachments?.map(photo=>photo.slotLabel+" — "+photo.fileName).join("; ")}. {en ? "Not sent to the studio." : "No enviadas al taller."}</p>}
            <small>{en ? "Quantity" : "Cantidad"}: {item.quantity}</small></div>
          <div><strong>{money(item.unitPriceCents*item.quantity)}</strong>
            <button type="button" onClick={()=>remove(item.id)}>{en ? "Remove" : "Quitar"}</button></div>
        </article>)}
        <div className="cart__total">
          <span>{en ? "Estimated total (tax included where applicable)" : "Total estimado (IVA incluido cuando corresponda)"}</span>
          <strong>{money(total)}</strong>
        </div>
        <p className="cart__disclaimer">
          {en ? `Reference only: if all items are subject to the standard 16% VAT, the included VAT would be ${money(illustrativeVat)}. Some items may qualify for different tax treatment. No VAT is added to the listed prices.` :
            `Sólo como referencia: si todos los artículos estuvieran gravados al 16%, el IVA ya incluido sería ${money(illustrativeVat)}. Algunos productos pueden tener otro tratamiento fiscal. No se agrega IVA al precio mostrado.`}
        </p>
        <p className="cart__disclaimer">{en ? "The cart is saved only in this browser. Orders and payments are not yet enabled; final prices and applicable taxes will be validated on the server before checkout." :
          "El carrito se guarda sólo en este navegador. Los pedidos y pagos todavía no están habilitados; los precios e impuestos aplicables se validarán en el servidor antes de implementar el checkout."}</p>
        <section className="cart__request">
          <h2>{en ? "Send your customization request to ATHELIER" : "Enviar solicitud de personalización a ATHELIER"}</h2>
          <p>{en ? "This sends your product selections and private photos to the studio so they can contact you. It is not a purchase or payment." : "Envía al taller los productos elegidos y tus fotografías privadas para que te contacten. No es una compra ni un pago."}</p>
          {reference?<p className="cart__request-ok" role="status">{en ? "Request received. Reference: " : "Solicitud recibida. Referencia: "}<strong>{reference}</strong>. {en ? "The studio can now see the photos in its administrator." : "El taller ya puede ver las fotografías en su administrador."}</p>:
          <form onSubmit={e=>void sendToWorkshop(e)}>
            <label>{en ? "Your name" : "Nombre"}<input required minLength={2} maxLength={100} value={contact.name} onChange={e=>setContact(c=>({...c,name:e.target.value}))}/></label>
            <label>{en ? "Email (optional if providing phone)" : "Correo (opcional si proporcionas teléfono)"}<input type="email" maxLength={180} value={contact.email} onChange={e=>setContact(c=>({...c,email:e.target.value}))}/></label>
            <label>{en ? "Phone / WhatsApp (optional if providing email)" : "Teléfono / WhatsApp (opcional si proporcionas correo)"}<input type="tel" maxLength={32} value={contact.phone} onChange={e=>setContact(c=>({...c,phone:e.target.value}))}/></label>
            <label>{en ? "Notes for the studio (optional)" : "Indicaciones para el taller (opcional)"}<textarea rows={3} maxLength={1500} value={contact.note} onChange={e=>setContact(c=>({...c,note:e.target.value}))}/></label>
            <div className="cart__honeypot" aria-hidden="true"><label>Website<input autoComplete="off" tabIndex={-1} value={contact.website} onChange={e=>setContact(c=>({...c,website:e.target.value}))}/></label></div>
            <label className="cart__consent"><input type="checkbox" required checked={contact.consent} onChange={e=>setContact(c=>({...c,consent:e.target.checked}))}/>{en ? "I authorize ATHELIER to receive my contact details and photos to prepare my request." : "Autorizo a ATHELIER a recibir mis datos de contacto y fotografías para atender esta solicitud."}</label>
            <button type="submit" disabled={sending || !contact.consent}>{sending ? (en ? "Sending…" : "Enviando…") : (en ? "Send request to studio" : "Enviar solicitud al taller")}</button>
          </form>}
          {sendError&&<p className="cart__request-error" role="alert">{sendError}</p>}
        </section>
        <button type="button" disabled>{en ? "Checkout and payments (coming soon)" : "Compras y pagos (próximamente)"}</button>
      </section>}
  </main>;
}
