"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail, LockKeyhole, Check, ArrowLeft } from "lucide-react";
import { clientAuth, accountError } from "@/lib/firebase-client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import type { Profile } from "@/lib/domain";
export default function AccountForm({
  onDone,
  changePassword = false,
}: {
  onDone: (profile: Profile) => void;
  changePassword?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(
    changePassword ? "forgot" : "login",
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [email, setEmail] = useState("");
  const [sent, setSent] = useState(false),
    [verification, setVerification] = useState<{
      user: User;
      alias: string;
    } | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    clientAuth()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        if (active) setError(accountError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (changePassword)
      fetch("/api/profile")
        .then((r) => r.json() as Promise<{ email?: string }>)
        .then((p) => setEmail(p.email ?? ""))
        .catch(() => {});
  }, [changePassword]);
  async function finish(user: User, alias?: string) {
    const idToken = await user.getIdToken(true);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "session",
        idToken,
        ...(alias ? { alias, adult: true } : {}),
      }),
    });
    const data = (await res.json()) as { error?: string; profile: Profile };
    if (!res.ok)
      throw new Error(data.error || "Sign-in couldn't be completed.");
    await signOut(await clientAuth());
    onDone(data.profile);
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const auth = await clientAuth(),
        provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      await finish(result.user);
    } catch (e) {
      // Codes only: never log identity tokens, credentials, or account details.
      console.warn("Crossed Google sign-in:", (e as { code?: string }).code ?? "session-error");
      setError(accountError(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const auth = await clientAuth(),
        address = email.trim();
      if (mode === "forgot") {
        try {
          await sendPasswordResetEmail(auth, address, {
            url: window.location.origin,
          });
        } catch (e) {
          if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
        }
        setSent(true);
        return;
      }
      const password = String(f.get("password") ?? "");
      if (mode === "register") {
        const alias = String(f.get("alias") ?? "").trim();
        if (f.get("adult") !== "on")
          throw new Error("Crossed is for adults 18 and older.");
        const { user } = await createUserWithEmailAndPassword(
          auth,
          address,
          password,
        );
        await updateProfile(user, { displayName: alias });
        setVerification({ user, alias });
        await sendEmailVerification(user, { url: window.location.origin });
      } else {
        const { user } = await signInWithEmailAndPassword(
          auth,
          address,
          password,
        );
        if (!user.emailVerified) {
          setVerification({ user, alias: "" });
          return;
        }
        await finish(user);
      }
    } catch (e) {
      setError(accountError(e));
    } finally {
      setBusy(false);
    }
  }
  const switchMode = (next: typeof mode) => {
    setMode(next);
    setError("");
    setSent(false);
    setVerification(null);
  };
  if (verification)
    return (
      <div className="modal-body auth-body">
        <div className="auth-symbol">
          <Mail size={24} />
        </div>
        <h2>Check your email.</h2>
        <p>
          Open the verification email sent to <strong>{email}</strong>. Once
          you’ve confirmed your address, come back here to continue.
        </p>
        <p className="fine-print">
          If it hasn’t arrived, check spam or request a new email below.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await verification.user.reload();
              if (!verification.user.emailVerified)
                throw new Error(
                  "Open the link in your email first, then try again.",
                );
              await finish(verification.user, verification.alias);
            } catch (e) {
              setError(accountError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Checking…" : "I verified my email"}
          <Check size={17} />
        </button>
        <button
          className="text-button full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await sendEmailVerification(verification.user, {
                url: window.location.origin,
              });
              setError("A new verification email has been sent.");
            } catch (e) {
              setError(accountError(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Resend verification email
        </button>
        <button
          className="text-button full"
          onClick={() => switchMode("login")}
        >
          Back to sign in
        </button>
      </div>
    );
  if (sent)
    return (
      <div className="modal-body auth-body">
        <div className="auth-symbol">
          <Mail size={24} />
        </div>
        <h2>Check your inbox.</h2>
        <p>
          If an account uses <strong>{email}</strong>, you’ll receive a link to
          choose a new password. Check your spam folder too.
        </p>
        <p className="fine-print">
          Signed up with Google? You can use the Google button to sign in.
        </p>
        <button className="primary full" onClick={() => switchMode("login")}>
          Back to sign in
          <ArrowRight size={17} />
        </button>
      </div>
    );
  return (
    <form onSubmit={submit} className="account-form">
      <div className="modal-body auth-body">
        <div className="auth-symbol">
          {mode === "forgot" ? <Mail size={24} /> : <LockKeyhole size={23} />}
        </div>
        <h2>
          {mode === "register"
            ? "Create your account."
            : mode === "login"
              ? "Welcome back."
              : "Forgot your password?"}
        </h2>
        <p>
          {mode === "register"
            ? "Your email stays private. Others only see your display name."
            : mode === "login"
              ? "Your saved moments and conversations are waiting."
              : "Enter your email and we’ll send you a password reset link."}
        </p>
        {mode !== "forgot" && (
          <>
            <div className="auth-tabs" aria-label="Account options">
              <button
                type="button"
                aria-pressed={mode === "login"}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === "register"}
                onClick={() => switchMode("register")}
              >
                Create account
              </button>
            </div>
            <button
              className="google-signin secondary full"
              type="button"
              onClick={google}
              disabled={busy || !ready}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="#4285F4"
                  d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z"
                />
                <path
                  fill="#34A853"
                  d="M12 22c2.7 0 4.96-.9 6.61-2.42l-3.24-2.51c-.9.6-2.04.96-3.37.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.41 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.35-2.59Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.97c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.35 2.59A5.99 5.99 0 0 1 12 5.97Z"
                />
              </svg>
              Continue with Google
            </button>
            <div className="auth-divider">
              <span>or with email</span>
            </div>
          </>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
          />
        </label>
        {mode === "register" && (
          <label>
            Display name
            <input
              name="alias"
              required
              minLength={2}
              maxLength={28}
              autoComplete="nickname"
              placeholder="A first name or nickname"
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={mode === "register" ? 12 : 1}
                maxLength={128}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  mode === "register"
                    ? "At least 12 characters"
                    : "Your password"
                }
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        )}
        {mode === "register" && (
          <label className="checkbox-label">
            <input type="checkbox" name="adult" required />I am 18 or older and
            will respect others’ privacy.
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy || !ready}>
          {busy
            ? "One moment…"
            : mode === "register"
              ? "Create account"
              : mode === "login"
                ? "Sign in"
                : "Send reset link"}
          <ArrowRight size={17} />
        </button>
        {mode === "login" && (
          <button
            className="text-button full"
            type="button"
            onClick={() => switchMode("forgot")}
          >
            Forgot your password?
          </button>
        )}
        {mode === "forgot" && (
          <button
            className="text-button full"
            type="button"
            onClick={() => switchMode("login")}
          >
            <ArrowLeft size={15} />
            Back to sign in
          </button>
        )}
      </div>
    </form>
  );
}
