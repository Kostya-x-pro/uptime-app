"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthApiError, avatarSource, changePassword, getProfile, type UserProfile, updateProfile, uploadAvatar } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";

type PasswordErrorField = "current" | "new" | "confirmation" | "form" | null;

function PasswordVisibilityButton({ visible, onToggle }: Readonly<{ visible: boolean; onToggle: () => void }>) {
  return (
    <button className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" type="button" onClick={onToggle} aria-label={visible ? "Скрыть пароль" : "Показать пароль"} title={visible ? "Скрыть пароль" : "Показать пароль"}>
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {visible ? <><path d="M3 3l18 18" strokeLinecap="round" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" /><path d="M9.9 4.3A10.8 10.8 0 0 1 12 4c5.2 0 8.4 4 9.5 6a14.8 14.8 0 0 1-3.1 3.7M6.2 6.2C4.5 7.3 3.4 9 2.5 10.5c1.1 2 4.3 6 9.5 6 1 0 2-.2 2.9-.5" strokeLinecap="round" strokeLinejoin="round" /></> : <><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.5" /></>}
      </svg>
    </button>
  );
}

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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordErrorField, setPasswordErrorField] = useState<PasswordErrorField>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

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
    if (!passwordSaved) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/");
    }, 4000);

    return () => window.clearTimeout(redirectTimer);
  }, [passwordSaved, router]);

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

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaved(false);
    const newPasswordLength = Array.from(newPassword).length;
    if (currentPassword.length === 0) {
      setPasswordErrorField("current");
      setPasswordError("Введите текущий пароль.");
      return;
    }
    if (newPasswordLength < 8) {
      setPasswordErrorField("new");
      setPasswordError("Новый пароль должен содержать минимум 8 символов.");
      return;
    }
    if (passwordConfirmation.length === 0) {
      setPasswordErrorField("confirmation");
      setPasswordError("Повторите новый пароль.");
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setPasswordErrorField("confirmation");
      setPasswordError("Новые пароли не совпадают.");
      return;
    }
    if (status !== "authenticated") return;

    setPasswordError(null);
    setPasswordErrorField(null);
    setPasswordSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setPasswordErrorField(null);
      setPasswordSaved(true);
    } catch (reason) {
      if (reason instanceof AuthApiError && reason.code === "invalid_current_password") {
        setPasswordErrorField("current");
        setPasswordError("Текущий пароль указан неверно.");
      } else {
        setPasswordErrorField("form");
        setPasswordError("Не удалось изменить пароль. Проверьте данные и попробуйте снова.");
      }
    } finally {
      setPasswordSaving(false);
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
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Ваш профиль</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Управляйте данными профиля и безопасностью учётной записи.</p>

          <div className="mt-6 flex gap-1 border-b border-slate-200" role="tablist" aria-label="Разделы профиля">
            <button id="profile-tab" className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-semibold transition ${activeTab === "profile" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"}`} type="button" role="tab" aria-selected={activeTab === "profile"} aria-controls="profile-panel" onClick={() => setActiveTab("profile")}>Настройки профиля</button>
            <button id="security-tab" className={`cursor-pointer border-b-2 px-3 py-2.5 text-sm font-semibold transition ${activeTab === "security" ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"}`} type="button" role="tab" aria-selected={activeTab === "security"} aria-controls="security-panel" onClick={() => setActiveTab("security")}>Безопасность</button>
          </div>

          {activeTab === "profile" && (error && !profile ? (
            <p className="mt-6 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>
          ) : (
            <div id="profile-panel" className="mt-8" role="tabpanel" aria-labelledby="profile-tab">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
            </div>
          ))}

          {activeTab === "security" && <section id="security-panel" className="mt-8" role="tabpanel" aria-labelledby="security-tab">
            <h2 id="password-title" className="mt-2 text-xl font-semibold tracking-tight text-slate-950">Смена пароля</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Введите текущий пароль, чтобы установить новый.</p>
            <form className="mt-6 space-y-5" onSubmit={handlePasswordSubmit} noValidate>
              <label className="block text-sm font-medium text-slate-800">
                Текущий пароль
                <div className="relative mt-1.5">
                  <input className={`block w-full rounded-lg border px-3 py-2.5 pr-11 text-slate-950 outline-none transition focus:ring-4 ${passwordErrorField === "current" ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(event) => { setCurrentPassword(event.target.value); setPasswordError(null); setPasswordErrorField(null); setPasswordSaved(false); }} autoComplete="current-password" aria-invalid={passwordErrorField === "current"} aria-describedby={passwordErrorField === "current" ? "current-password-error" : undefined} required />
                  <PasswordVisibilityButton visible={showCurrentPassword} onToggle={() => setShowCurrentPassword((current) => !current)} />
                </div>
                {passwordErrorField === "current" && <span id="current-password-error" className="mt-1.5 block text-sm font-normal text-red-600">{passwordError}</span>}
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Новый пароль
                <div className="relative mt-1.5">
                  <input className={`block w-full rounded-lg border px-3 py-2.5 pr-11 text-slate-950 outline-none transition focus:ring-4 ${passwordErrorField === "new" ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} type={showNewPassword ? "text" : "password"} minLength={8} value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError(null); setPasswordErrorField(null); setPasswordSaved(false); }} autoComplete="new-password" aria-invalid={passwordErrorField === "new"} aria-describedby={passwordErrorField === "new" ? "new-password-error" : undefined} required />
                  <PasswordVisibilityButton visible={showNewPassword} onToggle={() => setShowNewPassword((current) => !current)} />
                </div>
                {passwordErrorField === "new" && <span id="new-password-error" className="mt-1.5 block text-sm font-normal text-red-600">{passwordError}</span>}
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Повторите новый пароль
                <div className="relative mt-1.5">
                  <input className={`block w-full rounded-lg border px-3 py-2.5 pr-11 text-slate-950 outline-none transition focus:ring-4 ${passwordErrorField === "confirmation" ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`} type={showPasswordConfirmation ? "text" : "password"} minLength={8} value={passwordConfirmation} onChange={(event) => { setPasswordConfirmation(event.target.value); setPasswordError(null); setPasswordErrorField(null); setPasswordSaved(false); }} autoComplete="new-password" aria-invalid={passwordErrorField === "confirmation"} aria-describedby={passwordErrorField === "confirmation" ? "confirmation-password-error" : undefined} required />
                  <PasswordVisibilityButton visible={showPasswordConfirmation} onToggle={() => setShowPasswordConfirmation((current) => !current)} />
                </div>
                {passwordErrorField === "confirmation" && <span id="confirmation-password-error" className="mt-1.5 block text-sm font-normal text-red-600">{passwordError}</span>}
                <span className="mt-1.5 block text-xs font-normal text-slate-500">Пароль должен содержать минимум 8 символов.</span>
              </label>
              {passwordErrorField === "form" && passwordError && <p className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{passwordError}</p>}
              {passwordSaved && <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700" role="status">Пароль успешно изменён.</p>}
              <button className="w-full cursor-pointer rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400" disabled={passwordSaving} type="submit">
                {passwordSaving ? "Изменяем…" : "Изменить пароль"}
              </button>
            </form>
          </section>}
        </div>
      </section>
      </main>
    </>
  );
}
