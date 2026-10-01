"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/features/auth/AuthProvider";

function Avatar({ size = "default" }: Readonly<{ size?: "default" | "large" }>) {
  const dimensions = size === "large" ? "h-11 w-11" : "h-10 w-10";

  return (
    <div className={`relative flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-sm ${dimensions}`}>
      U
      <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" aria-hidden="true" />
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 12H3" strokeLinecap="round" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dashboard() {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } catch {
      // Local authentication state is still cleared by AuthProvider, so the user returns to the login screen.
    } finally {
      setPending(false);
      setMenuOpen(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">Uptime</Link>
          <div className="relative" ref={menuRef}>
            <button className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-left outline-none transition hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-blue-100" type="button" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Открыть меню профиля" onClick={() => setMenuOpen((open) => !open)}>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">Вы в системе</p>
                <p className="text-xs text-slate-500">Активная сессия</p>
              </div>
              <Avatar />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-10 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/40" role="menu">
                <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3">
                  <Avatar size="large" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Профиль пользователя</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />В системе</p>
                  </div>
                </div>
                <button className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400" type="button" role="menuitem" onClick={handleLogout} disabled={pending}>
                  <LogoutIcon />
                  {pending ? "Выходим…" : "Выйти из аккаунта"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-10">
        <aside className="hidden lg:block">
          <nav aria-label="Основная навигация" className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <Link href="/" aria-current="page" className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
              Обзор
            </Link>
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Статус аккаунта</p>
              <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-slate-950"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Авторизован</div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Мониторы</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Пока нет</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Инциденты</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Нет активных</p>
            </article>
          </div>

          <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-blue-700" aria-hidden="true">+</div>
            <h2 className="mt-4 text-lg font-semibold">Вы готовы начать</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Добавьте первый монитор, чтобы следить за доступностью своих сервисов.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
