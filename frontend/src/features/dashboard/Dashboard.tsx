"use client";
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useEffect, useState } from "react";

import { AuthApiError } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { createMonitor, deleteMonitor, getMonitors, type Monitor, updateMonitor } from "@/features/monitors/api";

function formatInterval(seconds: number) {
  if (seconds % 3600 === 0) return `Каждые ${seconds / 3600} ч`;
  if (seconds % 60 === 0) return `Каждые ${seconds / 60} мин`;
  return `Каждые ${seconds} сек`;
}

function formatDate(value: string | null) {
  if (!value) return "Ещё не проверялся";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

function faviconSource(url: string) {
  try {
    return `${new URL(url).origin}/favicon.ico`;
  } catch {
    return "/favicon.ico";
  }
}

function MonitorFavicon({ url }: Readonly<{ url: string }>) {
  const [source, setSource] = useState(() => faviconSource(url));

  return (
    <img
      src={source}
      alt=""
      className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-contain p-2"
      onError={() => {
        if (source !== "/favicon.ico") setSource("/favicon.ico");
      }}
    />
  );
}

function MonitorCard({ monitor, onEdit, onDelete, deleting }: Readonly<{ monitor: Monitor; onEdit: (monitor: Monitor) => void; onDelete: (monitor: Monitor) => void; deleting: boolean }>) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <MonitorFavicon key={monitor.url} url={monitor.url} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950" title={monitor.name || monitor.url}>{monitor.name || monitor.url}</p>
            {monitor.name && <p className="mt-1 truncate text-xs text-slate-500" title={monitor.url}>{monitor.url}</p>}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${monitor.status === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{monitor.status === "up" ? "Доступен" : "Недоступен"}</span>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-slate-500">Частота</dt><dd className="mt-1 font-medium">{formatInterval(monitor.intervalSeconds)}</dd></div>
        <div><dt className="text-slate-500">Отклик</dt><dd className="mt-1 font-medium">{monitor.lastResponseTimeMs === null ? "—" : `${monitor.lastResponseTimeMs} мс`}</dd></div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Последняя проверка: {formatDate(monitor.lastCheckedAt)}</p><button className="cursor-pointer text-xs font-semibold text-blue-700 transition hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={() => onEdit(monitor)} disabled={deleting}>Редактировать</button></div>
      <div className="mt-4 flex h-8 items-end gap-1" aria-label="История проверок">
        {monitor.checks.slice().reverse().map((check) => <span key={check.id} className={`min-w-1 flex-1 rounded-t ${check.status === "up" ? "bg-emerald-400" : "bg-red-400"}`} style={{ height: `${Math.max(20, Math.min(100, (check.responseTimeMs ?? 1000) / 10))}%` }} title={`${check.status === "up" ? "Доступен" : "Недоступен"}: ${check.responseTimeMs ?? "—"} мс`} />)}
      </div>
      <button className="mt-3 cursor-pointer text-xs font-semibold text-red-700 transition hover:text-red-800 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={() => onDelete(monitor)} disabled={deleting}>{deleting ? "Удаляем…" : "Удалить сайт"}</button>
    </article>
  );
}

