"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { register as apiRegister } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthStacksPanel } from "@/components/auth-stacks-panel";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRegister(name, email, password, username || undefined);
      await login(email, password);
      router.push("/member");
    } catch (err: unknown) {
      setError((err as Error).message || "The register could not issue a card. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#E8E3D4]">
      <AuthStacksPanel />

      <div className="flex flex-1 items-center justify-center bg-[repeating-linear-gradient(to_bottom,#E8E3D4,#E8E3D4_39px,#DCD6C4_40px)] px-5 py-16 sm:px-12">
        <div className="ruled-paper relative w-full max-w-[400px] border border-paper-line px-9 pb-9 pt-13 shadow-[0_6px_18px_rgba(28,27,25,0.12)]">
          <span className="absolute -top-4 right-8 bg-brass px-4 py-1.5 font-sans text-[10px] text-[#2B2116]">NEW CARD</span>
          <span className="absolute left-5 top-5 h-3 w-3 rounded-full bg-[#E8E3D4] shadow-inner" />
          <h1 className="font-serif text-[28px] font-normal text-ink">Card Catalog</h1>
          <p className="mb-8 border-b border-paper-line pb-3 font-sans text-[11px] text-ink-muted">request a borrowing card from the main branch</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-1.5 block font-sans text-[12px] text-ink-muted">
                Full name
              </label>
              <input
                type="text"
                className="underline-input"
                placeholder="As it should appear on the card"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-[12px] text-ink-muted">Username</label>
              <input type="text" className="underline-input" placeholder="letters, numbers, . _ or -" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-[12px] text-ink-muted">
                Email on file
              </label>
              <input
                type="email"
                className="underline-input"
                placeholder="you@library.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block font-sans text-[12px] text-ink-muted">
                Passphrase
              </label>
              <input
                type="password"
                className="underline-input"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="font-sans text-[13px] text-status-overdue-text">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="stamp-button w-full disabled:opacity-50"
            >
              {loading ? "Issuing your card…" : "Register"}
            </button>
          </form>

          <p className="mt-5 text-center font-sans text-[11px] text-ink-muted">
            Already hold a card?{" "}
            <Link href="/login" className="border-b border-brass-deep text-brass-deep">
              Present it here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
