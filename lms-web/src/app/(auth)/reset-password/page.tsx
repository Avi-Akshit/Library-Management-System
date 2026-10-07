"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent) { event.preventDefault(); setError(""); try { await resetPassword(token, password); setMessage("Password updated. You can now sign in."); } catch (err) { setError((err as Error).message); } }
  return <main className="flex min-h-screen items-center justify-center bg-[#E8E3D4] px-5"><section className="w-full max-w-[390px] border border-paper-line bg-paper-alt p-8"><h1 className="font-serif text-[28px] text-ink">Set a new password</h1>{message ? <p className="mt-6 text-sm text-status-available-text">{message}</p> : <form onSubmit={submit} className="mt-7 space-y-5"><input type="password" className="underline-input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 12 characters" minLength={12} required autoComplete="new-password" />{error && <p className="text-sm text-status-overdue-text">{error}</p>}<button disabled={!token} className="stamp-button w-full disabled:opacity-50">Update password</button></form>}<p className="mt-6 text-center text-[11px] text-ink-muted"><Link className="border-b border-[#35507A] text-[#35507A]" href="/login">Back to sign in</Link></p></section></main>;
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#E8E3D4]" />}><ResetPasswordForm /></Suspense>;
}
