"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { errorBox, field, label, primaryButton, textLink } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Hesla se neshodují.");
      return;
    }
    if (form.password.length < 8) {
      setError("Heslo musí mít alespoň 8 znaků.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Účet se nepodařilo vytvořit.");
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo. Zkuste to znovu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-2xl font-extrabold text-brand-600">
          Kostki
        </Link>
        <h1 className="mt-10 text-3xl font-extrabold">Vytvořit účet</h1>
        <p className="mt-2 text-gray-600">Trvá to minutu. Účet na Rohlík.cz nepotřebujete.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {error && <div className={errorBox}>{error}</div>}

          <div>
            <label className={label}>Jméno</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={field}
              placeholder="Jan Novák"
            />
          </div>

          <div>
            <label className={label}>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={field}
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label className={label}>Heslo</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={field}
              placeholder="alespoň 8 znaků"
            />
          </div>

          <div>
            <label className={label}>Heslo znovu</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className={field}
            />
          </div>

          <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
            {loading ? "Vytvářím účet…" : "Vytvořit účet"}
          </button>

          <p className="text-sm text-gray-600">
            Už účet máte?{" "}
            <Link href="/login" className={textLink}>
              Přihlásit se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
