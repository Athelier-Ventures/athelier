import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminSession, apiError, AdminApiError, PRIVATE_HEADERS } from "@/lib/admin-server";
import { productImageBucket, verifyImage } from "@/lib/product-image-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { uid } = await adminSession(request);
    const form = await request.formData();
    const photo = form.get("image");
    if (!(photo instanceof File)) throw new AdminApiError(400, "IMAGE_REQUIRED", "Selecciona una fotografía.");
    if (photo.size === 0 || photo.size > 5*1024*1024) throw new AdminApiError(413, "IMAGE_TOO_LARGE", "La fotografía debe pesar entre 1 byte y 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) throw new AdminApiError(400,"IMAGE_FORMAT","Sólo se aceptan imágenes JPG, PNG y WebP.");
    const bytes = new Uint8Array(await photo.arrayBuffer());
    if (!verifyImage(bytes, photo.type)) throw new AdminApiError(400,"IMAGE_CONTENT","El contenido no corresponde a un formato de imagen permitido.");
    const id = randomUUID();
    const object = productImageBucket().file("catalog-products/" + id);
    await object.save(Buffer.from(bytes), {
      resumable: false,
      metadata: {
        contentType: photo.type,
        cacheControl: "private, no-store",
        metadata: { uploadedBy: uid }
      }
    });
    // Image is served publicly ONLY when a product with this URL is published.
    return NextResponse.json({ imageUrl: "/api/catalog/images/" + id }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) { return apiError(error); }
}
