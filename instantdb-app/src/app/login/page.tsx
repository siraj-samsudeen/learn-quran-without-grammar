"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser, sendMagicCode, signInWithCode } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reason = searchParams.get("reason");

  useEffect(() => {
    if (user && !reason) router.replace("/");
  }, [user, reason, router]);

  if (user && !reason) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await sendMagicCode(email);
      setSent(true);
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Failed to send code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await signInWithCode(email, code);
      router.replace("/");
    } catch (x: unknown) {
      setErr(x instanceof Error ? x.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 px-6 font-sans">
      <h1 className="text-xl font-bold text-emerald-800 mb-1">Teacher Login</h1>
      <p className="text-xs text-gray-500 mb-6">
        Learn Qur&apos;an Without Grammar
      </p>

      {reason === "unauthorized" && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">
          <strong>Not authorized.</strong> Only registered teachers can access the picker.
        </div>
      )}

      {!sent ? (
        <form onSubmit={handleSend} className="space-y-3">
          <label htmlFor="login-email" className="block text-xs text-gray-600">Email</label>
          <input
            id="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send magic code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-sm text-gray-700">
            Enter the 6-digit code sent to {email}
          </p>
          <input
            inputMode="numeric"
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm tracking-widest text-center"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-700 text-white rounded py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Verifying..." : "Verify"}
          </button>
        </form>
      )}

      {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
    </div>
  );
}
