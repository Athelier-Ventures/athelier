import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function firebaseAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new AdminApiError(503, "FIREBASE_NOT_CONFIGURED", "Faltan credenciales privadas de Firebase en el servidor");
  }
  return getApps().find(app => app.name === "athelier-admin")
    ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId }, "athelier-admin");
}

export async function adminSession(request: Request): Promise<{ uid: string; email: string; db: Firestore }> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new AdminApiError(401, "LOGIN_REQUIRED", "Inicia sesión con Google");
  const allowlist = (process.env.ATHELIER_ADMIN_EMAILS ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!allowlist.length) {
    throw new AdminApiError(503, "ADMINS_NOT_CONFIGURED", "No se han configurado las cuentas autorizadas en Vercel");
  }
  const app = firebaseAdminApp();
  let token: DecodedIdToken;
  try {
    token = await getAuth(app).verifyIdToken(header.slice(7), true);
  } catch {
    throw new AdminApiError(401, "INVALID_SESSION", "La sesión expiró o no es válida");
  }
  const email = token.email?.trim().toLowerCase() ?? "";
  if (token.email_verified !== true || !allowlist.includes(email)) {
    throw new AdminApiError(403, "ACCESS_DENIED", "La cuenta no tiene permisos administrativos");
  }
  return { uid: token.uid, email, db: getFirestore(app) };
}

export function publicDatabase(): Firestore {
  return getFirestore(firebaseAdminApp());
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof AdminApiError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  console.error("Athelier API error", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "No se pudo completar la operación" }, { status: 500 });
}

export const PRIVATE_HEADERS = { "Cache-Control": "no-store" };
