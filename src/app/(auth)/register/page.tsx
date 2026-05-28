"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Hesla se neshodují");
      return;
    }
    if (form.password.length < 8) {
      setError("Heslo musí mít alespoň 8 znaků");
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
      if (!res.ok) throw new Error(data.error || "Registrace selhala");
      router.push("/login?registered=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">F</span>
            </div>
            <span className="font-bold text-gray-900 text-xl">FoodList</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Vytvořit účet</h1>
          <p className="text-gray-500 mt-1">Začněte jíst zdravě bez starostí</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jméno</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              placeholder="Jan Novák"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heslo</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              placeholder="min. 8 znaků"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Potvrdit heslo</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              placeholder="znovu heslo"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Registrace..." : "Vytvořit účet"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Máte účet?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Přihlásit se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
