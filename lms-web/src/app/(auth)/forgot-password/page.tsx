"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try { await requestPasswordReset(identity); setSent(true); } catch (err) { setError((err as Error).message); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-[#E8E3D4] px-5"><section className="w-full max-w-[390px] border border-paper-line bg-paper-alt p-8"><h1 className="font-serif text-[28px] text-ink">Recover your card</h1><p className="mt-2 text-[12px] text-ink-muted">Enter the email address or username on your library card.</p>{sent ? <p className="mt-6 text-sm text-status-available-text">If a matching account exists, recovery instructions have been sent.</p> : <form onSubmit={submit} className="mt-7 space-y-5"><input className="underline-input" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="you@library.edu" required autoComplete="username" />{error && <p className="text-sm text-status-overdue-text">{error}</p>}<button className="stamp-button w-full">Send recovery instructions</button></form>}<p className="mt-6 text-center text-[11px] text-ink-muted"><Link className="border-b border-[#35507A] text-[#35507A]" href="/login">Back to sign in</Link></p></section></main>;
}
