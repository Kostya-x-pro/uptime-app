"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthApiError, avatarSource, getProfile, type UserProfile, updateProfile, uploadAvatar } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";

export default function ProfilePage() {
  const router = useRouter();
  const { setProfile: setAuthProfile, status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/");
      return;
    }
    if (status !== "authenticated") {
      return;
    }

    let active = true;
    void getProfile()
      .then((response) => {
        if (active) {
          setProfile(response);
          setName(response.name);
        }
      })
      .catch(() => {
        if (active) {
          setError("Не удалось загрузить профиль. Попробуйте обновить страницу.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [router, status]);

  useEffect(() => {
    if (!saved) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/");
    }, 4000);

    return () => window.clearTimeout(redirectTimer);
  }, [router, saved]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    setSaved(false);

    if (Array.from(trimmedName).length < 2 || Array.from(trimmedName).length > 100) {
      setError("Имя должно содержать от 2 до 100 символов.");
      return;
    }
    if (status !== "authenticated") {
      return;
    }

    setError(null);
    setSaving(true);
    try {
      let updatedProfile = await updateProfile({ name: trimmedName });
      if (avatar) {
        updatedProfile = await uploadAvatar(avatar);
        setAvatar(null);
      }
      setProfile(updatedProfile);
      setAuthProfile(updatedProfile);
      setName(updatedProfile.name);
      setSaved(true);
    } catch (reason) {
      if (reason instanceof AuthApiError && reason.code === "invalid_request") {
        setError("Имя должно содержать от 2 до 100 символов.");
      } else {
        setError("Не удалось сохранить изменения. Попробуйте снова.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || status === "anonymous") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">Загружаем профиль…</main>;
  }

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 text-sm text-slate-600">Загружаем профиль…</main>
      </>
    );
  }

  return (
    <>
      <DashboardHeader />
      <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-xl">
        <Link href="/" className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-800">
          <span aria-hidden="true">←</span>
          Вернуться к дэшборду
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <p className="text-sm font-medium text-blue-600">Настройки профиля</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Ваш профиль</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Измените отображаемое имя вашей учётной записи.</p>

          {error && !profile ? (
            <p className="mt-6 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <label className="block text-sm font-medium text-slate-800">
                Email
                <input className="mt-1.5 block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 outline-none" value={profile?.email ?? ""} readOnly aria-readonly="true" />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Имя
                <input className={`mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4 ${error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} value={name} onChange={(event) => { setName(event.target.value); setError(null); setSaved(false); }} autoComplete="name" aria-invalid={Boolean(error)} aria-describedby={error ? "name-error" : undefined} />
                {error && <span id="name-error" className="mt-1.5 block text-sm font-normal text-red-600">{error}</span>}
              </label>

              {saved && <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700" role="status">Имя успешно обновлено. Вы будете перенаправлены на главную страницу.</p>}

              <div>
                <p className="text-sm font-medium text-slate-800">Аватар</p>
                <div className="mt-1.5 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-lg font-bold text-white">
                    {(avatarPreview || profile?.avatarUrl) ? <img src={avatarPreview || avatarSource(profile?.avatarUrl ?? "")} alt="Предпросмотр аватара" className="h-full w-full object-cover" /> : "U"}
                  </div>
                  <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:ring-4 focus-within:ring-blue-100">
                    Загрузить аватар
                    <input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif" onChange={(event) => {
                      const selected = event.target.files?.[0] ?? null;
                      if (selected && selected.size > 5 * 1024 * 1024) {
                        setError("Размер аватара не должен превышать 5 МБ.");
                        event.target.value = "";
                        return;
                      }
                      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                      setAvatar(selected);
                      setAvatarPreview(selected ? URL.createObjectURL(selected) : "");
                      setError(null);
                      setSaved(false);
                    }} />
                  </label>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">JPEG, PNG или GIF, до 5 МБ.</p>
              </div>

              <button className="w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" disabled={saving} type="submit">
                {saving ? "Сохраняем…" : "Сохранить изменения"}
              </button>
            </form>
          )}
        </div>
      </section>
      </main>
    </>
  );
}
