"use client";
import { getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  connectAuthEmulator,
  initializeAuth,
  inMemoryPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
let initialized: Promise<ReturnType<typeof initializeAuth>> | undefined;
export function clientAuth() {
  if (!initialized)
    initialized = (async () => {
      const res = await fetch("/api/auth/config"),
        config = (await res.json()) as FirebaseOptions & {
          error?: string;
          authEmulator?: string;
        };
      if (!res.ok) throw new Error(config.error || "Sign-in is unavailable.");
      const app = getApps()[0] ?? initializeApp(config);
      const auth = initializeAuth(app, {
        persistence: inMemoryPersistence,
        popupRedirectResolver: browserPopupRedirectResolver,
      });
      if (
        config.authEmulator &&
        ["127.0.0.1", "localhost"].includes(window.location.hostname)
      )
        connectAuthEmulator(auth, config.authEmulator, {
          disableWarnings: true,
        });
      return auth;
    })().catch((e) => {
      initialized = undefined;
      throw e;
    });
  return initialized;
}
export function accountError(e: unknown) {
  const code = (e as { code?: string }).code;
  const errors: Record<string, string> = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/user-not-found": "Email or password is incorrect.",
    "auth/email-already-in-use":
      "Try signing in with this email, or use Forgot password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password":
      "Use a stronger password with at least 12 characters.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/popup-closed-by-user": "Sign-in was closed. You can try again.",
    "auth/cancelled-popup-request": "Another sign-in is open.",
    "auth/popup-blocked": "Allow the sign-in popup, then try Google again.",
    "auth/network-request-failed": "Check your connection and try again.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code":
      "This link has already been used or is invalid.",
    "auth/requires-recent-login":
      "Sign out and sign in again before changing your password.",
    "auth/operation-not-allowed": "This sign-in option is not available yet.",
    "auth/unauthorized-domain":
      "Sign-in is not configured for this address yet.",
  };
  return code
    ? (errors[code] ?? "Sign-in couldn't be completed. Please try again.")
    : e instanceof Error
      ? e.message
      : "Please try again.";
}
