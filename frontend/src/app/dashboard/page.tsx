"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/AuthProvider";

export default function DashboardPage() {
  const router = useRouter();
  const { logout, status } = useAuth();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/");
    }
  }, [router, status]);

  async function handleLogout() {
    setPending(true);
    await logout();
    router.replace("/");
  }

  if (status === "loading" || status === "anonymous") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">Проверяем сессию…</main>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <p className="text-sm font-medium text-blue-600">Uptime</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Вы вошли в аккаунт</h1>
        <p className="mt-3 leading-6 text-slate-600">Сессия восстановлена через защищённую HTTP cookie.</p>
        <button className="mt-8 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400" type="button" onClick={handleLogout} disabled={pending}>
          {pending ? "Выходим…" : "Выйти"}
        </button>
      </section>
    </main>
  );
}
