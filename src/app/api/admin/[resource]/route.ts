import { NextResponse } from "next/server";
import type { Firestore } from "firebase-admin/firestore";
import { adminSession, apiError, AdminApiError, PRIVATE_HEADERS } from "@/lib/admin-server";
import { isResource, validateInput, type Resource } from "@/lib/admin-schema";
import { inclusiveTaxBreakdown, type VatTreatment } from "@/lib/iva";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ resource: string }> };
const documentId = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{8,160}$/.test(value))
    throw new AdminApiError(400, "INVALID_ID", "Identificador inválido");
  return value;
};
const catalog = (db: Firestore, resource: Resource) => db.collection("admin_" + resource);
const referenced = async (db: Firestore, resource: Resource, field: string, value: string) =>
  !(await catalog(db, resource).where(field, "==", value).limit(1).get()).empty;
const cannotDelete = (name: string) => {
  throw new AdminApiError(409, "RECORD_IN_USE", name + " tiene referencias. Desactívalo en lugar de eliminarlo.");
};
const validRecord = async (db: Firestore, resource: Resource, id: string) => {
  const ref = await catalog(db, resource).doc(id).get();
  if (!ref.exists) throw new AdminApiError(400, "MISSING_REFERENCE", "Referencia no encontrada en " + resource);
  return ref.data() ?? {};
};

async function assertNoReferences(db: Firestore, resource: Resource, id: string) {
  if (resource === "suppliers" && await referenced(db, "purchases", "supplierId", id)) cannotDelete("El proveedor");
  if (resource === "units") {
    if (await referenced(db, "units", "baseUnitId", id) ||
        await referenced(db, "materials", "baseUnitId", id) ||
        await referenced(db, "presentations", "unitId", id)) cannotDelete("La unidad");
  }
  if (resource === "materials") {
    if (await referenced(db, "presentations", "materialId", id) ||
        await referenced(db, "purchases", "materialId", id)) cannotDelete("El insumo");
    // BOM is nested in products, so fail closed if catalog exceeds audit limit.
    const products = await catalog(db, "products").limit(401).get();
    if (products.size > 400) cannotDelete("El insumo");
    if (products.docs.some(d => (d.get("baseMaterials") as Array<{materialId: string}> | undefined)
      ?.some(p => p.materialId === id))) cannotDelete("El insumo");
  }
  if (resource === "presentations" && await referenced(db, "purchases", "presentationId", id))
    cannotDelete("La presentación");
  if (resource === "products") {
    const product = await validRecord(db, "products", id);
    if (product.status !== "draft") throw new AdminApiError(409, "ARCHIVE_FIRST", "Sólo se eliminan borradores. Archiva primero los productos publicados.");
  }
}

