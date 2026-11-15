"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addConfiguredProduct, type PublicProduct } from "@/lib/cart-client";
import { configuredUnitPriceCents, type ConfiguredChoice, type CommercialProduct } from "@/lib/commerce";

const money = (cents: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);

function ProductConfigurator({ product }: { product: PublicProduct }) {
  const [choices, setChoices] = useState<ConfiguredChoice[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function toggle(groupId: string, optionId: string, selection: "single" | "multiple") {
    setChoices(old => {
      const found = old.some(c => c.groupId === groupId && c.optionId === optionId);
      if (selection === "single") return [{ groupId, optionId, units: 1 }, ...old.filter(c => c.groupId !== groupId)];
      return found ? old.filter(c => c.groupId !== groupId || c.optionId !== optionId) : [...old, { groupId, optionId, units: 1 }];
    });
    setSuccess(""); setError("");
  }

  const price = (() => {
    try {
      return configuredUnitPriceCents({ ...product, baseMaterials: [], status: "published" } as CommercialProduct, choices);
    } catch { return product.basePriceCents + choices.reduce((sum, c) => {
      const option = product.optionGroups.find(g=>g.id===c.groupId)?.options.find(o=>o.id===c.optionId);
      return sum + (option?.priceCents ?? 0) * (option?.pricingMode === "perUnit" ? c.units || 1 : 1);
    }, 0); }
  })();
  function add() {
    setError("");setSuccess("");
    try { addConfiguredProduct(product, choices, quantity); setSuccess("Añadido al carrito compartido."); }
    catch (e) { setError(e instanceof Error ? e.message : "Selecciona las opciones obligatorias"); }
  }

  return (
    <article className="catalog__product">
      {product.imageUrl ? <img className="catalog__image" src={product.imageUrl} alt={product.title} loading="lazy" /> : <div className="catalog__placeholder" aria-hidden="true">ATHELIER</div>}
      <div className="catalog__details">
        <h3>{product.title}</h3>
        {product.description && <p>{product.description}</p>}
        <div className="catalog__price">Desde {money(product.basePriceCents)}</div>
        {product.optionGroups.map(group => <fieldset key={group.id} className="catalog__fieldset">
          <legend>{group.title}{group.required ? " *" : ""}</legend>
          {group.options.map(option => {
            const active = choices.find(c=>c.groupId===group.id && c.optionId===option.id);
            return <div className="catalog__choice" key={option.id}>
              <label>
                <input type={group.selection === "single" ? "radio" : "checkbox"}
                  name={product.id+"-"+group.id} checked={Boolean(active)}
                  onChange={()=>toggle(group.id,option.id,group.selection)}/>
                <span>{option.label} <small>+ {money(option.priceCents)}{option.pricingMode==="perUnit"?" / unidad":""}</small></span>
              </label>
              {active && option.pricingMode === "perUnit" && <input type="number" min="1" max="1000" value={active.units||1} aria-label={"Cantidad de "+option.label} onChange={e=>{
                const units=Number(e.target.value);setChoices(old=>old.map(c=>c.groupId===group.id&&c.optionId===option.id?{...c,units}:c));
              }}/>}
            </div>;
          })}
        </fieldset>)}
        <div className="catalog__bottom">
          <label>Cantidad<input type="number" min="1" max="1000" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
          <div><span>Precio configurado</span><strong>{money(price)} / pieza</strong></div>
          <button type="button" onClick={add}>Agregar al carrito</button>
        </div>
        {success && <p className="catalog__success" role="status">{success} <Link href="/carrito">Ver carrito</Link></p>}
        {error && <p className="catalog__error" role="alert">{error}</p>}
      </div>
    </article>
  );
}

export default function CollectionCatalog({ linea }: { linea: string }) {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    fetch("/api/catalog/"+linea, { cache:"no-store" }).then(async r => {
      if (!r.ok) throw new Error("Catálogo no disponible");
      const data: {items:PublicProduct[]} = await r.json();
      if (live) setProducts(data.items);
    }).catch(()=>{}).finally(()=>{if(live)setLoading(false)});
    return ()=>{live=false};
  },[linea]);
  return (
    <section className="catalog" aria-label="Catálogo comercial">
      <div className="catalog__heading"><h2>Catálogo</h2><Link href="/carrito">Ver mi carrito ↗</Link></div>
      {loading ? <p>Consultando productos…</p> :
        products.length ? <div className="catalog__list">{products.map(p=><ProductConfigurator key={p.id} product={p}/>)}</div> :
        <p className="catalog__empty">Los productos aparecerán aquí cuando el propietario los publique. Por ahora, seguimos preparando esta colección.</p>}
    </section>
  );
}
