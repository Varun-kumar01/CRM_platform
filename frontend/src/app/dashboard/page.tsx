
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Target, TrendingUp, IndianRupee,
  Settings, LogOut, Bell, Plus, ArrowUpRight, RefreshCw,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

type User = { name: string; email: string; role: string };
type Company = { name: string; slug: string };

type Lead = {
  id: number;
  name: string;
  email: string | null;
  companyName: string | null;
  status: string;
  estimatedValue: number | string;
  createdAt: string;
};

type Summary = {
  metrics: {
    totalLeads: number;
    customers: number;
    qualifiedLeads: number;
    conversionRate: number;
    revenue: number;
  };
  pipeline: { status: string; count: number }[];
  recentLeads: Lead[];
};

const stages = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const statusColors: Record<string, string> = {
  New: "bg-blue-500/15 text-blue-300",
  Contacted: "bg-cyan-500/15 text-cyan-300",
  Qualified: "bg-violet-500/15 text-violet-300",
  Proposal: "bg-amber-500/15 text-amber-300",
  Won: "bg-emerald-500/15 text-emerald-300",
  Lost: "bg-red-500/15 text-red-300",
};

export default function DashboardPage() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/dashboard/summary");
      setSummary(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load dashboard";
      setError(message);
      if (
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("authentication")
      ) {
        localStorage.removeItem("crm_token");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("crm_token");
    const savedCompany = localStorage.getItem("crm_company");
    const savedUser = localStorage.getItem("crm_user");

    if (!token || !savedCompany || !savedUser) {
      router.replace("/login");
      return;
    }

    try {
      setCompany(JSON.parse(savedCompany));
      setUser(JSON.parse(savedUser));
      void loadDashboard();
    } catch {
      router.replace("/login");
    }
  }, [router, loadDashboard]);

  function logout() {
    localStorage.removeItem("crm_token");
    localStorage.removeItem("crm_user");
    localStorage.removeItem("crm_company");
    router.replace("/login");
  }

  if (!company || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading workspace...
      </main>
    );
  }

  const metrics = summary?.metrics;

  const cards = [
    {
      label: "Total Leads",
      value: metrics?.totalLeads ?? 0,
      icon: Target,
      color: "text-blue-400 bg-blue-400/10",
      href: "/leads",
    },
    {
      label: "Customers",
      value: metrics?.customers ?? 0,
      icon: Users,
      color: "text-emerald-400 bg-emerald-400/10",
      href: "/customers",
    },
    {
      label: "Conversion Rate",
      value: `${metrics?.conversionRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-violet-400 bg-violet-400/10",
      href: "/leads",
    },
    {
      label: "Won Revenue",
      value: money(metrics?.revenue ?? 0),
      icon: IndianRupee,
      color: "text-amber-400 bg-amber-400/10",
      href: "/leads",
    },
  ];

  const pipelineCounts = Object.fromEntries(
    (summary?.pipeline ?? []).map((item) => [item.status, item.count])
  ) as Record<string, number>;

  const maxStageCount = Math.max(
    1,
    ...stages.map((stage) => pipelineCounts[stage] ?? 0)
  );

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/70 p-5 lg:flex">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="rounded-xl bg-indigo-600 p-2">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">FlowCRM</span>
        </div>

        <p className="mb-3 mt-9 px-3 text-xs uppercase tracking-widest text-slate-500">
          Workspace
        </p>
        <div className="flex items-center gap-3 rounded-xl bg-indigo-600/15 p-3 text-indigo-300">
          <LayoutDashboard className="h-5 w-5" /> Dashboard
        </div>

        <p className="mb-3 mt-7 px-3 text-xs uppercase tracking-widest text-slate-500">
          Sales
        </p>
        <Link href="/leads" className="flex items-center gap-3 rounded-xl p-3 text-slate-300 hover:bg-slate-800">
          <Target className="h-5 w-5" /> Leads
        </Link>
        <Link href="/customers" className="flex items-center gap-3 rounded-xl p-3 text-slate-300 hover:bg-slate-800">
          <Users className="h-5 w-5" /> Customers
        </Link>

        <div className="mt-auto space-y-2 border-t border-slate-800 pt-4">
          <button className="flex w-full items-center gap-3 p-3 text-slate-400">
            <Settings className="h-5 w-5" /> Settings
          </button>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl p-3 text-red-300 hover:bg-red-500/10">
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm text-slate-400">Company workspace</p>
            <h1 className="mt-1 text-2xl font-bold">{company.name}</h1>
            <p className="mt-1 text-xs text-slate-500">{company.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void loadDashboard()} title="Refresh dashboard" className="rounded-xl border border-slate-800 p-3 text-slate-400 hover:text-white">
              <RefreshCw className="h-5 w-5" />
            </button>
            <Bell className="hidden h-5 w-5 text-slate-400 sm:block" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-slate-400">{user.role.replaceAll("_", " ")}</p>
            </div>
            <button onClick={logout} title="Sign out" className="rounded-xl p-2 text-slate-400 hover:text-white">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="space-y-8 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
                Overview
              </p>
              <h2 className="mt-2 text-3xl font-bold">Your sales at a glance</h2>
              <p className="mt-2 text-slate-400">
                Track your leads, customers and sales performance.
              </p>
            </div>
            <Link href="/leads" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-500">
              <Plus className="h-5 w-5" /> Add a lead
            </Link>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-900 bg-red-950/50 p-4 text-sm text-red-300">
              {error}{" "}
              <button onClick={() => void loadDashboard()} className="ml-2 underline">
                Retry
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <Link key={card.label} href={card.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{card.label}</span>
                  <div className={`rounded-xl p-3 ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-5 break-words text-3xl font-bold">
                  {loading ? "…" : card.value}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {card.label === "Customers"
                    ? "Won leads currently"
                    : card.label === "Won Revenue"
                      ? "Value of won leads"
                      : card.label === "Conversion Rate"
                        ? "Won leads ÷ all leads"
                        : "Company-wide total"}
                </p>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 xl:col-span-2">
              <h3 className="text-lg font-bold">Sales pipeline</h3>
              <p className="mt-1 text-sm text-slate-400">
                Number of leads at each stage
              </p>

              {loading ? (
                <p className="py-10 text-slate-400">Loading pipeline...</p>
              ) : (
                <div className="mt-7 space-y-5">
                  {stages.map((stage) => {
                    const count = pipelineCounts[stage] ?? 0;
                    return (
                      <div key={stage}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-slate-300">{stage}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-indigo-500 transition-all"
                            style={{ width: `${(count / maxStageCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-lg font-bold">Quick actions</h3>
              <p className="mt-1 text-sm text-slate-400">
                Keep your sales moving
              </p>
              <Link href="/leads" className="mt-5 flex items-center gap-3 rounded-xl border border-slate-800 p-4 hover:border-indigo-500">
                <Target className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-medium">Manage leads</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-slate-500" />
              </Link>
              <Link href="/customers" className="mt-3 flex items-center gap-3 rounded-xl border border-slate-800 p-4 hover:border-indigo-500">
                <Users className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-medium">View customers</span>
                <ArrowUpRight className="ml-auto h-4 w-4 text-slate-500" />
              </Link>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5">
              <div>
                <h3 className="text-lg font-bold">Recent leads</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Latest prospects added to your workspace
                </p>
              </div>
              <Link href="/leads" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                View all leads →
              </Link>
            </div>

            {loading ? (
              <p className="p-8 text-slate-400">Loading recent leads...</p>
            ) : !summary?.recentLeads?.length ? (
              <div className="p-10 text-center">
                <Target className="mx-auto h-9 w-9 text-slate-600" />
                <p className="mt-3 font-semibold">No leads yet</p>
                <p className="mt-2 text-sm text-slate-400">
                  Add a lead to see your CRM activity here.
                </p>
                <Link href="/leads" className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold">
                  Create a lead
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Lead</th>
                      <th className="px-5 py-4">Company</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {summary.recentLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-800/30">
                        <td className="px-5 py-4">
                          <p className="font-semibold">{lead.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{lead.email || "No email"}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-300">{lead.companyName || "—"}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[lead.status] || "bg-slate-800 text-slate-300"}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">{money(Number(lead.estimatedValue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
    