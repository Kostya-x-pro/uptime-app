"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/AuthProvider";
import { avatarSource } from "@/features/auth/api";

function Avatar({ size = "default", avatarUrl = "", name = "" }: Readonly<{ size?: "default" | "large"; avatarUrl?: string; name?: string }>) {
  const dimensions = size === "large" ? "h-11 w-11" : "h-10 w-10";

  return (
    <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-sm ${dimensions}`}>
      {avatarUrl ? <img src={avatarSource(avatarUrl)} alt={`Аватар ${name}`} className="h-full w-full object-cover" /> : "U"}
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

export function DashboardHeader() {
  const { logout, profile } = useAuth();
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
      // AuthProvider clears local authentication state even if the network request fails.
    } finally {
      setPending(false);
      setMenuOpen(false);
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-950">Uptime</Link>
        <div className="relative" ref={menuRef}>
          <button className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-left outline-none transition hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-blue-100" type="button" aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Открыть меню профиля" onClick={() => setMenuOpen((open) => !open)}>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">Вы в системе</p>
              <p className="text-xs text-slate-500">Активная сессия</p>
            </div>
            <Avatar avatarUrl={profile?.avatarUrl} name={profile?.name} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-10 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/40" role="menu">
              <Link href="/profile" className="flex cursor-pointer items-center gap-3 rounded-lg border-b border-slate-100 px-3 py-3 transition hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-blue-100" role="menuitem" onClick={() => setMenuOpen(false)}>
                <Avatar size="large" avatarUrl={profile?.avatarUrl} name={profile?.name} />
                <p className="max-w-44 truncate text-sm font-semibold text-slate-900" title={profile?.name ?? "Профиль пользователя"}>{profile?.name ?? "Профиль пользователя"}</p>
              </Link>
              <button className="mt-2 flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400" type="button" role="menuitem" onClick={handleLogout} disabled={pending}>
                <LogoutIcon />
                {pending ? "Выходим…" : "Выйти из аккаунта"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
