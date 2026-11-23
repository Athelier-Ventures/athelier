"use client";

import { useEffect, useState } from "react";
import { reviseConfiguredCartItem, type CartItem, type PublicProduct } from "@/lib/cart-client";
import { deletePrivatePhotos, storePrivatePhotos, validateCustomerPhotos, type PendingPhoto, type PhotoReference } from "@/lib/private-cart-photos";
import type { ConfiguredChoice } from "@/lib/commerce";

type Props = {
  item: CartItem;
  en: boolean;
  onSave: (updated: CartItem) => void;
  onCancel: () => void;
};
const lines = ["reposteria", "personalizaciones", "fotografia"];

export default function CartItemEditor({item, en, onSave, onCancel}: Props) {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(item.quantity);
  const [choices, setChoices] = useState<ConfiguredChoice[]>(item.selections.map(x=>({...x})));
  const [keptPhotos, setKeptPhotos] = useState<PhotoReference[]>(item.photoAttachments ?? []);
  const [pending, setPending] = useState<Record<string, File[]>>({});

  const money = (cents:number) => new Intl.NumberFormat(en ? "en-MX" : "es-MX", {style:"currency",currency:"MXN"}).format(cents/100);

  useEffect(()=>{
    let active=true;
    async function load() {
      try {
        const results=await Promise.allSettled(lines.map(async line=>{
          const r=await fetch("/api/catalog/"+line,{cache:"no-store"});
          if(!r.ok)throw new Error("Catálogo no disponible");
          const response:{items:PublicProduct[]}=await r.json();
          return response.items;
        }));
        const products=results.flatMap(result=>result.status==="fulfilled"?result.value:[]);
        const match=products.find(x=>x.id===item.productId);
        if(!active)return;
        if(!match){setLoadError(en ? "This product is no longer available to edit." : "Este producto ya no está disponible para editar.");return;}
        const valid=item.selections.filter(choice=>
          match.optionGroups.some(group=>group.id===choice.groupId && group.options.some(option=>option.id===choice.optionId))
        );
        if(valid.length!==item.selections.length)
          setWarning(en ? "Some options have changed in the catalogue. Review before saving." : "Algunas opciones cambiaron en el catálogo. Revisa tu selección antes de guardar.");
        setChoices(valid);
        setProduct(match);
      }catch{
        if(active)setLoadError(en ? "Could not load the current product." : "No se pudo consultar el producto actual.");
      }finally{if(active)setLoading(false);}
    }
    void load();
    return()=>{active=false;};
  },[item.productId,en,item.selections]);

  function toggle(groupId:string, optionId:string, selection:"single"|"multiple"){
    setError("");
    setChoices(old=>{
      const exists=old.some(c=>c.groupId===groupId&&c.optionId===optionId);
      if(selection==="single")return [...old.filter(c=>c.groupId!==groupId),{groupId,optionId,units:1}];
      return exists?old.filter(c=>c.groupId!==groupId||c.optionId!==optionId):[...old,{groupId,optionId,units:1}];
    });
  }

  const preview=(()=>{
    if(!product)return null;
    try{return reviseConfiguredCartItem(item,product,choices,quantity,keptPhotos);}
    catch{return null;}
  })();

  async function save(){
    if(!product||saving)return;
    setError("");setSaving(true);
    let storedNew:PhotoReference[]=[];
    try {
      const slots=product.photoSlots??[];
      if(keptPhotos.some(photo=>!slots.some(slot=>slot.id===photo.slotId)))
        throw new Error(en ? "An existing photo section is no longer available. Remove those files before saving." : "Una sección de fotografías ya no está disponible. Quita esos archivos antes de guardar.");
      const toStore:PendingPhoto[]=[];
      for(const slot of slots){
        const files=pending[slot.id]??[];
        const invalid=validateCustomerPhotos(files,slot.maxFiles);
        if(invalid)throw new Error(invalid);
        const existing=keptPhotos.filter(photo=>photo.slotId===slot.id).length;
        if(existing+files.length>slot.maxFiles)
          throw new Error(en ? "Too many photos in " + slot.label + ". Remove an existing image first." : "Demasiadas fotografías en "+slot.label+". Quita alguna fotografía anterior.");
        for(const file of files){
          toStore.push({id:crypto.randomUUID(),slotId:slot.id,slotLabel:slot.label,fileName:file.name,file});
        }
      }
      if(keptPhotos.length+toStore.length>10)
        throw new Error(en ? "Maximum 10 images per configured product." : "Máximo 10 imágenes por producto configurado.");
      // Confirm quantities, price and required groups before writing any photo.
      reviseConfiguredCartItem(item,product,choices,quantity,keptPhotos);
      storedNew=await storePrivatePhotos(item.id,toStore);
      const updated=reviseConfiguredCartItem(item,product,choices,quantity,[...keptPhotos,...storedNew]);
      onSave(updated); // The parent saves the entire cart atomically before photos are deleted.
      const discarded=(item.photoAttachments??[]).filter(photo=>!keptPhotos.some(kept=>kept.id===photo.id));
      if(discarded.length)void deletePrivatePhotos(item.id,discarded).catch(()=>{});
    }catch(e){
      if(storedNew.length)void deletePrivatePhotos(item.id,storedNew).catch(()=>{});
      const message=e instanceof Error?e.message:"";
      if(message.startsWith("Invalid option count:")){
        const groupId=message.slice("Invalid option count:".length).trim();
        const title=product.optionGroups.find(group=>group.id===groupId)?.title??groupId;
        setError(en ? "Please review the required choices in “"+title+"”." : "Revisa las opciones obligatorias de «"+title+"».");
      }else setError(message || (en ? "Could not update the cart." : "No se pudo actualizar el carrito."));
    }finally{setSaving(false);}
  }

  return <section className="cart__editor" aria-label={en?"Edit cart item":"Editar artículo del carrito"}>
    <h3>{en?"Edit configuration":"Editar configuración"}</h3>
    {loading&&<p role="status">{en?"Loading current options…":"Consultando opciones actuales…"}</p>}
    {loadError&&<p role="alert" className="cart__request-error">{loadError}</p>}
    {warning&&<p role="status" className="cart__edit-warning">{warning}</p>}
    {product&&<>
      {product.allowBasePurchase&&<button className="cart__editor-standard" type="button" disabled={saving} onClick={()=>{setChoices([]);setError("");}}>
        {en?"Standard version, no extras":"Versión estándar, sin adicionales"} {choices.length===0?"✓":""}
      </button>}
      {product.optionGroups.map(group=><fieldset className="cart__editor-group" key={group.id} disabled={saving}>
        <legend>{group.title}{group.required?" *":""}</legend>
        {group.selection==="single"&&!group.required&&<button type="button" className="cart__editor-none"
          onClick={()=>setChoices(old=>old.filter(x=>x.groupId!==group.id))}>
          {en?"No selection":"Sin selección"}
        </button>}
        {group.options.map(option=>{
          const active=choices.find(x=>x.groupId===group.id&&x.optionId===option.id);
          return <div className="cart__editor-option" key={option.id}>
            <label>
              <input type={group.selection==="single"?"radio":"checkbox"} name={item.id+"-"+group.id}
                checked={Boolean(active)} onChange={()=>toggle(group.id,option.id,group.selection)}/>
              <span>{option.label} <small>+{money(option.priceCents)}{option.pricingMode==="perUnit"?(en?" / unit":" / unidad"):""}</small></span>
            </label>
            {active&&option.pricingMode==="perUnit"&&<label className="cart__editor-units">
              {en?"Units":"Unidades"}
              <input type="number" min={1} max={1000} value={active.units??1} onChange={e=>{
                const units=Number(e.target.value);
                setChoices(old=>old.map(x=>x.groupId===group.id&&x.optionId===option.id?{...x,units}:x));
              }}/>
            </label>}
          </div>;
        })}
      </fieldset>)}
      {(product.photoSlots??[]).length>0&&<div className="cart__editor-photos">
        <h4>{en?"Personalization photos":"Fotografías para personalizar"}</h4>
        {product.photoSlots?.map(slot=><div className="cart__editor-photo-slot" key={slot.id}>
          <strong>{slot.label} <small>({en?"maximum":"máximo"} {slot.maxFiles})</small></strong>
          {keptPhotos.filter(photo=>photo.slotId===slot.id).map(photo=><div className="cart__editor-existing" key={photo.id}>
            <span>{photo.fileName}</span>
            <button type="button" disabled={saving} onClick={()=>setKeptPhotos(old=>old.filter(x=>x.id!==photo.id))}>
              {en?"Remove photo":"Quitar foto"}
            </button>
          </div>)}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple={slot.maxFiles>1}
            disabled={saving} aria-label={(en?"Add photos for ":"Agregar fotos para ")+slot.label}
            onChange={e=>{
              const files=Array.from(e.target.files??[]);
              const invalid=validateCustomerPhotos(files,slot.maxFiles);
              if(invalid){setError(invalid);e.target.value="";return;}
              setPending(old=>({...old,[slot.id]:files}));setError("");
            }}/>
          {(pending[slot.id]?.length??0)>0&&<small>{pending[slot.id].map(file=>file.name).join(", ")}</small>}
        </div>)}
      </div>}
      <div className="cart__editor-summary">
        <label>{en?"Product quantity":"Cantidad de productos"}
          <input type="number" min={1} max={1000} disabled={saving} value={quantity}
            onChange={e=>{setQuantity(Number(e.target.value));setError("");}}/>
        </label>
        <div>
          <small>{en?"Unit price":"Precio por pieza"}</small>
          <strong>{preview?money(preview.unitPriceCents):"—"}</strong>
        </div>
        <div>
          <small>{en?"Updated subtotal":"Subtotal actualizado"}</small>
          <strong>{preview?money(preview.unitPriceCents*preview.quantity):"—"}</strong>
        </div>
      </div>
      {!preview&&<p className="cart__edit-warning">{en?"Complete required choices to see the total.":"Completa las opciones obligatorias para ver el total."}</p>}
    </>}
    {error&&<p role="alert" className="cart__request-error">{error}</p>}
    <div className="cart__editor-actions">
      <button type="button" className="cart__editor-save" onClick={()=>void save()} disabled={loading||!product||saving||!preview}>
        {saving?(en?"Saving…":"Guardando…"):(en?"Save changes":"Guardar cambios")}
      </button>
      <button type="button" className="cart__editor-cancel" disabled={saving} onClick={onCancel}>
        {en?"Cancel":"Cancelar"}
      </button>
    </div>
  </section>;
}
