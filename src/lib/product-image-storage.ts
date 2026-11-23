import "server-only";
import { getApps } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { publicDatabase, AdminApiError } from "@/lib/admin-server";

/** Reuses the existing authenticated Firebase Admin app. Images are never made public in Storage. */
export function productImageBucket() {
  // Fail closed until Firebase rules and service credentials have been verified.
  publicDatabase();
  const app = getApps().find(item => item.name === "athelier-admin");
  const name = process.env.FIREBASE_STORAGE_BUCKET;
  if (!app || !name) {
    throw new AdminApiError(503, "STORAGE_NOT_CONFIGURED", "Configure FIREBASE_STORAGE_BUCKET for the project before uploading images.");
  }
  return getStorage(app).bucket(name);
}

export function verifyImage(bytes: Uint8Array, contentType: string) {
  const jpg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const webp = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  return (contentType === "image/jpeg" && jpg) || (contentType === "image/png" && png) || (contentType === "image/webp" && webp);
}
