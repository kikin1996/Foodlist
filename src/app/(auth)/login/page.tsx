"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { errorBox, field, label, primaryButton, successBox, textLink } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Nesprávný email nebo heslo");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-2xl font-extrabold text-brand-600">
          Kostki
        </Link>
        <h1 className="mt-10 text-3xl font-extrabold">Přihlášení</h1>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {registered && <div className={successBox}>Účet je vytvořený. Teď se přihlaste.</div>}
          {error && <div className={errorBox}>{error}</div>}

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
            />
          </div>

          <button type="submit" disabled={loading} className={`${primaryButton} w-full`}>
            {loading ? "Přihlašuji…" : "Přihlásit se"}
          </button>

          <p className="text-sm text-gray-600">
            Nemáte účet?{" "}
            <Link href="/register" className={textLink}>
              Vytvořit účet
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
