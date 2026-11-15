"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { browserAuth, googleProvider } from "@/lib/firebase-client";
import { businessLines, type LineId } from "@/lib/brand";
import { purchaseTotalCostCents, purchaseUnitCount, weightedUnitCost, configuredUnitPriceCents, type Purchase, type CommercialProduct } from "@/lib/commerce";
import "./admin.css";

type Resource = "suppliers" | "units" | "materials" | "presentations" | "purchases" | "products";
type UnitDraft = { name: string; symbol: string; kind: "base" | "derived"; baseUnitId: string; unitsPerUnit: string; active: boolean };
const emptyUnit = (): UnitDraft => ({name:"",symbol:"",kind:"base",baseUnitId:"",unitsPerUnit:"1",active:true});
const legacyUnits: Record<string,string> = {sheet:"Hoja",piece:"Pieza",gram:"Gramo",millilitre:"Mililitro",centimetre:"Centímetro"};
type Entry = { id: string; [key: string]: unknown };
type Option = { id: string; label: string; priceCents: number; pricingMode: "fixed" | "perUnit" };
type Group = { id: string; title: string; selection: "single" | "multiple"; required: boolean; options: Option[] };
type Bill = { materialId: string; unitsConsumed: number };
type Draft = { title: string; description: string; imageUrl: string; basePriceCents: number; currency: "MXN"; lineIds: LineId[]; status: "draft" | "published" | "archived"; optionGroups: Group[]; baseMaterials: Bill[] };
const resources: Resource[] = ["suppliers", "units", "materials", "presentations", "purchases", "products"];
const tabs: Record<Resource, string> = { suppliers: "Proveedores", units: "Unidades", materials: "Insumos", presentations: "Presentaciones", purchases: "Compras", products: "Productos" };
const money = (cents: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cents / 100);
const asCents = (value: string) => Math.round(Number(value) * 100);
const unitMoney = (cents: number) => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:4,maximumFractionDigits:6}).format(cents / 100);
const newDraft = (): Draft => ({ title: "", description: "", imageUrl: "", basePriceCents: 0, currency: "MXN", lineIds: ["personalizaciones"], status: "draft", optionGroups: [], baseMaterials: [] });
const isLineId = (x: string): x is LineId => ["reposteria", "personalizaciones", "fotografia"].includes(x);

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Resource>("materials");
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
  const [purchase, setPurchase] = useState({ presentationId: "", supplierId: "", packages: "1", amount: "", tax: "0", costScope: "wholePurchase" as "wholePurchase" | "perPackage", purchasedAt: new Date().toISOString().slice(0,10) });
  const [product, setProduct] = useState<Draft>(newDraft);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newGroupTitle, setNewGroupTitle] = useState("");
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
  async function logout() {
    await signOut(browserAuth()); setUser(null); setAuthorized(false); setRows({ suppliers: [], units: [], materials: [], presentations: [], purchases: [], products: [] });
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
      if (resource === "purchases") setPurchase(p => ({ ...p, amount: "", tax: "0", packages: "1" }));
      if (resource === "products") { setProduct(newDraft()); setEditingProduct(null); }
    } catch(e) { setError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setLoading(false); }
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

  const purchases = rows.purchases as unknown as Purchase[];
  const materialCosts = Object.fromEntries(rows.materials.map(material => [material.id, weightedUnitCost(purchases, material.id, {
    from: costFrom ? costFrom + "T00:00:00.000Z" : undefined,
    to: costTo ? costTo + "T23:59:59.999Z" : undefined
  })]));

  return (
    <main className="admin">
      <header className="admin__header">
        <Link href="/" className="admin__logo">ATHELIER</Link>
        <span>Administración · México · MXN</span>
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
                <div><span>Costo ponderado del periodo</span><strong>{typeof materialCosts[m.id]==="number" ? unitMoney(materialCosts[m.id]!) + " / unidad" : "Sin compras"}</strong></div>
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
                packages:Number(purchase.packages),amountCents:asCents(purchase.amount),taxCents:asCents(purchase.tax),costScope:purchase.costScope,currency:"MXN"
              });}}>
                <label>Proveedor<select required value={purchase.supplierId} onChange={e=>setPurchase(p=>({...p,supplierId:e.target.value}))}><option value="">Seleccionar…</option>{rows.suppliers.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{String(s.name)}</option>)}</select></label>
                <label>Presentación<select required value={purchase.presentationId} onChange={e=>setPurchase(p=>({...p,presentationId:e.target.value}))}><option value="">Seleccionar…</option>{rows.presentations.map(p=><option key={p.id} value={p.id}>{String(p.name)}</option>)}</select></label>
                <label>Fecha de compra<input type="date" required value={purchase.purchasedAt} onChange={e=>setPurchase(p=>({...p,purchasedAt:e.target.value}))}/></label>
                <label>Cantidad de paquetes<input type="number" required step="any" min="0.001" value={purchase.packages} onChange={e=>setPurchase(p=>({...p,packages:e.target.value}))}/></label>
                <label>Costo sin impuesto (MXN)<input type="number" required min="0" step=".01" value={purchase.amount} onChange={e=>setPurchase(p=>({...p,amount:e.target.value}))}/></label>
                <label>Impuesto (MXN)<input type="number" required min="0" step=".01" value={purchase.tax} onChange={e=>setPurchase(p=>({...p,tax:e.target.value}))}/></label>
                <label>Importe capturado<select value={purchase.costScope} onChange={e=>setPurchase(p=>({...p,costScope:e.target.value as "wholePurchase"|"perPackage"}))}><option value="wholePurchase">Total de la compra</option><option value="perPackage">Por cada paquete</option></select></label>
                <button className="admin__button" disabled={loading}>Registrar compra</button>
              </form>
              <h3>Historial</h3>
              <div className="admin__records">{purchases.map(p=><div className="admin__record" key={p.id}>
                <div><strong>{rows.materials.find(m=>m.id===p.materialId)?.name as string || "Insumo"}</strong><small>{new Date(p.purchasedAt).toLocaleDateString("es-MX",{timeZone:"UTC"})}</small></div>
                <div><span>Unidades: {purchaseUnitCount(p).toLocaleString("es-MX")}</span><strong>{money(purchaseTotalCostCents(p,true))} con impuesto</strong></div>
                <div><span>Sin impuesto por unidad</span><strong>{unitMoney(purchaseTotalCostCents(p)/purchaseUnitCount(p))}</strong></div>
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
                <label>URL pública de imagen (opcional)<input type="url" placeholder="https://..." value={product.imageUrl} onChange={e=>setProduct(p=>({...p,imageUrl:e.target.value}))}/></label>
                <label>Precio base de venta (MXN)<input type="number" min="0" step=".01" required value={(product.basePriceCents/100).toString()} onChange={e=>setProduct(p=>({...p,basePriceCents:asCents(e.target.value)}))}/></label>
                <fieldset className="admin__fieldset"><legend>Publicar en</legend>{businessLines.map(l=><label className="admin__check" key={l.id}><input type="checkbox" checked={product.lineIds.includes(l.id)} onChange={()=>toggleLine(l.id,product.lineIds,next=>setProduct(p=>({...p,lineIds:next})))}/>{l.name}</label>)}</fieldset>
                <label>Estado<select value={product.status} onChange={e=>setProduct(p=>({...p,status:e.target.value as Draft["status"]}))}><option value="draft">Borrador (no visible)</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
                <div className="admin__full">
                  <h3>Opciones de personalización</h3>
                  <p>Agrega grupos como “Tipo de pasta” o “Secciones”. Dentro de cada uno establece el precio de cada alternativa.</p>
                  {product.optionGroups.map((g,i)=><div className="admin__option-group" key={g.id}>
                    <label>Nombre del grupo<input value={g.title} onChange={e=>updateGroup(i,group=>({...group,title:e.target.value}))}/></label>
                    <label>Selección<select value={g.selection} onChange={e=>updateGroup(i,group=>({...group,selection:e.target.value as Group["selection"]}))}><option value="single">Una opción</option><option value="multiple">Varias opciones</option></select></label>
                    <label className="admin__check"><input type="checkbox" checked={g.required} onChange={e=>updateGroup(i,group=>({...group,required:e.target.checked}))}/>Obligatorio</label>
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
                  <h3>Materiales base de fabricación</h3><p>Consumo por unidad de producto. Es independiente de cuánto cobras.</p>
                  {product.baseMaterials.map((b,i)=><div key={i} className="admin__record"><span>{String(rows.materials.find(m=>m.id===b.materialId)?.name ?? b.materialId)} · {b.unitsConsumed} unidades</span><button type="button" className="admin__button admin__button--ghost" onClick={()=>setProduct(p=>({...p,baseMaterials:p.baseMaterials.filter((_,j)=>j!==i)}))}>Quitar</button></div>)}
                  <div className="admin__actions">
                    <select aria-label="Insumo asociado" value={newBillId} onChange={e=>setNewBillId(e.target.value)}><option value="">Seleccionar insumo…</option>{rows.materials.map(m=><option key={m.id} value={m.id}>{String(m.name)}</option>)}</select>
                    <input aria-label="Cantidad por producto" type="number" min=".001" step="any" value={newBillUnits} onChange={e=>setNewBillUnits(e.target.value)}/>
                    <button type="button" className="admin__button admin__button--ghost" disabled={!newBillId || !(Number(newBillUnits)>0)} onClick={()=>setProduct(p=>({...p,baseMaterials:[...p.baseMaterials,{materialId:newBillId,unitsConsumed:Number(newBillUnits)}]}))}>+ Asociar material</button>
                  </div>
                </div>
                <div className="admin__actions admin__full"><button className="admin__button" disabled={loading || !product.lineIds.length}>{editingProduct?"Guardar cambios":"Crear producto"}</button>{editingProduct&&<button type="button" className="admin__button admin__button--ghost" onClick={()=>{setEditingProduct(null);setProduct(newDraft());}}>Cancelar edición</button>}</div>
              </form>
              <h3>Productos registrados</h3>
              <div className="admin__records">{rows.products.map(item=><div className="admin__record" key={item.id}>
                <div><strong>{String(item.title)}</strong><small>{String(item.status)} · {(item.lineIds as string[]).join(", ")}</small></div>
                <strong>{money(Number(item.basePriceCents))}</strong>
                <button type="button" className="admin__button admin__button--ghost" onClick={()=>{setProduct({title:String(item.title),description:String(item.description??""),imageUrl:String(item.imageUrl??""),basePriceCents:Number(item.basePriceCents),currency:"MXN",lineIds:(item.lineIds as string[]).filter(isLineId),status:item.status as Draft["status"],optionGroups:item.optionGroups as Group[],baseMaterials:item.baseMaterials as Bill[]});setEditingProduct(item.id);window.scrollTo({top:0,behavior:"smooth"});}}>Editar</button>
              </div>)}</div>
            </section>
          )}
          <footer className="admin__footer">Los cambios de costos no modifican automáticamente los precios de venta. Las compras conservan sus datos históricos. MXN · Athelier.</footer>
        </div>
      )}
    </main>
  );
}
