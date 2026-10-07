"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const OFFICIAL_ROLES = ["librarian", "branch_admin", "super_admin"];

export function LoginCard({ official = false }: { official?: boolean }) {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const router = useRouter();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(identity, password);
      const isOfficial = user.roles.some((role) => OFFICIAL_ROLES.includes(role));
      if (official && !isOfficial) {
        logout();
        setError("This account does not have library-official access.");
        return;
      }
      router.push(official ? "/librarian" : "/catalog");
    } catch (err) {
      setError((err as Error).message || "The library record could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const title = official ? "Library official login" : "Member login";
  const note = official ? "For circulation, catalog, and collection staff." : "Use your library username or email to continue.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8E3D4] px-5 py-12">
      <div className="w-full max-w-[390px] border border-paper-line bg-paper-alt p-8">
          <h1 className="font-serif text-[28px] font-normal text-ink">{title}</h1>
          <p className="mt-2 text-[12px] leading-5 text-ink-muted">{note}</p>
          <div className="mt-7 grid grid-cols-2 border border-paper-line text-center text-[11px]">
            <Link href="/login" className={`px-3 py-2.5 ${!official ? "bg-[#35507A] text-paper" : "text-ink-muted hover:text-ink"}`}>Member</Link>
            <Link href="/login/official" className={`border-l border-paper-line px-3 py-2.5 ${official ? "bg-[#35507A] text-paper" : "text-ink-muted hover:text-ink"}`}>Library official</Link>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <div><label className="mb-1 block text-[10px] text-ink-muted">Username or email</label><input data-testid="login-email" className="underline-input" value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder="member@test.com" required autoComplete="username" /></div>
            <div><label className="mb-1 block text-[10px] text-ink-muted">Password</label><input data-testid="login-password" type="password" className="underline-input" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>
            {error && <p className="text-[11px] text-status-overdue-text">{error}</p>}
            <button type="submit" data-testid="login-submit" disabled={loading} className="stamp-button w-full disabled:opacity-50">{loading ? "Checking the register..." : "Sign in"}</button>
          </form>
          <p className="mt-4 text-center text-[11px] text-ink-muted"><Link href="/forgot-password" className="border-b border-[#35507A] text-[#35507A]">Forgot password?</Link></p>
          {official ? <p className="mt-3 text-center text-[11px] text-ink-muted">Need a member account? <Link href="/login" className="border-b border-[#35507A] text-[#35507A]">Member login</Link></p> : <p className="mt-3 text-center text-[11px] text-ink-muted">New here? <Link href="/register" className="border-b border-[#35507A] text-[#35507A]">Create a member account</Link></p>}
      </div>
    </div>
  );
}
