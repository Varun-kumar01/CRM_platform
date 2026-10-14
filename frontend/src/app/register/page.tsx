
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Building2, ArrowRight, LoaderCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: "",
    name: "",
    email: "",
    password: "",
    industry: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [companySlug, setCompanySlug] = useState("");

  function update(
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });

      localStorage.setItem("crm_token", data.token);
      localStorage.setItem("crm_user", JSON.stringify(data.user));
      localStorage.setItem("crm_company", JSON.stringify(data.company));

      // Show the generated slug so the company can use it for login.
      setCompanySlug(data.company.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (companySlug) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <Building2 className="mb-5 h-10 w-10 text-indigo-400" />
          <h1 className="text-2xl font-bold">Workspace created!</h1>
          <p className="mt-3 text-slate-400">
            Save your company workspace ID. You will use it to log in.
          </p>
          <div className="my-5 break-all rounded-lg bg-slate-800 p-4 font-mono">
            {companySlug}
          </div>
          <button
            onClick={() => {
              window.location.href = "/dashboard";
            }}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold hover:bg-indigo-500"
          >
            Open your dashboard
          </button>
        </div>
      </main>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-indigo-500";

  return (
    <main className="grid min-h-screen bg-slate-950 text-white md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-indigo-600 p-12 md:flex">
        <div className="flex items-center gap-3 text-xl font-bold">
          <Building2 /> FlowCRM
        </div>
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
            Your business. One workspace.
          </p>
          <h1 className="max-w-lg text-5xl font-bold leading-tight">
            Turn every lead into an opportunity.
          </h1>
          <p className="mt-5 max-w-md text-indigo-100">
            Organize your sales pipeline, build stronger customer
            relationships and track your growth in one place.
          </p>
        </div>
        <p className="text-sm text-indigo-200">
          FlowCRM · Business management made simple
        </p>
      </section>

      <section className="flex items-center justify-center p-6 py-12 sm:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-2 text-lg font-bold md:hidden">
              <Building2 className="text-indigo-400" /> FlowCRM
            </div>
            <h2 className="text-3xl font-bold">Create your workspace</h2>
            <p className="mt-2 text-slate-400">
              Register your company to get started.
            </p>
          </div>

          <div>
            <label htmlFor="companyName" className="text-sm text-slate-300">
              Company name
            </label>
            <input id="companyName" name="companyName" required minLength={2}
              maxLength={150} value={form.companyName} onChange={update}
              placeholder="Acme Technologies" className={inputClass} />
          </div>

          <div>
            <label htmlFor="name" className="text-sm text-slate-300">
              Your full name
            </label>
            <input id="name" name="name" required minLength={2}
              maxLength={150} value={form.name} onChange={update}
              placeholder="Admin name" className={inputClass} />
          </div>

          <div>
            <label htmlFor="email" className="text-sm text-slate-300">
              Work email
            </label>
            <input id="email" name="email" type="email" required
              maxLength={255} value={form.email} onChange={update}
              placeholder="you@company.com" className={inputClass} />
          </div>

          <div>
            <label htmlFor="password" className="text-sm text-slate-300">
              Password
            </label>
            <input id="password" name="password" type="password"
              required minLength={8} maxLength={72} value={form.password}
              onChange={update} placeholder="At least 8 characters"
              className={inputClass} />
          </div>

          <div>
            <label htmlFor="industry" className="text-sm text-slate-300">
              Industry
            </label>
            <select id="industry" name="industry" value={form.industry}
              onChange={update} className={inputClass}>
              <option value="">Select industry</option>
              <option value="Technology">Technology</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Retail">Retail</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="text-sm text-slate-300">
              Phone (optional)
            </label>
            <input id="phone" name="phone" type="tel" maxLength={30}
              value={form.phone} onChange={update}
              placeholder="Company contact number" className={inputClass} />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button disabled={loading} type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold transition hover:bg-indigo-500 disabled:opacity-60">
            {loading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
            {loading ? "Creating workspace..." : "Create company workspace"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Sign in
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
