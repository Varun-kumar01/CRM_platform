
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companySlug: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      localStorage.setItem("crm_token", data.token);
      localStorage.setItem("crm_user", JSON.stringify(data.user));
      localStorage.setItem("crm_company", JSON.stringify(data.company));

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
      <form onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-3">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">FlowCRM</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="mt-2 text-slate-400">
            Sign in to your company workspace.
          </p>
        </div>

        <div>
          <label htmlFor="companySlug" className="text-sm text-slate-300">
            Company workspace ID
          </label>
          <input id="companySlug" required value={form.companySlug}
            onChange={(e) => setForm({ ...form, companySlug: e.target.value })}
            placeholder="acme-technologies-a1b2c3d4"
            className={inputClass} />
        </div>

        <div>
          <label htmlFor="email" className="text-sm text-slate-300">
            Email address
          </label>
          <input id="email" type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com" className={inputClass} />
        </div>

        <div>
          <label htmlFor="password" className="text-sm text-slate-300">
            Password
          </label>
          <input id="password" type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Your password" className={inputClass} />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="text-center text-sm text-slate-400">
          New company?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
            Create a workspace
          </Link>
        </p>
      </form>
    </main>
  );
}