async function validateReferences(db: Firestore, resource: Resource, data: Record<string, unknown>, editingId?: string) {
  if (resource === "units") {
    if (data.kind === "derived") {
      const base = await validRecord(db, "units", String(data.baseUnitId));
      if (base.kind !== "base" || base.active === false) throw new AdminApiError(400, "INVALID_UNIT", "La equivalencia debe apuntar a una unidad base activa");
    }
    if (editingId) {
      const previous = await validRecord(db, "units", editingId);
      if ((previous.kind !== data.kind || previous.baseUnitId !== data.baseUnitId ||
           previous.unitsPerUnit !== data.unitsPerUnit) &&
          (await referenced(db, "materials", "baseUnitId", editingId) ||
           await referenced(db, "presentations", "unitId", editingId) ||
           await referenced(db, "units", "baseUnitId", editingId))) {
        throw new AdminApiError(409, "UNIT_IN_USE", "Esta equivalencia ya está en uso. Crea una nueva unidad o presentación; conserva la existente para trazabilidad.");
      }
    }
  }
  if (resource === "materials") {
    if (data.baseUnitId) {
      const base = await validRecord(db, "units", String(data.baseUnitId));
      if (base.kind !== "base" || base.active === false) throw new AdminApiError(400, "INVALID_UNIT", "Selecciona una unidad base activa");
    }
    if (editingId) {
      const prev = await validRecord(db, "materials", editingId);
      if ((prev.baseUnit !== data.baseUnit || prev.baseUnitId !== data.baseUnitId) &&
          (await referenced(db, "presentations", "materialId", editingId) ||
           await referenced(db, "purchases", "materialId", editingId))) {
        throw new AdminApiError(409, "BASE_UNIT_IN_USE", "No puedes cambiar la unidad base de un insumo con presentaciones o compras. Crea otro insumo.");
      }
    }
  }
  if (resource === "presentations") {
    const material = await validRecord(db, "materials", String(data.materialId));
    if (material.active === false) throw new AdminApiError(400, "MATERIAL_INACTIVE", "El insumo está inactivo");
    if (data.unitId) {
      const unit = await validRecord(db, "units", String(data.unitId));
      if (unit.kind !== "derived" || unit.active === false)
        throw new AdminApiError(400, "INVALID_UNIT", "Selecciona una unidad de presentación activa");
      if (!material.baseUnitId || unit.baseUnitId !== material.baseUnitId)
        throw new AdminApiError(400, "INCOMPATIBLE_UNIT", "La presentación no corresponde a la unidad base del insumo");
      // The server, not the browser, determines the conversion.
      data.unitsPerPackage = unit.unitsPerUnit;
    }
  }
  if (resource === "purchases") {
    const presentation = await validRecord(db, "presentations", String(data.presentationId));
    const supplier = await validRecord(db, "suppliers", String(data.supplierId));
    if (presentation.active === false || supplier.active === false)
      throw new AdminApiError(400, "INACTIVE_REFERENCE", "El proveedor o la presentación está inactivo");
    data.materialId = presentation.materialId;
    data.unitsPerPackageSnapshot = presentation.unitsPerPackage;
    data.unitIdSnapshot = presentation.unitId ?? null;
    data.presentationNameSnapshot = presentation.name;
    // Store an immutable snapshot. The client submits only gross MXN and the tax treatment.
    const breakdown = inclusiveTaxBreakdown(Number(data.grossCents), data.vatTreatment as VatTreatment);
    data.amountCents = breakdown.netCents;
    data.taxCents = breakdown.taxCents;
  }
  if (resource === "products") {
    for (const line of data.baseMaterials as Array<{ materialId: string }>) {
      if (!(await catalog(db, "materials").doc(line.materialId).get()).exists)
        throw new AdminApiError(400, "MISSING_MATERIAL", "Un insumo del producto ya no existe");
    }
  }
}

async function payload(resource: Resource, input: unknown) {
  try { return validateInput(resource, input); }
  catch (error) {
    throw new AdminApiError(400, "INVALID_INPUT", error instanceof Error ? error.message : "Datos incorrectos");
  }
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    const { db } = await adminSession(request);
    const snapshot = await catalog(db, resource).limit(400).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as {id: string; createdAt?: string}));
    items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return NextResponse.json({ items }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    const { db, uid } = await adminSession(request);
    const data = await payload(resource, await request.json());
    await validateReferences(db, resource, data);
    const now = new Date().toISOString();
    const ref = catalog(db, resource).doc();
    const batch = db.batch();
    batch.set(ref, { ...data, createdAt: now, updatedAt: now, updatedBy: uid });
    batch.set(db.collection("admin_audit").doc(), { resource, target: ref.id, action: "create", actor: uid, at: now });
    await batch.commit();
    return NextResponse.json({ id: ref.id, ...data, createdAt: now }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    if (resource === "purchases") throw new AdminApiError(405, "IMMUTABLE_PURCHASE", "Las compras históricas no se editan");
    const { db, uid } = await adminSession(request);
    const body = await request.json();
    const id = documentId(body?.id);
    const data = await payload(resource, body?.data);
    const ref = catalog(db, resource).doc(id);
    if (!(await ref.get()).exists) throw new AdminApiError(404, "NOT_FOUND", "Registro no encontrado");
    await validateReferences(db, resource, data, id);
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(ref, { ...data, updatedAt: now, updatedBy: uid });
    batch.set(db.collection("admin_audit").doc(), { resource, target: id, action: "update", actor: uid, at: now });
    await batch.commit();
    return NextResponse.json({ id, ...data, updatedAt: now }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    if (resource === "purchases") throw new AdminApiError(405, "IMMUTABLE_PURCHASE", "Las compras no se borran: se conserva el historial");
    const { db, uid } = await adminSession(request);
    const id = documentId((await request.json())?.id);
    const ref = catalog(db, resource).doc(id);
    if (!(await ref.get()).exists) throw new AdminApiError(404, "NOT_FOUND", "Registro no encontrado");
    await assertNoReferences(db, resource, id);
    const batch = db.batch();
    batch.delete(ref);
    batch.set(db.collection("admin_audit").doc(), { resource, target: id, action: "delete", actor: uid, at: new Date().toISOString() });
    await batch.commit();
    return NextResponse.json({ deleted: true, id }, { headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
