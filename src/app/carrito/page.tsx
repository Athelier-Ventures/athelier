"use client";
import Link from "next/link";
import "./cart.css";
import { useEffect, useState } from "react";
import { loadCart, saveCart, type CartItem } from "@/lib/cart-client";
import { useSiteLanguage } from "@/lib/language-client";
import { inclusiveTaxBreakdown } from "@/lib/iva";

export default function CartPage() {
  const { language } = useSiteLanguage();
  const en = language === "en";
  const money = (cents: number) => new Intl.NumberFormat(en ? "en-MX" : "es-MX", {style:"currency",currency:"MXN"}).format(cents/100);
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { setItems(loadCart()); }, []);
  const total = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  function remove(id: string) { const next = items.filter(item=>item.id!==id); setItems(next); saveCart(next); }
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
        <button type="button" disabled>{en ? "Checkout (coming soon)" : "Finalizar compra (próximamente)"}</button>
      </section>}
  </main>;
}
