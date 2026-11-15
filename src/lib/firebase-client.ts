"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

export function browserAuth(): Auth {
  if (typeof window === "undefined") throw new Error("Firebase Auth sólo está disponible en el navegador");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error("Falta configurar Firebase Web en Vercel (NEXT_PUBLIC_FIREBASE_*)");
  }
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp({ apiKey, authDomain, projectId, appId });
  return getAuth(app);
}

export function googleProvider(): GoogleAuthProvider {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}
