import Link from "next/link";

import { DashboardHeader } from "@/features/dashboard/DashboardHeader";

export function Dashboard() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <DashboardHeader />

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
