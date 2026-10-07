"use client";

import { FormEvent, useEffect, useState } from "react";

import { AuthApiError } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { createMonitor, getMonitors, type Monitor, updateMonitor } from "@/features/monitors/api";

function formatInterval(seconds: number) {
  if (seconds % 3600 === 0) return `Каждые ${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `Каждые ${seconds / 60} мин`;
  return `Каждые ${seconds} сек`;
}

function formatDate(value: string | null) {
  if (!value) return "Ещё не проверялся";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

function MonitorCard({ monitor, onEdit }: Readonly<{ monitor: Monitor; onEdit: (monitor: Monitor) => void }>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-slate-950" title={monitor.url}>{monitor.url}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${monitor.status === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{monitor.status === "up" ? "Доступен" : "Недоступен"}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Частота</dt><dd className="mt-1 font-medium">{formatInterval(monitor.intervalSeconds)}</dd></div>
        <div><dt className="text-slate-500">Отклик</dt><dd className="mt-1 font-medium">{monitor.lastResponseTimeMs === null ? "—" : `${monitor.lastResponseTimeMs} мс`}</dd></div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Последняя проверка: {formatDate(monitor.lastCheckedAt)}</p><button className="cursor-pointer text-xs font-semibold text-blue-700 hover:text-blue-800" type="button" onClick={() => onEdit(monitor)}>Редактировать</button></div>
      <div className="mt-4 flex h-8 items-end gap-1" aria-label="История проверок">
        {monitor.checks.slice().reverse().map((check) => <span key={check.id} className={`min-w-1 flex-1 rounded-t ${check.status === "up" ? "bg-emerald-400" : "bg-red-400"}`} style={{ height: `${Math.max(20, Math.min(100, (check.responseTimeMs ?? 1000) / 10))}%` }} title={`${check.status === "up" ? "Доступен" : "Недоступен"}: ${check.responseTimeMs ?? "—"} мс`} />)}
      </div>
    </article>
  );
}

export function Dashboard() {
  const { status } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [url, setUrl] = useState("");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<"seconds" | "minutes" | "hours">("minutes");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void getMonitors().then((items) => { if (active) setMonitors(items); }).catch(() => { if (active) setError("Не удалось загрузить точки мониторинга."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);

  function openCreateForm() {
    setEditingMonitor(null);
    setUrl("");
    setIntervalValue("1");
    setIntervalUnit("minutes");
    setError(null);
    setShowForm(true);
  }

  function openEditForm(monitor: Monitor) {
    const unit = monitor.intervalSeconds % 3600 === 0 ? "hours" : monitor.intervalSeconds % 60 === 0 ? "minutes" : "seconds";
    const multiplier = unit === "hours" ? 3600 : unit === "minutes" ? 60 : 1;
    setEditingMonitor(monitor);
    setUrl(monitor.url);
    setIntervalValue(String(monitor.intervalSeconds / multiplier));
    setIntervalUnit(unit);
    setError(null);
    setShowForm(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== "authenticated") return;
    const amount = Number(intervalValue);
    const multiplier = intervalUnit === "hours" ? 3600 : intervalUnit === "minutes" ? 60 : 1;
    const interval = amount * multiplier;
    if (!Number.isSafeInteger(amount) || amount < 1 || !Number.isSafeInteger(interval)) {
      setError("Укажите положительное целое число для периода.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const monitor = editingMonitor ? await updateMonitor(editingMonitor.id, { url: url.trim(), intervalSeconds: interval }) : await createMonitor({ url: url.trim(), intervalSeconds: interval });
      setMonitors((items) => editingMonitor ? items.map((item) => item.id === monitor.id ? monitor : item) : [monitor, ...items]);
      setEditingMonitor(null);
      setShowForm(false);
    } catch (reason) {
      setError(reason instanceof AuthApiError && reason.code === "invalid_monitor" ? "Введите корректный URL (http или https) и период." : "Не удалось создать точку мониторинга.");
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <DashboardHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block"><nav aria-label="Основная навигация" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><span className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" />Обзор</span></nav></aside>
        <section className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Мониторинг</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Ваши сайты</h1></div><button className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700" type="button" onClick={openCreateForm}>Добавить сайт</button></div>
          {showForm && <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_160px_auto] sm:items-end"><label className="block text-sm font-medium text-slate-800">URL сайта<input className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="url" placeholder="https://example.com" value={url} onChange={(event) => setUrl(event.target.value)} required /></label><label className="block text-sm font-medium text-slate-800">Период<input className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="number" min="1" step="1" value={intervalValue} onChange={(event) => setIntervalValue(event.target.value)} required /></label><label className="block text-sm font-medium text-slate-800">Единица<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={intervalUnit} onChange={(event) => setIntervalUnit(event.target.value as "seconds" | "minutes" | "hours")}><option value="seconds">Секунды</option><option value="minutes">Минуты</option><option value="hours">Часы</option></select></label><button className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={saving}>{saving ? "Сохраняем…" : editingMonitor ? "Сохранить" : "Создать"}</button></div><p className="mt-3 text-xs text-slate-500">Введите любое положительное целое число и выберите секунды, минуты или часы. При создании сайт проверяется сразу.</p></form>}
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
          {loading ? <p className="mt-8 text-sm text-slate-600">Загружаем точки мониторинга…</p> : monitors.length > 0 && <div className="mt-6 grid gap-4 lg:grid-cols-2">{monitors.map((monitor) => <MonitorCard key={monitor.id} monitor={monitor} onEdit={openEditForm} />)}</div>}
        </section>
      </div>
    </main>
  );
}
