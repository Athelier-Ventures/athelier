import { NextResponse } from "next/server";
import { adminSession, apiError, AdminApiError, PRIVATE_HEADERS } from "@/lib/admin-server";
import { inputSchemas, isResource, validateInput } from "@/lib/admin-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ resource: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    const { db } = await adminSession(request);
    const snapshot = await db.collection("admin_" + resource).limit(400).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; createdAt?: string; [field: string]: unknown }));
    items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return NextResponse.json({ items }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    const { db, uid } = await adminSession(request);
    const parsed = await request.json();
    let data: Record<string, unknown>;
    try {
      data = validateInput(resource, parsed);
    } catch (error) {
      throw new AdminApiError(400, "INVALID_INPUT", error instanceof Error ? error.message : "Datos incorrectos");
    }
    if (resource === "presentations") {
      const material = await db.collection("admin_materials").doc(String(data.materialId)).get();
      if (!material.exists) throw new AdminApiError(400, "MISSING_MATERIAL", "Selecciona un insumo existente");
    }
    if (resource === "purchases") {
      const [presentation, supplier] = await Promise.all([
        db.collection("admin_presentations").doc(String(data.presentationId)).get(),
        db.collection("admin_suppliers").doc(String(data.supplierId)).get(),
      ]);
      if (!presentation.exists || !supplier.exists) throw new AdminApiError(400, "MISSING_REFERENCE", "Presentación o proveedor no encontrados");
      data.materialId = presentation.get("materialId");
      data.unitsPerPackageSnapshot = presentation.get("unitsPerPackage");
    }
    if (resource === "products") {
      for (const material of data.baseMaterials as Array<{materialId:string}>) {
        if (!(await db.collection("admin_materials").doc(material.materialId).get()).exists)
          throw new AdminApiError(400, "MISSING_MATERIAL", "Hay materiales que no existen");
      }
    }
    const now = new Date().toISOString();
    const ref = db.collection("admin_" + resource).doc();
    const audit = db.collection("admin_audit").doc();
    const batch = db.batch();
    batch.set(ref, { ...data, createdAt: now, updatedAt: now, updatedBy: uid });
    batch.set(audit, { resource, target: ref.id, action: "create", actor: uid, at: now });
    await batch.commit();
    return NextResponse.json({ id: ref.id, ...data, createdAt: now }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { resource } = await params;
    if (!isResource(resource)) throw new AdminApiError(404, "UNKNOWN_RESOURCE", "Catálogo desconocido");
    if (resource === "purchases") throw new AdminApiError(405, "IMMUTABLE_PURCHASE", "Las compras históricas son inmutables");
    const { db, uid } = await adminSession(request);
    const body = await request.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!/^[a-zA-Z0-9_-]{8,160}$/.test(id)) throw new AdminApiError(400, "INVALID_ID", "Identificador inválido");
    let data: Record<string, unknown>;
    try {
      data = validateInput(resource, body.data);
    } catch (error) {
      throw new AdminApiError(400, "INVALID_INPUT", error instanceof Error ? error.message : "Datos incorrectos");
    }
    const ref = db.collection("admin_" + resource).doc(id);
    if (!(await ref.get()).exists) throw new AdminApiError(404, "NOT_FOUND", "Registro no encontrado");
    if (resource === "presentations" && !(await db.collection("admin_materials").doc(String(data.materialId)).get()).exists)
      throw new AdminApiError(400, "MISSING_MATERIAL", "Insumo no encontrado");
    const now = new Date().toISOString();
    const batch = db.batch();
    batch.update(ref, { ...data, updatedAt: now, updatedBy: uid });
    batch.set(db.collection("admin_audit").doc(), { resource, target: id, action: "update", actor: uid, at: now });
    await batch.commit();
    return NextResponse.json({ id, ...data, updatedAt: now }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return apiError(error);
  }
}
