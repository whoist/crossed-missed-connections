import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function firebaseApp() {
  if (
    process.env.VERCEL &&
    (process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST)
  )
    throw new Error("Emulators are forbidden in production hosting");
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase is not configured");
  // Emulator credentials can never be enabled by a request parameter.
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" &&
    !process.env.VERCEL
  )
    return initializeApp({ projectId });
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("Firebase server credentials are not configured");
  return initializeApp({ projectId, credential: cert(JSON.parse(raw)) });
}
export const adminAuth = () => getAuth(firebaseApp());
export const db = () => getFirestore(firebaseApp());