function MonitorFormModal({
  mounted,
  visible,
  editing,
  name,
  url,
  intervalValue,
  intervalUnit,
  saving,
  error,
  onClose,
  onSubmit,
  onNameChange,
  onUrlChange,
  onIntervalValueChange,
  onIntervalUnitChange,
}: Readonly<{
  mounted: boolean;
  visible: boolean;
  editing: Monitor | null;
  name: string;
  url: string;
  intervalValue: string;
  intervalUnit: "seconds" | "minutes" | "hours";
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onIntervalValueChange: (value: string) => void;
  onIntervalUnitChange: (value: "seconds" | "minutes" | "hours") => void;
}>) {
  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 transition-opacity duration-200 ${visible ? "bg-slate-950/45 opacity-100" : "pointer-events-none bg-slate-950/0 opacity-0"}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/20 transition duration-200 ease-out ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-95 opacity-0"}`} role="dialog" aria-modal="true" aria-labelledby="monitor-form-title">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="monitor-form-title" className="text-xl font-semibold text-slate-950">{editing ? "Редактировать сайт" : "Добавить сайт"}</h2>
            <p className="mt-1 text-sm text-slate-500">Настройте адрес и частоту проверки сайта.</p>
          </div>
          <button className="cursor-pointer rounded-lg p-2 text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" type="button" onClick={onClose} disabled={saving} aria-label="Закрыть">×</button>
        </div>
        <form onSubmit={onSubmit} className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">Название<input className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="text" maxLength={100} placeholder="Основной сайт" value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
            <label className="block text-sm font-medium text-slate-800">URL сайта<input className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="url" placeholder="https://example.com" value={url} onChange={(event) => onUrlChange(event.target.value)} required /></label>
            <label className="block text-sm font-medium text-slate-800">Период<input className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" type="number" min="1" step="1" value={intervalValue} onChange={(event) => onIntervalValueChange(event.target.value)} required /></label>
            <label className="block text-sm font-medium text-slate-800">Единица<select className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" value={intervalUnit} onChange={(event) => onIntervalUnitChange(event.target.value as "seconds" | "minutes" | "hours")}><option value="seconds">Секунды</option><option value="minutes">Минуты</option><option value="hours">Часы</option></select></label>
          </div>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={onClose} disabled={saving}>Отмена</button>
            <button className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" type="submit" disabled={saving}>{saving ? "Сохраняем…" : editing ? "Сохранить" : "Создать"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { status } = useAuth();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [formMounted, setFormMounted] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalValue, setIntervalValue] = useState("1");
  const [intervalUnit, setIntervalUnit] = useState<"seconds" | "minutes" | "hours">("minutes");
  const [saving, setSaving] = useState(false);
  const [deletingMonitorId, setDeletingMonitorId] = useState<string | null>(null);
  const [monitorPendingDeletion, setMonitorPendingDeletion] = useState<Monitor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let active = true;
    void getMonitors().then((items) => { if (active) setMonitors(items); }).catch(() => { if (active) setError("Не удалось загрузить точки мониторинга."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [status]);

  useEffect(() => {
    if (!formMounted && !monitorPendingDeletion) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (formMounted && !saving) {
        setFormVisible(false);
        window.setTimeout(() => setFormMounted(false), 200);
        setEditingMonitor(null);
        setError(null);
      }
      if (monitorPendingDeletion && !deletingMonitorId) setMonitorPendingDeletion(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [formMounted, monitorPendingDeletion, deletingMonitorId, saving]);

  function openCreateForm() {
    setEditingMonitor(null);
    setName("");
    setUrl("");
    setIntervalValue("1");
    setIntervalUnit("minutes");
    setError(null);
    setFormMounted(true);
    window.setTimeout(() => setFormVisible(true), 10);
  }

  function openEditForm(monitor: Monitor) {
    const unit = monitor.intervalSeconds % 3600 === 0 ? "hours" : monitor.intervalSeconds % 60 === 0 ? "minutes" : "seconds";
    const multiplier = unit === "hours" ? 3600 : unit === "minutes" ? 60 : 1;
    setEditingMonitor(monitor);
    setName(monitor.name);
    setUrl(monitor.url);
    setIntervalValue(String(monitor.intervalSeconds / multiplier));
    setIntervalUnit(unit);
    setError(null);
    setFormMounted(true);
    window.setTimeout(() => setFormVisible(true), 10);
  }

  function closeForm() {
    if (saving) return;
    setFormVisible(false);
    window.setTimeout(() => setFormMounted(false), 200);
    setEditingMonitor(null);
    setError(null);
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
      const input = { name: name.trim(), url: url.trim(), intervalSeconds: interval };
      const monitor = editingMonitor ? await updateMonitor(editingMonitor.id, input) : await createMonitor(input);
      setMonitors((items) => editingMonitor ? items.map((item) => item.id === monitor.id ? monitor : item) : [monitor, ...items]);
      setSaving(false);
      closeForm();
    } catch (reason) {
      setError(reason instanceof AuthApiError && reason.code === "invalid_monitor" ? "Введите корректный URL (http или https) и период." : "Не удалось сохранить точку мониторинга.");
      setSaving(false);
    }
  }

  function openDeleteConfirmation(monitor: Monitor) {
    setError(null);
    setMonitorPendingDeletion(monitor);
  }

  async function handleDelete() {
    const monitor = monitorPendingDeletion;
    if (status !== "authenticated" || !monitor) return;
    setDeletingMonitorId(monitor.id);
    setError(null);
    try {
      await deleteMonitor(monitor.id);
      setMonitors((items) => items.filter((item) => item.id !== monitor.id));
      setMonitorPendingDeletion(null);
    } catch {
      setError("Не удалось удалить сайт из мониторинга.");
    } finally {
      setDeletingMonitorId(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <DashboardHeader />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block"><nav aria-label="Основная навигация" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm"><span className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700"><span className="h-2 w-2 rounded-full bg-blue-600" />Обзор</span></nav></aside>
        <section className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Мониторинг</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Ваши сайты</h1></div><button className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700" type="button" onClick={openCreateForm}>Добавить сайт</button></div>
          {error && !formMounted && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
          {loading ? <p className="mt-8 text-sm text-slate-600">Загружаем точки мониторинга…</p> : monitors.length > 0 && <div className="mt-6 grid gap-4 lg:grid-cols-2">{monitors.map((monitor) => <MonitorCard key={monitor.id} monitor={monitor} onEdit={openEditForm} onDelete={openDeleteConfirmation} deleting={deletingMonitorId === monitor.id} />)}</div>}
        </section>
      </div>
      <MonitorFormModal mounted={formMounted} visible={formVisible} editing={editingMonitor} name={name} url={url} intervalValue={intervalValue} intervalUnit={intervalUnit} saving={saving} error={error} onClose={closeForm} onSubmit={handleSubmit} onNameChange={setName} onUrlChange={setUrl} onIntervalValueChange={setIntervalValue} onIntervalUnitChange={setIntervalUnit} />
      {monitorPendingDeletion && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingMonitorId) setMonitorPendingDeletion(null); }}><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="delete-monitor-title"><h2 id="delete-monitor-title" className="text-lg font-semibold">Удалить сайт?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Мониторинг «{monitorPendingDeletion.name || monitorPendingDeletion.url}» будет удалён вместе с историей проверок.</p><div className="mt-6 flex justify-end gap-3"><button className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={() => setMonitorPendingDeletion(null)} disabled={deletingMonitorId !== null}>Отмена</button><button className="cursor-pointer rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-red-300" type="button" onClick={handleDelete} disabled={deletingMonitorId !== null}>{deletingMonitorId ? "Удаляем…" : "Удалить"}</button></div></div></div>}
    </main>
  );
}
