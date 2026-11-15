"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadCart, saveCart, type CartItem } from "@/lib/cart-client";

const money = (cents: number) => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(cents/100);

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(()=>{setItems(loadCart());},[]);
  const total = items.reduce((sum,item)=>sum+item.unitPriceCents*item.quantity,0);
  function remove(id:string){const next=items.filter(item=>item.id!==id);setItems(next);saveCart(next);}
  return <main className="cart">
    <header className="cart__top"><Link href="/#lineas">← Seguir explorando</Link><span>ATHELIER</span></header>
    <h1>Tu carrito</h1>
    <p>Un mismo carrito para Dulce Tentación, Manchas y Trazos y Eco en Tinta.</p>
    {!items.length ? <section className="cart__empty"><p>Tu carrito está vacío.</p><Link href="/#lineas">Descubrir las colecciones</Link></section> :
    <section className="cart__items">
      {items.map(item=><article key={item.id} className="cart__item">
        <div><h2>{item.productTitle}</h2>{item.optionLabels.length>0&&<ul>{item.optionLabels.map((label,i)=><li key={i}>{label}</li>)}</ul>}<small>Cantidad: {item.quantity}</small></div>
        <div><strong>{money(item.unitPriceCents*item.quantity)}</strong><button type="button" onClick={()=>remove(item.id)}>Quitar</button></div>
      </article>)}
      <div className="cart__total"><span>Subtotal estimado, antes de impuestos y envío</span><strong>{money(total)}</strong></div>
      <p className="cart__disclaimer">El carrito se guarda sólo en este navegador. Los pedidos y pagos aún no están habilitados. Los precios se verificarán en el servidor cuando se implemente el checkout; lo mostrado aquí no constituye una confirmación de pedido.</p>
      <button type="button" disabled title="Disponible en una próxima versión">Finalizar compra (próximamente)</button>
    </section>}
  </main>;
}
