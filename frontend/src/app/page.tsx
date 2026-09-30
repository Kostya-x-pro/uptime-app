"use client";

import { AuthCard } from "@/features/auth/AuthCard";
import { useAuth } from "@/features/auth/AuthProvider";
import { Dashboard } from "@/features/dashboard/Dashboard";

export default function Home() {
  const { status } = useAuth();

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">Проверяем сессию…</main>;
  }

  if (status === "authenticated") {
    return <Dashboard />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
      <AuthCard />
    </main>
  );
}
