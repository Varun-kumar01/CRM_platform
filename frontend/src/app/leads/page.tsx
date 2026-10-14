
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Search, Users, Target, IndianRupee,
  Pencil, Trash2, X, RefreshCw, LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Lead = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  source: string | null;
  status: string;
  estimatedValue: string | number;
  notes: string | null;
  assignedTo: number | null;
  createdAt: string;
};

const STATUSES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  companyName: "",
  source: "Website",
  status: "New",
  estimatedValue: "0",
  notes: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500";

export default function LeadsPage() {
  const router = useRouter();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filterStatus) params.set("status", filterStatus);

      const query = params.toString();
      const data = await apiRequest(`/leads${query ? `?${query}` : ""}`);
      setLeads(data.leads ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not load leads";

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
  }, [search, filterStatus, router]);

  useEffect(() => {
    if (!localStorage.getItem("crm_token")) {
      router.replace("/login");
      return;
    }

    void loadLeads();
  }, [loadLeads, router]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(lead: Lead) {
    setEditingId(lead.id);
    setForm({
      name: lead.name,
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      companyName: lead.companyName ?? "",
      source: lead.source ?? "Other",
      status: lead.status,
      estimatedValue: String(lead.estimatedValue ?? 0),
      notes: lead.notes ?? "",
    });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        ...form,
        estimatedValue: Number(form.estimatedValue),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        companyName: form.companyName.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingId !== null) {
        await apiRequest(`/leads/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setNotice("Lead updated successfully.");
      } else {
        await apiRequest("/leads", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setNotice("Lead created successfully.");
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save lead");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLead(lead: Lead) {
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await apiRequest(`/leads/${lead.id}`, { method: "DELETE" });
      setNotice("Lead deleted successfully.");
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete lead");
    }
  }

  async function changeStatus(lead: Lead, status: string) {
    setError("");
    setNotice("");

    try {
      await apiRequest(`/leads/${lead.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      setNotice(`Lead status changed to ${status}.`);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status");
    }
  }

  const money = (amount: string | number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

  const counts = {
    total: leads.length,
    qualified: leads.filter((lead) =>
      ["Qualified", "Proposal"].includes(lead.status)
    ).length,
    won: leads.filter((lead) => lead.status === "Won").length,
    value: leads.reduce(
      (sum, lead) => sum + (Number(lead.estimatedValue) || 0),
      0
    ),
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/70 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <h1 className="text-2xl font-bold sm:text-3xl">Lead Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage prospects and track every sales opportunity.
            </p>
          </div>

          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold hover:bg-indigo-500"
          >
            <Plus className="h-5 w-5" /> Add lead
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-[1600px] space-y-6 p-5 sm:p-8">
        {notice && (
          <div role="status" className="rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-300">
            {notice}
          </div>
        )}

        {error && !modalOpen && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
            <span>{error}</span>
            <button onClick={() => void loadLeads()} className="underline">
              Retry
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Matching leads", value: counts.total, icon: Target },
            { label: "Qualified / proposal", value: counts.qualified, icon: Users },
            { label: "Won leads", value: counts.won, icon: Users },
            { label: "Estimated pipeline", value: money(counts.value), icon: IndianRupee },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{item.label}</span>
                <item.icon className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="mt-4 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                aria-label="Search leads"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email or company..."
                className={`${inputClass} pl-10`}
              />
            </div>

            <select
              aria-label="Filter by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`${inputClass} sm:w-48`}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>

            <button
              onClick={() => void loadLeads()}
              aria-label="Refresh leads"
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-16 text-slate-400">
              <LoaderCircle className="h-5 w-5 animate-spin" /> Loading leads...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Target className="mx-auto h-10 w-10 text-slate-600" />
              <h2 className="mt-4 text-lg font-semibold">No leads found</h2>
              <p className="mt-2 text-sm text-slate-400">
                Add your first lead or change your search filters.
              </p>
              <button onClick={openCreate} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold hover:bg-indigo-500">
                <Plus className="mr-2 inline h-4 w-4" /> Add your first lead
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-800/60 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Lead</th>
                    <th className="px-5 py-4">Company</th>
                    <th className="px-5 py-4">Source</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Est. value</th>
                    <th className="px-5 py-4">Created</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{lead.name}</p>
                        <p className="mt-1 text-xs text-slate-400">{lead.email || lead.phone || "No contact details"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-300">{lead.companyName || "—"}</td>
                      <td className="px-5 py-4 text-slate-300">{lead.source || "Other"}</td>
                      <td className="px-5 py-4">
                        <select
                          aria-label={`Status for ${lead.name}`}
                          value={lead.status}
                          onChange={(e) => void changeStatus(lead, e.target.value)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs"
                        >
                          {STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-4 font-medium">{money(lead.estimatedValue)}</td>
                      <td className="px-5 py-4 text-slate-400">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(lead)} title="Edit lead" className="rounded-lg border border-slate-700 p-2 hover:border-indigo-500 hover:text-indigo-300">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => void deleteLead(lead)} title="Delete lead" className="rounded-lg border border-slate-700 p-2 hover:border-red-500 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} returned by the API
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <h2 className="text-xl font-bold">{editingId !== null ? "Edit lead" : "Create a lead"}</h2>
                <p className="mt-1 text-sm text-slate-400">Enter the prospect's details below.</p>
              </div>
              <button onClick={() => setModalOpen(false)} aria-label="Close form" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Lead name *
                  <input required minLength={2} maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-2`} placeholder="Rahul Sharma" />
                </label>
                <label className="text-sm text-slate-300">
                  Email
                  <input type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} mt-2`} placeholder="rahul@example.com" />
                </label>
                <label className="text-sm text-slate-300">
                  Phone
                  <input type="tel" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={`${inputClass} mt-2`} placeholder="Phone number" />
                </label>
                <label className="text-sm text-slate-300">
                  Company
                  <input maxLength={150} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className={`${inputClass} mt-2`} placeholder="Prospect's company" />
                </label>
                <label className="text-sm text-slate-300">
                  Lead source
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={`${inputClass} mt-2`}>
                    {["Website", "Referral", "Social Media", "Advertisement", "Cold Call", "Email Campaign", "Other"].map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Status
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${inputClass} mt-2`}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">
                  Estimated value (₹)
                  <input type="number" min="0" max="999999999999" step="0.01" required value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} className={`${inputClass} mt-2`} />
                </label>
                <label className="text-sm text-slate-300 sm:col-span-2">
                  Notes
                  <textarea rows={3} maxLength={5000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputClass} mt-2`} placeholder="Follow-up details, requirements, etc." />
                </label>
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">{error}</p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60">
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : editingId !== null ? "Save changes" : "Create lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
