import { json } from "@/lib/server";
export const dynamic = "force-dynamic";
export function GET(req: Request) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY,
    projectId = process.env.FIREBASE_PROJECT_ID,
    appId = process.env.FIREBASE_WEB_APP_ID;
  if (!apiKey || !projectId || !appId)
    return json(
      { error: "Sign-in is being connected. Please try again shortly." },
      503,
    );
  const emulator =
    !process.env.VERCEL &&
    process.env.FIREBASE_AUTH_EMULATOR_HOST === "127.0.0.1:9099" &&
    ["localhost", "127.0.0.1"].includes(new URL(req.url).hostname);
  return json({
    ...(emulator ? { authEmulator: "http://127.0.0.1:9099" } : {}),
    apiKey,
    projectId,
    appId,
    authDomain:
      process.env.FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  });
}
