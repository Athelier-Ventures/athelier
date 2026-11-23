"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./catalog.css";
import { addConfiguredProduct, type PublicProduct } from "@/lib/cart-client";
import { useSiteLanguage } from "@/lib/language-client";
import { configuredUnitPriceCents, notebookDiscQuota, isStandardNotebookDiscOption, type ConfiguredChoice, type CommercialProduct } from "@/lib/commerce";
import { storePrivatePhotos, validateCustomerPhotos, type PendingPhoto } from "@/lib/private-cart-photos";


function ProductConfigurator({ product }: { product: PublicProduct }) {
  const {language} = useSiteLanguage();
  const en = language === "en";
  const money = (cents: number) => new Intl.NumberFormat(en ? "en-MX" : "es-MX", {style:"currency",currency:"MXN"}).format(cents/100);
  const [choices, setChoices] = useState<ConfiguredChoice[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [success, setSuccess] = useState("");
  const [photoFiles, setPhotoFiles] = useState<Record<string, File[]>>({});
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const gallery=[...new Set([product.imageUrl,...(product.galleryImageUrls??[])].filter((x):x is string=>Boolean(x)))];
  const selectedImage=gallery[activeImage]??gallery[0];

  const discQuota = notebookDiscQuota(product,choices);
  const discLimitMessage = en ? "Maximum 8 discs in total per notebook (pink + blue)." : "Máximo 8 discos en total por libreta (rosas + azules).";
  function toggle(groupId: string, optionId: string, selection: "single" | "multiple") {
    const option=product.optionGroups.find(group=>group.id===groupId)?.options.find(x=>x.id===optionId);
    const alreadySelected=choices.some(c=>c.groupId===groupId&&c.optionId===optionId);
    if(option && isStandardNotebookDiscOption(product,option) && !alreadySelected && discQuota && discQuota.remaining<1){
      setError(discLimitMessage);setSuccess("");return;
    }
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
  const subtotal = price * (Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0);
  async function add() {
    if (adding) return;
    setError(""); setSuccess(""); setAdding(true);
    try {
      if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 1000) throw new Error(en ? "Invalid product quantity." : "Cantidad de productos no válida.");
      const photos: PendingPhoto[] = [];
      for (const slot of product.photoSlots ?? []) {
        const files = photoFiles[slot.id] ?? [];
        const invalid = validateCustomerPhotos(files, slot.maxFiles);
        if (invalid) throw new Error(invalid);
        for (const file of files) photos.push({id:crypto.randomUUID(),slotId:slot.id,slotLabel:slot.label,fileName:file.name,file});
      }
      if (photos.length > 10) throw new Error(en ? "Maximum 10 photos per configured product." : "Máximo 10 fotografías por producto configurado.");
      // Validate the selected options before persisting any private images.
      configuredUnitPriceCents({ ...product, baseMaterials: [], status: "published" } as CommercialProduct, choices);
      const id = crypto.randomUUID();
      const attachments = await storePrivatePhotos(id, photos);
      addConfiguredProduct(product, choices, quantity, attachments, id);
      setSuccess(en ? "Added to your cart." : "Añadido al carrito compartido.");
      setPhotoFiles({});
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(message.startsWith("Invalid option count") ? (en ? "Choose the required options, or ask the owner to enable standard purchase." : "Selecciona las opciones obligatorias o solicita habilitar la compra estándar.") : message || (en ? "Could not add item." : "No se pudo agregar el producto."));
    } finally {setAdding(false);}
  }

  return (
    <article className="catalog__product">
      <div className="catalog__media">
        {selectedImage ? <>
          <a href={selectedImage} className="catalog__image-link" target="_blank" rel="noopener noreferrer"
            aria-label={en?"View full image of "+product.title:"Ver imagen completa de "+product.title}>
            <img className="catalog__image" src={selectedImage} alt={product.title+" — "+(activeImage+1)+" / "+gallery.length} loading="lazy" />
          </a>
          {gallery.length>1&&<div className="catalog__gallery" aria-label={en?"Product image gallery":"Galería de fotografías del producto"}>
            {gallery.map((url,i)=><button type="button" key={url} aria-label={(en?"View photo ":"Ver fotografía ")+(i+1)}
              aria-pressed={activeImage===i} className={"catalog__gallery-button"+(activeImage===i?" is-active":"")}
              onClick={()=>setActiveImage(i)}>
              <img src={url} alt="" loading="lazy"/>
            </button>)}
          </div>}
          <p className="catalog__image-hint">{en?"Tap the photo to view it full size.":"Toca la fotografía para verla completa."}</p>
        </> : <div className="catalog__placeholder" aria-hidden="true">ATHELIER</div>}
      </div>
      <div className="catalog__details">
        <h3>{product.title}</h3>
        {product.description && <p>{product.description}</p>}
        <div className="catalog__price">{en ? "From" : "Desde"} {money(product.basePriceCents)} <small>{en ? "VAT included where applicable" : "IVA incluido cuando aplique"}</small></div>
        {product.allowBasePurchase&&<button type="button" className="catalog__standard" onClick={()=>{setChoices([]);setError("");setSuccess("");}}>{en ? "Standard product — no extras" : "Producto estándar — sin adicionales"}{choices.length===0?" ✓":""}</button>}
        {product.optionGroups.map(group => <fieldset key={group.id} className="catalog__fieldset">
          <legend>{group.title}{group.required ? " *" : ""}</legend>
          {discQuota && group.options.some(option=>isStandardNotebookDiscOption(product,option)) &&
            <p className="catalog__disc-quota" role="status">{en ? "Discs chosen" : "Discos elegidos"}: <strong>{discQuota.selected}/{discQuota.maximum}</strong> · {en ? "pink + blue combined" : "rosas + azules combinados"}</p>}
          {group.options.map(option => {
            const active = choices.find(c=>c.groupId===group.id && c.optionId===option.id);
            return <div className="catalog__choice" key={option.id}>
              <label>
                <input type={group.selection === "single" ? "radio" : "checkbox"}
                  name={product.id+"-"+group.id} checked={Boolean(active)}
                  onChange={()=>toggle(group.id,option.id,group.selection)}/>
                <span>{option.label} <small>+ {money(option.priceCents)}{option.pricingMode==="perUnit"?(en ? " / unit" : " / unidad"):""}</small></span>
              </label>
              {active && option.pricingMode === "perUnit" && <input type="number" min="1"
                max={discQuota && isStandardNotebookDiscOption(product,option)
                  ? Math.max(1,discQuota.maximum-(discQuota.selected-(active.units??1))) : 1000}
                value={active.units??1} aria-label={(en ? "Quantity of " : "Cantidad de ")+option.label} onChange={e=>{
                  const units=Number(e.target.value);
                  const isDisc=isStandardNotebookDiscOption(product,option);
                  const max=discQuota && isDisc ? Math.max(1,discQuota.maximum-(discQuota.selected-(active.units??1))) : 1000;
                  if(!Number.isSafeInteger(units)||units<1||units>max){
                    setError(isDisc ? discLimitMessage : (en ? "Enter a valid quantity." : "Ingresa una cantidad válida."));return;
                  }
                  setError("");setSuccess("");
                  setChoices(old=>old.map(c=>c.groupId===group.id&&c.optionId===option.id?{...c,units}:c));
                }}/>}
            </div>;
          })}
        </fieldset>)}
        {(product.photoSlots?.length ?? 0)>0 && <div className="catalog__photos">
          <h4>{en ? "Your photos for personalization" : "Tus fotografías para personalización"}</h4>
          <p>{en ? "Photos stay private on this device until you send the customization request from the cart. This is not a payment." : "Las fotografías permanecen privadas en este dispositivo hasta que envíes la solicitud desde el carrito. No es un pago."}</p>
          {product.photoSlots?.map(slot=><label key={slot.id} className="catalog__photo-slot">
            {slot.label} <small>({en ? "maximum" : "máximo"} {slot.maxFiles})</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple={slot.maxFiles>1}
              onChange={e=>{
                const files=Array.from(e.target.files??[]);
                const invalid=validateCustomerPhotos(files,slot.maxFiles);
                if(invalid){setError(invalid);e.target.value="";return;}
                setError("");setPhotoFiles(old=>({...old,[slot.id]:files}));
              }}/>
            {(photoFiles[slot.id]?.length??0)>0&&<small>{photoFiles[slot.id].map(file=>file.name).join(", ")}</small>}
          </label>)}
        </div>}
        <div className="catalog__bottom">
          <label>{en ? "Quantity" : "Cantidad"}<input type="number" min="1" max="1000" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
          <div><span>{en ? "Configured unit price" : "Precio unitario configurado"}</span><strong>{money(price)} / {en ? "item" : "pieza"}</strong></div>
          <div className="catalog__subtotal"><span>{en ? "Subtotal" : "Subtotal"} ({quantity} {en ? "items" : "piezas"})</span><strong>{money(subtotal)}</strong></div>
          <button type="button" disabled={adding} onClick={()=>void add()}>{adding ? (en ? "Saving..." : "Guardando…") : (en ? "Add to cart" : "Agregar al carrito")}</button>
        </div>
        {success && <p className="catalog__success" role="status">{success} <Link href="/carrito">{en ? "View cart" : "Ver carrito"}</Link></p>}
        {error && <p className="catalog__error" role="alert">{error}</p>}
      </div>
    </article>
  );
}

export default function CollectionCatalog({ linea }: { linea: string }) {
  const {language} = useSiteLanguage();
  const en = language === "en";
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
    <section className="catalog" aria-label={en ? "Product catalogue" : "Catálogo comercial"}>
      <div className="catalog__heading"><h2>{en ? "Catalogue" : "Catálogo"}</h2><Link href="/carrito">{en ? "View my cart ↗" : "Ver mi carrito ↗"}</Link></div>
      {loading ? <p>{en ? "Loading products…" : "Consultando productos…"}</p> :
        products.length ? <div className="catalog__list">{products.map(p=><ProductConfigurator key={p.id} product={p}/>)}</div> :
        <p className="catalog__empty">{en ? "Products will appear here when the owners publish them. This collection is still being prepared." : "Los productos aparecerán aquí cuando el propietario los publique. Por ahora, seguimos preparando esta colección."}</p>}
    </section>
  );
}
