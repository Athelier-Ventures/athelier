"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { browserAuth, googleProvider } from "@/lib/firebase-client";
import { businessLines, type LineId } from "@/lib/brand";
import { purchaseTotalCostCents, purchaseUnitCount, weightedUnitCost, configuredUnitPriceCents, materialCostEstimateCents, permitsBasePurchase, photoSlotsForProduct, type Purchase, type CommercialProduct } from "@/lib/commerce";
import { inclusiveTaxBreakdown, type VatTreatment } from "@/lib/iva";
import "./admin.css";

type Resource = "suppliers" | "units" | "materials" | "presentations" | "purchases" | "products";
type CustomerRequest = {
  id:string;name:string;email:string;phone:string;note:string;createdAt:string;
  status:string;totalCents:number;reviewedAt?:string;reviewedBy?:string;
  items:Array<{id:string;productTitle:string;quantity:number;unitPriceCents:number;selections:Array<{groupId:string;optionId:string;units?:number}>}>;
  photos:Array<{id:string;itemId:string;slotLabel:string;fileName:string;uploaded:boolean}>;
};
type UnitDraft = { name: string; symbol: string; kind: "base" | "derived"; baseUnitId: string; unitsPerUnit: string; active: boolean };
const emptyUnit = (): UnitDraft => ({name:"",symbol:"",kind:"base",baseUnitId:"",unitsPerUnit:"1",active:true});
const legacyUnits: Record<string,string> = {sheet:"Hoja",piece:"Pieza",gram:"Gramo",millilitre:"Mililitro",centimetre:"Centímetro"};
type Entry = { id: string; [key: string]: unknown };
type Option = { id: string; label: string; priceCents: number; pricingMode: "fixed" | "perUnit" };
type Group = { id: string; title: string; selection: "single" | "multiple"; required: boolean; minSelections?: number; maxSelections?: number; options: Option[] };
type PhotoSlot = { id: string; label: string; maxFiles: number };
type Bill = { materialId: string; unitsConsumed: number };
type Draft = { title: string; description: string; imageUrl: string; galleryImageUrls: string[]; allowBasePurchase: boolean; photoSlots: PhotoSlot[]; basePriceCents: number; currency: "MXN"; lineIds: LineId[]; status: "draft" | "published" | "archived"; optionGroups: Group[]; baseMaterials: Bill[] };
const resources: Resource[] = ["suppliers", "units", "materials", "presentations", "purchases", "products"];
const tabs: Record<Resource, string> = { suppliers: "Proveedores", units: "Unidades", materials: "Insumos", presentations: "Presentaciones", purchases: "Compras", products: "Productos" };
const money = (cents: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
const asCents = (value: string) => Math.round(Number(value) * 100);
const unitMoney = (cents: number) => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:4,maximumFractionDigits:6}).format(cents / 100);
const newDraft = (): Draft => ({ title: "", description: "", imageUrl: "", galleryImageUrls: [], allowBasePurchase: false, photoSlots: [], basePriceCents: 0, currency: "MXN", lineIds: ["personalizaciones"], status: "draft", optionGroups: [], baseMaterials: [] });
const isLineId = (x: string): x is LineId => ["reposteria", "personalizaciones", "fotografia"].includes(x);

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Resource | "requests">("materials");
  const [rows, setRows] = useState<Record<Resource, Entry[]>>({ suppliers: [], units: [], materials: [], presentations: [], purchases: [], products: [] });
  const [costFrom, setCostFrom] = useState("");
  const [costTo, setCostTo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [supplierActive, setSupplierActive] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [unitDraft, setUnitDraft] = useState<UnitDraft>(emptyUnit);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [materialActive, setMaterialActive] = useState(true);
  const [editingPresentation, setEditingPresentation] = useState<string | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [unit, setUnit] = useState("sheet");
  const [lines, setLines] = useState<LineId[]>(["personalizaciones"]);
  const [presentation, setPresentation] = useState({ materialId: "", name: "", unitId: "", unitsPerPackage: "1000", active: true });
  const [purchase, setPurchase] = useState({ presentationId: "", supplierId: "", packages: "1", amount: "", vatTreatment: "standard" as VatTreatment, costScope: "wholePurchase" as "wholePurchase" | "perPackage", purchasedAt: new Date().toISOString().slice(0,10) });
  const [product, setProduct] = useState<Draft>(newDraft);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [customerRequests,setCustomerRequests]=useState<CustomerRequest[]>([]);
  const [requestsLoading,setRequestsLoading]=useState(false);
  const [reviewingId,setReviewingId]=useState<string|null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [newBillId, setNewBillId] = useState("");
  const [newBillUnits, setNewBillUnits] = useState("1");

  async function request<T>(path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: unknown, currentUser = user): Promise<T> {
    if (!currentUser) throw new Error("Primero inicia sesión");
    const token = await currentUser.getIdToken();
    const response = await fetch(path, {
      method, cache: "no-store",
      headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: unknown = await response.json();
    if (!response.ok) {
      const message = typeof data === "object" && data && "error" in data ? String((data as {error: unknown}).error) : "No fue posible completar la operación";
      throw new Error(message);
    }
    return data as T;
  }

  async function refresh(currentUser = user) {
    if (!currentUser) return;
    const all = await Promise.all(resources.map(resource => request<{items: Entry[]}>("/api/admin/" + resource, "GET", undefined, currentUser)));
    const next = {} as Record<Resource, Entry[]>;
    resources.forEach((resource, index) => { next[resource] = all[index].items; });
    setRows(next);
  }

  useEffect(() => {
    let auth;
    try { auth = browserAuth(); }
    catch (e) {
      setError(e instanceof Error ? e.message : "Error de Firebase");
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, async (account) => {
      setUser(account); setAuthorized(false); setError("");
      if (account) {
        try {
          await request("/api/admin/session", "GET", undefined, account);
          setAuthorized(true);
          await refresh(account);
          await loadRequests(account, true);
        } catch (e) { setError(e instanceof Error ? e.message : "No autorizado"); }
      }
      setAuthReady(true);
    });
    // Runs only once; request/refresh use explicit account to avoid stale closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login() {
    setError("");
    try { await signInWithPopup(browserAuth(), googleProvider()); }
    catch (e) { setError(e instanceof Error ? e.message : "Error al iniciar sesión"); }
  }
  async function loadRequests(currentUser=user, silent=false) {
    if(!currentUser)return;
    if(!silent){setRequestsLoading(true);setError("");}
    try {
      const result=await request<{items:CustomerRequest[]}>("/api/admin/customer-requests","GET",undefined,currentUser);
      setCustomerRequests(result.items);
    } catch(e){
      if(!silent)setError(e instanceof Error?e.message:"No se pudieron consultar las solicitudes.");
    } finally {if(!silent)setRequestsLoading(false);}
  }
  useEffect(()=>{
    if(!authorized||!user)return;
    const poll=()=>{if(document.visibilityState==="visible")void loadRequests(user,true);};
    const timer=window.setInterval(poll,60_000);
    document.addEventListener("visibilitychange",poll);
    return ()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",poll);};
    // The authenticated user and authorisation state are the only lifecycle keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[authorized,user]);
  async function markRequestReviewed(id:string) {
    if(!user||reviewingId)return;
    setReviewingId(id);setError("");setNotice("");
    try {
      const result=await request<{reviewedAt:string}>("/api/admin/customer-requests/"+encodeURIComponent(id)+"/review","PATCH",{},user);
      setCustomerRequests(previous=>previous.map(item=>item.id===id?{...item,reviewedAt:result.reviewedAt}:item));
      setNotice("Solicitud marcada como revisada.");
    } catch(e) {
      setError(e instanceof Error?e.message:"No se pudo actualizar la solicitud.");
    } finally {setReviewingId(null);}
  }
  async function downloadRequestPhoto(requestId:string,photoId:string) {
    if(!user)return;
    setError("");
    try {
      const token=await user.getIdToken();
      const res=await fetch("/api/admin/customer-requests/"+encodeURIComponent(requestId)+"/photos/"+encodeURIComponent(photoId),{
        headers:{Authorization:"Bearer "+token},cache:"no-store"
      });
      if(!res.ok)throw new Error("No se pudo descargar la fotografía privada.");
      const objectUrl=URL.createObjectURL(await res.blob());
      const a=document.createElement("a");a.href=objectUrl;a.download="athelier-"+requestId+"-"+photoId;
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
    }catch(e){setError(e instanceof Error?e.message:"Error al descargar fotografía.");}
  }
  async function logout() {
    await signOut(browserAuth()); setUser(null); setAuthorized(false); setCustomerRequests([]); setRows({ suppliers: [], units: [], materials: [], presentations: [], purchases: [], products: [] });
  }
  async function save(resource: Resource, data: unknown, id?: string) {
    setError(""); setNotice(""); setLoading(true);
    try {
      await request("/api/admin/" + resource, id ? "PATCH" : "POST", id ? { id, data } : data);
      await refresh();
      setNotice(id ? "Cambios guardados." : "Registro creado correctamente.");
      if (resource === "suppliers") { setSupplier(""); setSupplierActive(true); setEditingSupplier(null); }
      if (resource === "units") { setUnitDraft(emptyUnit()); setEditingUnit(null); }
      if (resource === "materials") { setMaterialName(""); setUnit("sheet"); setMaterialActive(true); setEditingMaterial(null); }
      if (resource === "presentations") { setPresentation({ materialId: "", name: "", unitId: "", unitsPerPackage: "1000", active: true }); setEditingPresentation(null); }
      if (resource === "purchases") setPurchase(p => ({ ...p, amount: "", vatTreatment: "standard", packages: "1" }));
      if (resource === "products") { setProduct(newDraft()); setEditingProduct(null); }
    } catch(e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setLoading(false); }
  }
  async function uploadProductImage(file: File) {
    if (!user) { setError("Primero inicia sesión"); return; }
    setError(""); setNotice(""); setImageUploading(true);
    try {
      if (file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Selecciona una imagen JPG, PNG o WebP de hasta 3 MB.");
      const form = new FormData();
      form.append("image", file);
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/product-image", {
        method: "POST", headers: { Authorization: "Bearer " + token }, body: form, cache: "no-store",
      });
      const data: { imageUrl?: string; error?: string } = await response.json();
      if (!response.ok || !data.imageUrl) throw new Error(data.error || "No se pudo subir la imagen");
      setProduct(previous => ({ ...previous, imageUrl: data.imageUrl! }));
      setNotice("Imagen cargada. Guarda el producto para publicarla.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error de imagen"); }
    finally { setImageUploading(false); }
  }
  async function uploadGalleryImages(files: File[]) {
    if(!user){setError("Primero inicia sesión");return;}
    if(files.length===0)return;
    if(product.galleryImageUrls.length+files.length>6){
      setError("Puedes agregar como máximo 6 fotografías adicionales por producto.");return;
    }
    setImageUploading(true);setError("");setNotice("");
    try {
      const token=await user.getIdToken();
      const newUrls:string[]=[];
      for(const file of files){
        if(file.size===0||file.size>3*1024*1024||!["image/jpeg","image/png","image/webp"].includes(file.type))
          throw new Error("Cada fotografía debe ser JPG, PNG o WebP y pesar máximo 3 MB.");
        const body=new FormData();
        body.append("image",file);
        const response=await fetch("/api/admin/product-image",{
          method:"POST",headers:{Authorization:"Bearer "+token},body,cache:"no-store",
        });
        const data:{imageUrl?:string;error?:string}=await response.json();
        if(!response.ok||!data.imageUrl)throw new Error(data.error||"No se pudo cargar la fotografía.");
        newUrls.push(data.imageUrl);
        setProduct(previous=>({...previous,galleryImageUrls:[...previous.galleryImageUrls,data.imageUrl!]}));
      }
      setNotice(newUrls.length+" fotografía(s) adicionales cargadas. Guarda el producto para publicarlas.");
    }catch(e){setError(e instanceof Error?e.message:"No se pudieron subir las fotografías.");}
    finally{setImageUploading(false);}
  }
  async function deleteRecord(resource: Resource, id: string, name: string) {
    if (resource === "purchases") return;
    if (!window.confirm("¿Eliminar definitivamente \"" + name + "\"? Los registros utilizados en compras, productos u otras equivalencias se conservarán.")) return;
    setLoading(true); setError(""); setNotice("");
    try {
      await request("/api/admin/" + resource, "DELETE", { id });
      await refresh();
      setNotice("Registro eliminado.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar"); }
    finally { setLoading(false); }
  }
  const unitBases = rows.units.filter(u => u.kind === "base" && u.active !== false);
  const compatibleUnits = (materialId: string) => {
    const material = rows.materials.find(m => m.id === materialId);
    return rows.units.filter(u => u.kind === "derived" && u.active !== false &&
      Boolean(material?.baseUnitId) && u.baseUnitId === material?.baseUnitId);
  };
  const unitPayload = () => ({
    name: unitDraft.name, symbol: unitDraft.symbol, kind: unitDraft.kind,
    ...(unitDraft.kind === "derived" ? { baseUnitId: unitDraft.baseUnitId } : {}),
    unitsPerUnit: unitDraft.kind === "base" ? 1 : Number(unitDraft.unitsPerUnit),
    active: unitDraft.active,
  });
  const presentationPayload = (value: typeof presentation) => ({
    materialId: value.materialId, name: value.name,
    ...(value.unitId ? {unitId: value.unitId} : {}),
    unitsPerPackage: value.unitId ?
      Number(rows.units.find(u => u.id === value.unitId)?.unitsPerUnit ?? 0) :
      Number(value.unitsPerPackage),
    active: value.active,
  });
  const materialPayload = (name: string, baseUnitValue: string, lines: LineId[], active: boolean) => ({
    name, lines, active,
    ...(baseUnitValue.startsWith("catalog:") ?
      {baseUnitId: baseUnitValue.slice(8)} :
      {baseUnit: baseUnitValue}),
  });
  function toggleLine(id: LineId, current: LineId[], setter: (next: LineId[]) => void) {
    setter(current.includes(id) ? current.filter(v => v !== id) : [...current, id]);
  }
  function updateGroup(index: number, update: (g: Group) => Group) {
    setProduct(p => ({ ...p, optionGroups: p.optionGroups.map((g, i) => i === index ? update(g) : g) }));
  }

  const unreadRequestCount=customerRequests.filter(item=>item.status==="received"&&!item.reviewedAt).length;
  const purchases = rows.purchases as unknown as Purchase[];
  const materialCosts = Object.fromEntries(rows.materials.map(material => [material.id, weightedUnitCost(purchases, material.id, {
    from: costFrom ? costFrom + "T00:00:00.000Z" : undefined,
    to: costTo ? costTo + "T23:59:59.999Z" : undefined
  })]));

  const materialCostsGross = Object.fromEntries(rows.materials.map(material => [material.id, weightedUnitCost(purchases, material.id, {
    from: costFrom ? costFrom + "T00:00:00.000Z" : undefined,
    to: costTo ? costTo + "T23:59:59.999Z" : undefined,
    includeTax: true,
  })]));
  const inclusiveRecipeCost = materialCostEstimateCents(product.baseMaterials, Object.fromEntries(Object.entries(materialCostsGross).filter(([, v])=>v!==null)) as Record<string, number>);
  const baseRecipeCost = materialCostEstimateCents(product.baseMaterials, Object.fromEntries(Object.entries(materialCosts).filter(([, v])=>v!==null)) as Record<string, number>);
  const purchaseBreakdown = inclusiveTaxBreakdown(asCents(purchase.amount || "0"), purchase.vatTreatment);

  return (
    <main className="admin">
      <header className="admin__header">
        <Link href="/" className="admin__logo">ATHELIER</Link>
        <span>Administración · México · MXN</span>
        {user&&authorized&&<div className="admin__notifications">
          <button type="button" className="admin__bell" aria-label={"Notificaciones: "+unreadRequestCount+" solicitudes pendientes de revisar"}
            title={unreadRequestCount ? unreadRequestCount+" solicitudes nuevas" : "Sin solicitudes nuevas"}
            onClick={()=>{setTab("requests");setError("");setNotice("");void loadRequests();}}>
            <span className="admin__bell-icon" aria-hidden="true">🔔</span>
            {unreadRequestCount>0&&<span className="admin__bell-count" aria-hidden="true">{unreadRequestCount>=100?"99+":unreadRequestCount}</span>}
            <span className="admin__bell-label">Solicitudes</span>
          </button>
        </div>}
        {user && <button className="admin__button admin__button--ghost" onClick={logout} type="button">Cerrar sesión</button>}
      </header>
      {!authReady ? <p className="admin__status">Comprobando acceso…</p> : !user ? (
        <section className="admin__login">
          <p className="admin__eyebrow">ACCESO RESTRINGIDO</p>
          <h1>Panel de propietarios</h1>
          <p>Inicia sesión con una de las cuentas autorizadas. El acceso al catálogo de insumos, costos y productos se valida en el servidor; iniciar sesión con Google no concede permisos.</p>
          <button type="button" className="admin__button" onClick={login}>Entrar con Google</button>
          {error && <p role="alert" className="admin__error">{error}</p>}
        </section>
      ) : !authorized ? (
        <section className="admin__login">
          <h1>Acceso administrativo no disponible</h1>
          <p>Tu cuenta no tiene permisos o el servidor de Firebase aún no está configurado. No se mostrará información privada.</p>
          {error && <p role="alert" className="admin__error">{error}</p>}
          <button type="button" className="admin__button admin__button--ghost" onClick={logout}>Usar otra cuenta</button>
        </section>
      ) : (
        <div className="admin__body">
          <div className="admin__heading">
            <div><p className="admin__eyebrow">CENTRO DE GESTIÓN</p><h1>Catálogo y precios</h1></div>
            <p className="admin__small">Administración autorizada · Compras históricas · Productos configurables</p>
          </div>
          <nav className="admin__tabs" aria-label="Administración">
            {resources.map(r => <button key={r} type="button" className={r===tab ? "is-selected" : ""} onClick={() => {setTab(r);setError("");setNotice("");}}>{tabs[r]} <span>{rows[r].length}</span></button>)}
            <button type="button" className={tab==="requests"?"is-selected":""} onClick={()=>{setTab("requests");setNotice("");void loadRequests();}}>Solicitudes{unreadRequestCount>0&&<span aria-label={unreadRequestCount+" nuevas"}>{unreadRequestCount>=100?"99+":unreadRequestCount}</span>}</button>
          </nav>
          {error && <p className="admin__error" role="alert">{error}</p>}
          {notice && <p className="admin__notice" role="status">{notice}</p>}
          {tab === "suppliers" && (
            <section className="admin__section">
              <h2>Proveedores</h2><p>Crea, edita, desactiva o elimina los proveedores que no tengan compras relacionadas.</p>
              <form onSubmit={(e:FormEvent)=>{e.preventDefault();void save("suppliers",{name:supplier,active:supplierActive},editingSupplier||undefined);}} className="admin__form">
                <label>Nombre del proveedor<input required maxLength={180} value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Ej. Papelería central" /></label>
                <label className="admin__check"><input type="checkbox" checked={supplierActive} onChange={e=>setSupplierActive(e.target.checked)}/>Activo</label>
                <div className="admin__actions">
                  <button disabled={loading} className="admin__button">{editingSupplier?"Guardar cambios":"Crear proveedor"}</button>
                  {editingSupplier&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingSupplier(null);setSupplier("");setSupplierActive(true);}}>Cancelar</button>}
                </div>
              </form>
              <div className="admin__records">{rows.suppliers.map(r=><div key={r.id} className="admin__record">
                <div><strong>{String(r.name)}</strong><small>{r.active===false?"Inactivo":"Activo"}</small></div>
                <div className="admin__actions">
                  <button type="button" disabled={loading} onClick={()=>{setEditingSupplier(r.id);setSupplier(String(r.name));setSupplierActive(r.active!==false);}}>Editar</button>
                  <button type="button" disabled={loading} onClick={()=>void save("suppliers",{name:r.name,active:r.active===false},r.id)}>{r.active===false?"Activar":"Desactivar"}</button>
                  <button type="button" disabled={loading} onClick={()=>void deleteRecord("suppliers",r.id,String(r.name))}>Eliminar</button>
                </div>
              </div>)}</div>
            </section>
          )}
          {tab === "units" && (
            <section className="admin__section">
              <h2>Catálogo de unidades y equivalencias</h2>
              <p>Define cualquier unidad base (hoja, pieza, metro, litro u otra) y sus conversiones. Ejemplo: <strong>1 paquete de 100 = 100 hojas</strong>. Las equivalencias se reutilizan en presentaciones compatibles.</p>
              <form className="admin__form" onSubmit={(e:FormEvent)=>{
                e.preventDefault();void save("units",unitPayload(),editingUnit||undefined);
              }}>
                <label>Tipo de unidad<select value={unitDraft.kind} onChange={e=>setUnitDraft(u=>({...u,kind:e.target.value as UnitDraft["kind"],baseUnitId:"",unitsPerUnit:"1"}))}>
                  <option value="base">Unidad base</option><option value="derived">Unidad de compra / conversión</option>
                </select></label>
                <label>Nombre<input required maxLength={180} value={unitDraft.name} onChange={e=>setUnitDraft(u=>({...u,name:e.target.value}))} placeholder={unitDraft.kind==="base"?"Hoja":"Paquete de 100 hojas"}/></label>
                <label>Símbolo o abreviatura<input required maxLength={30} value={unitDraft.symbol} onChange={e=>setUnitDraft(u=>({...u,symbol:e.target.value}))} placeholder={unitDraft.kind==="base"?"hoja":"paq. 100"}/></label>
                {unitDraft.kind==="derived"&&<>
                  <label>Equivale a la unidad base<select required value={unitDraft.baseUnitId} onChange={e=>setUnitDraft(u=>({...u,baseUnitId:e.target.value}))}>
                    <option value="">Seleccionar unidad base…</option>{unitBases.map(u=><option value={u.id} key={u.id}>{String(u.name)} ({String(u.symbol)})</option>)}
                  </select></label>
                  <label>Cantidad en unidades base<input type="number" min="0.000001" step="any" required value={unitDraft.unitsPerUnit} onChange={e=>setUnitDraft(u=>({...u,unitsPerUnit:e.target.value}))}/></label>
                </>}
                <label className="admin__check"><input type="checkbox" checked={unitDraft.active} onChange={e=>setUnitDraft(u=>({...u,active:e.target.checked}))}/>Activa</label>
                <div className="admin__actions admin__full">
                  <button disabled={loading || (unitDraft.kind==="derived"&&!unitDraft.baseUnitId)} className="admin__button">{editingUnit?"Guardar cambios":"Crear unidad"}</button>
                  {editingUnit&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingUnit(null);setUnitDraft(emptyUnit());}}>Cancelar</button>}
                </div>
              </form>
              <h3>Unidades registradas</h3>
              <div className="admin__records">{rows.units.map(u=><div className="admin__record" key={u.id}>
                <div><strong>{String(u.name)} ({String(u.symbol)})</strong>
                  <small>{u.kind==="base"?"Unidad base":`1 = ${Number(u.unitsPerUnit).toLocaleString("es-MX")} ${String(rows.units.find(b=>b.id===u.baseUnitId)?.name||"unidades")}`} · {u.active===false?"Inactiva":"Activa"}</small>
                </div>
                <div className="admin__actions">
                  <button type="button" disabled={loading} onClick={()=>{setEditingUnit(u.id);setUnitDraft({name:String(u.name),symbol:String(u.symbol),kind:u.kind as UnitDraft["kind"],baseUnitId:String(u.baseUnitId??""),unitsPerUnit:String(u.unitsPerUnit),active:u.active!==false});}}>Editar</button>
                  <button type="button" disabled={loading} onClick={()=>void save("units",{name:u.name,symbol:u.symbol,kind:u.kind,...(u.baseUnitId?{baseUnitId:u.baseUnitId}:{}),unitsPerUnit:u.unitsPerUnit,active:u.active===false},u.id)}>{u.active===false?"Activar":"Desactivar"}</button>
                  <button type="button" disabled={loading} onClick={()=>void deleteRecord("units",u.id,String(u.name))}>Eliminar</button>
                </div>
              </div>)}</div>
            </section>
          )}
          {tab === "materials" && (
            <section className="admin__section">
              <h2>Catálogo maestro de insumos</h2><p>Una unidad base puede venir del catálogo flexible. El costo se obtiene de compras reales en MXN; no del precio de venta.</p>
              <form className="admin__form" onSubmit={(e:FormEvent)=>{e.preventDefault();void save("materials",materialPayload(materialName,unit,lines,materialActive),editingMaterial||undefined);}}>
                <label>Nombre del insumo<input required value={materialName} onChange={e=>setMaterialName(e.target.value)} placeholder="Papel bond de 125 g" maxLength={180}/></label>
                <label>Unidad base
                  <select value={unit} onChange={e=>setUnit(e.target.value)} required>
                    <optgroup label="Unidades anteriores">{Object.entries(legacyUnits).map(([code,name])=><option key={code} value={code}>{name}</option>)}</optgroup>
                    {unitBases.length>0&&<optgroup label="Catálogo de unidades">{unitBases.map(u=><option key={u.id} value={"catalog:"+u.id}>{String(u.name)} ({String(u.symbol)})</option>)}</optgroup>}
                  </select>
                  <small>Para nuevas unidades, primero créalas en la pestaña «Unidades».</small>
                </label>
                <fieldset className="admin__fieldset"><legend>Aplicable a</legend>{businessLines.map(l=><label className="admin__check" key={l.id}><input type="checkbox" checked={lines.includes(l.id)} onChange={()=>toggleLine(l.id,lines,setLines)}/>{l.name}</label>)}</fieldset>
                <label className="admin__check"><input type="checkbox" checked={materialActive} onChange={e=>setMaterialActive(e.target.checked)}/>Activo</label>
                <div className="admin__actions admin__full">
                  <button className="admin__button" disabled={loading || !lines.length}>{editingMaterial?"Guardar cambios":"Crear insumo"}</button>
                  {editingMaterial&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingMaterial(null);setMaterialName("");setUnit("sheet");setMaterialActive(true);}}>Cancelar</button>}
                </div>
              </form>
              <h3>Insumos registrados</h3>
              <div className="admin__actions">
                <label>Costos desde <input aria-label="Fecha inicial de costos" type="date" value={costFrom} onChange={e=>setCostFrom(e.target.value)}/></label>
                <label>Hasta <input aria-label="Fecha final de costos" type="date" value={costTo} onChange={e=>setCostTo(e.target.value)}/></label>
                <button type="button" className="admin__button admin__button--ghost" onClick={()=>{setCostFrom("");setCostTo("");}}>Todo el historial</button>
              </div>
              <div className="admin__records">{rows.materials.map(m=><div className="admin__record" key={m.id}>
                <div><strong>{String(m.name)}</strong>
                  <small>{m.baseUnitId ? String(rows.units.find(u=>u.id===m.baseUnitId)?.name??"Unidad personalizada") : legacyUnits[String(m.baseUnit)]} · {Array.isArray(m.lines)?(m.lines as string[]).join(", "):""} · {m.active===false?"Inactivo":"Activo"}</small>
                </div>
                <div><span>Costo ponderado del periodo</span><strong>{typeof materialCostsGross[m.id]==="number" ? unitMoney(materialCostsGross[m.id]!) + " / unidad IVA incluido" : "Sin compras"}</strong><small>{typeof materialCosts[m.id]==="number" ? unitMoney(materialCosts[m.id]!) + " sin IVA" : ""}</small></div>
                <div className="admin__actions">
                  <button type="button" disabled={loading} onClick={()=>{setEditingMaterial(m.id);setMaterialName(String(m.name));setUnit(m.baseUnitId?"catalog:"+m.baseUnitId:String(m.baseUnit||"sheet"));setLines(m.lines as LineId[]);setMaterialActive(m.active!==false);}}>Editar</button>
                  <button type="button" disabled={loading} onClick={()=>void save("materials",materialPayload(String(m.name),m.baseUnitId?"catalog:"+m.baseUnitId:String(m.baseUnit),m.lines as LineId[],m.active===false),m.id)}>{m.active===false?"Activar":"Desactivar"}</button>
                  <button type="button" disabled={loading} onClick={()=>void deleteRecord("materials",m.id,String(m.name))}>Eliminar</button>
                </div>
              </div>)}</div>
            </section>
          )}
          {tab === "presentations" && (
            <section className="admin__section">
              <h2>Presentaciones de compra</h2>
              <p>Relaciona un insumo con una unidad de compra. Por ejemplo: «Paquete de 100», 1 paquete = 100 hojas. Puedes comprar mañana otra presentación sin modificar las compras pasadas.</p>
              <form className="admin__form" onSubmit={(e:FormEvent)=>{e.preventDefault();void save("presentations",presentationPayload(presentation),editingPresentation||undefined);}}>
                <label>Insumo<select required value={presentation.materialId} onChange={e=>setPresentation(p=>({...p,materialId:e.target.value,unitId:""}))}><option value="">Seleccionar…</option>{rows.materials.filter(m=>m.active!==false).map(m=><option key={m.id} value={m.id}>{String(m.name)}</option>)}</select></label>
                <label>Nombre de presentación<input required placeholder="Paquete de 100 hojas" value={presentation.name} onChange={e=>setPresentation(p=>({...p,name:e.target.value}))}/></label>
                <label>Unidad del catálogo (opcional)<select value={presentation.unitId} onChange={e=>setPresentation(p=>({...p,unitId:e.target.value,unitsPerPackage:e.target.value?String(rows.units.find(u=>u.id===e.target.value)?.unitsPerUnit??""):p.unitsPerPackage}))}>
                  <option value="">Conversión manual</option>{compatibleUnits(presentation.materialId).map(u=><option key={u.id} value={u.id}>{String(u.name)} · {String(u.unitsPerUnit)} unidades base</option>)}
                </select></label>
                <label>Equivalencia en unidades base<input type="number" required min="0.000001" step="any" disabled={!!presentation.unitId} value={presentation.unitsPerPackage} onChange={e=>setPresentation(p=>({...p,unitsPerPackage:e.target.value}))}/></label>
                <label className="admin__check"><input type="checkbox" checked={presentation.active} onChange={e=>setPresentation(p=>({...p,active:e.target.checked}))}/>Activa</label>
                <div className="admin__actions admin__full">
                  <button disabled={loading} className="admin__button">{editingPresentation?"Guardar cambios":"Crear presentación"}</button>
                  {editingPresentation&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingPresentation(null);setPresentation({materialId:"",name:"",unitId:"",unitsPerPackage:"1000",active:true});}}>Cancelar</button>}
                </div>
              </form>
              <div className="admin__records">{rows.presentations.map(p=><div className="admin__record" key={p.id}>
                <div><strong>{String(p.name)}</strong><small>{String(rows.materials.find(m=>m.id===p.materialId)?.name||"Insumo no encontrado")} · {p.active===false?"Inactiva":"Activa"}</small></div>
                <span>1 = {Number(p.unitsPerPackage).toLocaleString("es-MX")} unidades base</span>
                <div className="admin__actions">
                  <button type="button" disabled={loading} onClick={()=>{setEditingPresentation(p.id);setPresentation({materialId:String(p.materialId),name:String(p.name),unitId:String(p.unitId??""),unitsPerPackage:String(p.unitsPerPackage),active:p.active!==false});}}>Editar</button>
                  <button type="button" disabled={loading} onClick={()=>void save("presentations",presentationPayload({materialId:String(p.materialId),name:String(p.name),unitId:String(p.unitId??""),unitsPerPackage:String(p.unitsPerPackage),active:p.active===false}),p.id)}>{p.active===false?"Activar":"Desactivar"}</button>
                  <button type="button" disabled={loading} onClick={()=>void deleteRecord("presentations",p.id,String(p.name))}>Eliminar</button>
                </div>
              </div>)}</div>
            </section>
          )}
          {tab === "purchases" && (
            <section className="admin__section">
              <h2>Compras e historial de costos</h2><p>Cada compra es un registro histórico inmutable. Puedes indicar si el costo capturado es por paquete o por toda la compra.</p>
              <form className="admin__form" onSubmit={(e:FormEvent)=>{e.preventDefault();void save("purchases",{
                presentationId:purchase.presentationId,supplierId:purchase.supplierId,purchasedAt:new Date(purchase.purchasedAt+"T12:00:00-06:00").toISOString(),
                packages:Number(purchase.packages),grossCents:asCents(purchase.amount),vatTreatment:purchase.vatTreatment,costScope:purchase.costScope,currency:"MXN"
              });}}>
                <label>Proveedor<select required value={purchase.supplierId} onChange={e=>setPurchase(p=>({...p,supplierId:e.target.value}))}><option value="">Seleccionar…</option>{rows.suppliers.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{String(s.name)}</option>)}</select></label>
                <label>Presentación<select required value={purchase.presentationId} onChange={e=>setPurchase(p=>({...p,presentationId:e.target.value}))}><option value="">Seleccionar…</option>{rows.presentations.map(p=><option key={p.id} value={p.id}>{String(p.name)}</option>)}</select></label>
                <label>Fecha de compra<input type="date" required value={purchase.purchasedAt} onChange={e=>setPurchase(p=>({...p,purchasedAt:e.target.value}))}/></label>
                <label>Cantidad de paquetes<input type="number" required step="any" min="0.001" value={purchase.packages} onChange={e=>setPurchase(p=>({...p,packages:e.target.value}))}/></label>
                <label>Importe pagado con IVA incluido (MXN)<input type="number" required min="0" step=".01" value={purchase.amount} onChange={e=>setPurchase(p=>({...p,amount:e.target.value}))}/></label>
                <label>Tratamiento de IVA<select value={purchase.vatTreatment} onChange={e=>setPurchase(p=>({...p,vatTreatment:e.target.value as VatTreatment}))}>
                  <option value="standard">IVA general 16% incluido</option>
                  <option value="zero">Tasa 0%</option>
                  <option value="exempt">Exento</option>
                </select></label>
                <p className="admin__full">Desglose automático (sin añadir impuestos): base {money(purchaseBreakdown.netCents)} + IVA {money(purchaseBreakdown.taxCents)} = <strong>{money(purchaseBreakdown.grossCents)}</strong>. La tasa aplicable depende del artículo y comprobante.</p>
                <label>Importe capturado<select value={purchase.costScope} onChange={e=>setPurchase(p=>({...p,costScope:e.target.value as "wholePurchase"|"perPackage"}))}><option value="wholePurchase">Total de la compra</option><option value="perPackage">Por cada paquete</option></select></label>
                <button className="admin__button" disabled={loading}>Registrar compra</button>
              </form>
              <h3>Historial</h3>
              <div className="admin__records">{purchases.map(p=><div className="admin__record" key={p.id}>
                <div><strong>{rows.materials.find(m=>m.id===p.materialId)?.name as string || "Insumo"}</strong><small>{new Date(p.purchasedAt).toLocaleDateString("es-MX",{timeZone:"UTC"})}</small></div>
                <div><span>Unidades: {purchaseUnitCount(p).toLocaleString("es-MX")}</span><strong>{money(purchaseTotalCostCents(p,true))} con impuesto</strong></div>
                <div><span>Por unidad: {unitMoney(purchaseTotalCostCents(p,true)/purchaseUnitCount(p))} con IVA · {unitMoney(purchaseTotalCostCents(p)/purchaseUnitCount(p))} sin IVA</span><strong>IVA incluido {money(p.taxCents * (p.costScope==="perPackage" ? p.packages : 1))}</strong></div>
              </div>)}</div>
            </section>
          )}
          {tab === "products" && (
            <section className="admin__section">
              <h2>Constructor de productos</h2>
              <p>Establece el precio de venta de forma independiente de tus costos. Define las opciones autorizadas y en qué líneas se publicará.</p>
              <form className="admin__form" onSubmit={(e:FormEvent)=>{e.preventDefault();void save("products",product,editingProduct||undefined);}}>
                <label>Nombre del producto<input required maxLength={180} value={product.title} onChange={e=>setProduct(p=>({...p,title:e.target.value}))} placeholder="Ej. Libreta personalizada"/></label>
                <label>Descripción<textarea maxLength={1500} rows={3} value={product.description} onChange={e=>setProduct(p=>({...p,description:e.target.value}))}/></label>
                <label>URL pública de imagen (opcional)<input type="text" placeholder="https://..." value={product.imageUrl} onChange={e=>setProduct(p=>({...p,imageUrl:e.target.value}))}/></label>
                <label>Adjuntar imagen principal (JPG, PNG o WebP; máximo 3 MB)
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageUploading || loading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadProductImage(file);e.target.value="";}}/>
                </label>
                {imageUploading&&<p className="admin__full" role="status">Subiendo fotografía…</p>}
                {product.imageUrl&&<p className="admin__full">Imagen seleccionada: {product.imageUrl.startsWith("/api/") ? "Cargada en almacenamiento privado para uso del catálogo" : "URL externa"}</p>}
                <div className="admin__full admin__gallery-editor">
                  <h3>Galería de producto — mostrar interiores sin recortar</h3>
                  <p>La imagen principal se muestra completa. Añade hasta 6 fotografías de interiores, contraportada, detalles o un collage. Se mostrarán como miniaturas seleccionables en el catálogo. Estas imágenes son públicas sólo cuando el producto esté publicado.</p>
                  <label>Subir fotografías adicionales (JPG, PNG o WebP; máximo 3 MB cada una)
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={imageUploading||loading||product.galleryImageUrls.length>=6}
                      onChange={e=>{const files=Array.from(e.target.files??[]);if(files.length)void uploadGalleryImages(files);e.target.value="";}}/>
                  </label>
                  <div className="admin__gallery-list">
                    {product.galleryImageUrls.map((url,i)=><div className="admin__gallery-entry" key={url}>
                      <img src={url} alt={"Foto adicional "+(i+1)} loading="lazy"/>
                      <span>Foto {i+1}</span>
                      <button type="button" className="admin__button admin__button--ghost" disabled={imageUploading||i===0}
                        onClick={()=>setProduct(p=>{const next=[...p.galleryImageUrls];[next[i-1],next[i]]=[next[i],next[i-1]];return {...p,galleryImageUrls:next};})}>↑</button>
                      <button type="button" className="admin__button admin__button--ghost" disabled={imageUploading||i===product.galleryImageUrls.length-1}
                        onClick={()=>setProduct(p=>{const next=[...p.galleryImageUrls];[next[i],next[i+1]]=[next[i+1],next[i]];return {...p,galleryImageUrls:next};})}>↓</button>
                      <button type="button" className="admin__button admin__button--ghost" disabled={imageUploading}
                        onClick={()=>setProduct(p=>({...p,galleryImageUrls:p.galleryImageUrls.filter((_,index)=>index!==i)}))}>Quitar</button>
                    </div>)}
                  </div>
                </div>
                <label className="admin__check"><input type="checkbox" checked={product.allowBasePurchase} onChange={e=>setProduct(p=>({...p,allowBasePurchase:e.target.checked}))}/>Permitir comprar el producto estándar sin adicionales, incluso si algún grupo está marcado como obligatorio.</label>
                <div className="admin__full">
                  <h3>Fotografías que puede aportar el cliente</h3>
                  <p>Selecciona las áreas del producto para las que se aceptan imágenes. Los archivos permanecen en el dispositivo del cliente hasta que envíe una solicitud privada al taller desde su carrito.</p>
                  {product.photoSlots.map((slot,i)=><div key={slot.id} className="admin__option">
                    <label>Área / sección<input maxLength={100} value={slot.label} onChange={e=>setProduct(p=>({...p,photoSlots:p.photoSlots.map((x,j)=>j===i?{...x,label:e.target.value}:x)}))}/></label>
                    <label>Máximo de fotos<input type="number" min="1" max="10" value={slot.maxFiles} onChange={e=>setProduct(p=>({...p,photoSlots:p.photoSlots.map((x,j)=>j===i?{...x,maxFiles:Number(e.target.value)}:x)}))}/></label>
                    <button type="button" className="admin__button admin__button--ghost" onClick={()=>setProduct(p=>({...p,photoSlots:p.photoSlots.filter((_,j)=>j!==i)}))}>Quitar</button>
                  </div>)}
                  <button type="button" className="admin__button admin__button--ghost" disabled={product.photoSlots.length>=10} onClick={()=>setProduct(p=>({...p,photoSlots:[...p.photoSlots,{id:crypto.randomUUID(),label:"Nueva sección",maxFiles:1}]}))}>+ Agregar sección de fotografías</button>
                </div>
                <label>Precio base de venta (MXN, IVA incluido cuando aplique)<input type="number" min="0" step=".01" required value={(product.basePriceCents/100).toString()} onChange={e=>setProduct(p=>({...p,basePriceCents:asCents(e.target.value)}))}/></label>
                <fieldset className="admin__fieldset"><legend>Publicar en</legend>{businessLines.map(l=><label className="admin__check" key={l.id}><input type="checkbox" checked={product.lineIds.includes(l.id)} onChange={()=>toggleLine(l.id,product.lineIds,next=>setProduct(p=>({...p,lineIds:next})))}/>{l.name}</label>)}</fieldset>
                <label>Estado<select value={product.status} onChange={e=>setProduct(p=>({...p,status:e.target.value as Draft["status"]}))}><option value="draft">Borrador (no visible)</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
                <div className="admin__full">
                  <h3>Opciones de personalización</h3>
                  <p>Agrega grupos como “Tipo de pasta” o “Secciones”. Dentro de cada uno establece el precio de cada alternativa.</p>
                  {product.optionGroups.map((g,i)=><div className="admin__option-group" key={g.id}>
                    <label>Nombre del grupo<input value={g.title} onChange={e=>updateGroup(i,group=>({...group,title:e.target.value}))}/></label>
                    <label>Selección<select value={g.selection} onChange={e=>updateGroup(i,group=>({...group,selection:e.target.value as Group["selection"]}))}><option value="single">Una opción</option><option value="multiple">Varias opciones</option></select></label>
                    <label className="admin__check"><input type="checkbox" checked={g.required} onChange={e=>updateGroup(i,group=>({...group,required:e.target.checked}))}/>Obligatorio</label>
                    <div className="admin__actions">
                      <span>Orden {i+1} de {product.optionGroups.length}</span>
                      <button type="button" className="admin__button admin__button--ghost" disabled={i===0} onClick={()=>setProduct(p=>{const groups=[...p.optionGroups];[groups[i-1],groups[i]]=[groups[i],groups[i-1]];return {...p,optionGroups:groups};})}>↑ Subir</button>
                      <button type="button" className="admin__button admin__button--ghost" disabled={i===product.optionGroups.length-1} onClick={()=>setProduct(p=>{const groups=[...p.optionGroups];[groups[i],groups[i+1]]=[groups[i+1],groups[i]];return {...p,optionGroups:groups};})}>↓ Bajar</button>
                    </div>
                    {g.options.map((option,j)=><div className="admin__option" key={option.id}>
                      <label>Opción<input value={option.label} onChange={e=>updateGroup(i,group=>({...group,options:group.options.map((o,k)=>k===j?{...o,label:e.target.value}:o)}))}/></label>
                      <label>Adicional MXN<input type="number" step=".01" min="0" value={option.priceCents/100} onChange={e=>updateGroup(i,group=>({...group,options:group.options.map((o,k)=>k===j?{...o,priceCents:asCents(e.target.value)}:o)}))}/></label>
                      <label>Tipo<select value={option.pricingMode} onChange={e=>updateGroup(i,group=>({...group,options:group.options.map((o,k)=>k===j?{...o,pricingMode:e.target.value as Option["pricingMode"]}:o)}))}><option value="fixed">Fijo</option><option value="perUnit">Por unidad</option></select></label>
                      <button type="button" className="admin__button admin__button--ghost" onClick={()=>updateGroup(i,group=>({...group,options:group.options.filter((_,k)=>k!==j)}))}>Quitar</button>
                    </div>)}
                    <div className="admin__actions">
                      <button type="button" className="admin__button admin__button--ghost" onClick={()=>updateGroup(i,group=>({...group,options:[...group.options,{id:crypto.randomUUID(),label:"Nueva opción",priceCents:0,pricingMode:"fixed"}]}))}>+ Agregar alternativa</button>
                      <button type="button" className="admin__button admin__button--ghost" onClick={()=>setProduct(p=>({...p,optionGroups:p.optionGroups.filter((_,k)=>k!==i)}))}>Eliminar grupo</button>
                    </div>
                  </div>)}
                  <div className="admin__actions">
                    <input aria-label="Nombre del nuevo grupo" placeholder="Nuevo grupo (ej. pasta)" value={newGroupTitle} onChange={e=>setNewGroupTitle(e.target.value)}/>
                    <button type="button" className="admin__button admin__button--ghost" disabled={!newGroupTitle.trim()} onClick={()=>{setProduct(p=>({...p,optionGroups:[...p.optionGroups,{id:crypto.randomUUID(),title:newGroupTitle,selection:"single",required:false,options:[{id:crypto.randomUUID(),label:"Nueva opción",priceCents:0,pricingMode:"fixed"}]}]}));setNewGroupTitle("");}}>+ Agregar grupo</button>
                  </div>
                </div>
                <div className="admin__full">
                  <h3>Materiales base de fabricación</h3><p>Consumo por unidad de producto. Costeo a partir de compras reales, con y sin IVA, independiente del precio de venta.</p>
                  {product.baseMaterials.map((b,i)=><div key={i} className="admin__record"><span>{String(rows.materials.find(m=>m.id===b.materialId)?.name ?? b.materialId)} · {b.unitsConsumed} unidades</span><button type="button" className="admin__button admin__button--ghost" onClick={()=>setProduct(p=>({...p,baseMaterials:p.baseMaterials.filter((_,j)=>j!==i)}))}>Quitar</button></div>)}
                  <div className="admin__actions">
                    <select aria-label="Insumo asociado" value={newBillId} onChange={e=>setNewBillId(e.target.value)}><option value="">Seleccionar insumo…</option>{rows.materials.map(m=><option key={m.id} value={m.id}>{String(m.name)}</option>)}</select>
                    <input aria-label="Cantidad por producto" type="number" min=".001" step="any" value={newBillUnits} onChange={e=>setNewBillUnits(e.target.value)}/>
                    <button type="button" className="admin__button admin__button--ghost" disabled={!newBillId || !(Number(newBillUnits)>0)} onClick={()=>setProduct(p=>({...p,baseMaterials:[...p.baseMaterials,{materialId:newBillId,unitsConsumed:Number(newBillUnits)}]}))}>+ Asociar material</button>
                  </div>
                </div>
                <div className="admin__full"><strong>Costo estimado de materiales por producto: {inclusiveRecipeCost === null ? "Faltan costos de compra" : money(inclusiveRecipeCost)} IVA incluido</strong><p>Base sin IVA: {baseRecipeCost === null ? "Sin datos completos" : money(baseRecipeCost)} · Precio de venta: {money(product.basePriceCents)} (IVA incluido cuando aplique). No se suma IVA al precio de venta y el costo no lo modifica automáticamente.</p></div>
                <div className="admin__actions admin__full"><button className="admin__button" disabled={loading || !product.lineIds.length}>{editingProduct?"Guardar cambios":"Crear producto"}</button>{editingProduct&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingProduct(null);setProduct(newDraft());}}>Cancelar edición</button>}</div>
              </form>
              <h3>Productos registrados</h3>
              <div className="admin__records">{rows.products.map(item=><div className="admin__record" key={item.id}>
                <div><strong>{String(item.title)}</strong><small>{String(item.status)} · {(item.lineIds as string[]).join(", ")}</small></div>
                <strong>{money(Number(item.basePriceCents))}</strong>
                <button type="button" className="admin__button admin__button--ghost" onClick={()=>{setProduct({title:String(item.title),description:String(item.description??""),imageUrl:String(item.imageUrl??""),galleryImageUrls:Array.isArray(item.galleryImageUrls)?item.galleryImageUrls as string[]:[],allowBasePurchase:permitsBasePurchase({title:String(item.title),allowBasePurchase:typeof item.allowBasePurchase==="boolean" ? item.allowBasePurchase : undefined}),photoSlots:photoSlotsForProduct({title:String(item.title),photoSlots:Array.isArray(item.photoSlots)?item.photoSlots as PhotoSlot[]:undefined}),basePriceCents:Number(item.basePriceCents),currency:"MXN",lineIds:(item.lineIds as string[]).filter(isLineId),status:item.status as Draft["status"],optionGroups:item.optionGroups as Group[],baseMaterials:item.baseMaterials as Bill[]});setEditingProduct(item.id);window.scrollTo({top:0,behavior:"smooth"});}}>Editar</button>
                {item.status==="draft" ? <button type="button" className="admin__button admin__button--ghost" disabled={loading} onClick={()=>void deleteRecord("products",item.id,String(item.title))}>Eliminar borrador</button> :
                 <button type="button" className="admin__button admin__button--ghost" disabled={loading || item.status==="archived"} onClick={()=>void save("products",{title:item.title,description:item.description??"",imageUrl:item.imageUrl??"",galleryImageUrls:item.galleryImageUrls??[],allowBasePurchase:item.allowBasePurchase===true,photoSlots:item.photoSlots??[],basePriceCents:item.basePriceCents,currency:"MXN",lineIds:item.lineIds,status:"archived",optionGroups:item.optionGroups,baseMaterials:item.baseMaterials},item.id)}>Archivar</button>}
              </div>)}</div>
            </section>
          )}
          {tab === "requests" && <section className="admin__section admin__requests">
            <h2>Solicitudes de personalización</h2>
            <p>Solicitudes y fotografías recibidas en privado. No son órdenes cobradas; contacta al cliente para confirmar disponibilidad y pago.</p>
            <button type="button" className="admin__button admin__button--ghost" disabled={requestsLoading} onClick={()=>void loadRequests()}>{requestsLoading?"Actualizando…":"Actualizar solicitudes"}</button>
            <p className="admin__request-summary" role="status">{unreadRequestCount>0?unreadRequestCount+" solicitud(es) nuevas por revisar.":"Sin solicitudes nuevas pendientes de revisar."}</p>
            {customerRequests.length===0&&!requestsLoading&&<p>No hay solicitudes recibidas.</p>}
            {customerRequests.map(item=><article className="admin__request" key={item.id}>
              <div className="admin__request-title">
                <h3>{item.name} <small>· {new Date(item.createdAt).toLocaleString("es-MX")}</small></h3>
                {item.reviewedAt?
                  <span className="admin__request-reviewed">✓ Revisada</span>:
                  <span className="admin__request-new">Nueva</span>}
              </div>
              <p><strong>Referencia:</strong> {item.id}</p>
              <p><strong>Contacto:</strong> {item.email||"Sin correo"} · {item.phone||"Sin teléfono"}</p>
              {item.note&&<p><strong>Indicaciones:</strong> {item.note}</p>}
              <ul>{item.items.map(line=><li key={line.id}>{line.productTitle} × {line.quantity} — {money(line.unitPriceCents)} por pieza</li>)}</ul>
              <p><strong>Total de referencia:</strong> {money(item.totalCents)} (sin pago recibido).</p>
              {!item.reviewedAt&&<button type="button" className="admin__button admin__button--ghost"
                disabled={reviewingId!==null} onClick={()=>void markRequestReviewed(item.id)}>
                {reviewingId===item.id?"Guardando…":"Marcar como revisada"}
              </button>}
              {item.photos.length>0&&<div><strong>Fotografías privadas:</strong>
                <div className="admin__request-photos">{item.photos.filter(photo=>photo.uploaded).map(photo=>
                  <button type="button" className="admin__button admin__button--ghost" key={photo.id} onClick={()=>void downloadRequestPhoto(item.id,photo.id)}>
                    Descargar {photo.slotLabel}: {photo.fileName}
                  </button>)}</div>
              </div>}
            </article>)}
          </section>}
          <footer className="admin__footer">Los cambios de costos no modifican automáticamente los precios de venta. Las compras conservan sus datos históricos. MXN · Athelier.</footer>
        </div>
      )}
    </main>
  );
}
