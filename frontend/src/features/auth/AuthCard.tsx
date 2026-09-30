"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthApiError } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";

type Mode = "login" | "register";
type Field = "email" | "name" | "password";
type FieldErrors = Partial<Record<Field, string>>;

const defaultInputClass = "mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-4";

export function AuthCard() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  function inputClass(field: Field) {
    return `${defaultInputClass} ${errors[field] ? "border-red-500 focus:border-red-500 focus:ring-red-100" : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"}`;
  }

  function clearError(field: Field) {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setErrors({});
    setRequestError(null);
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      nextErrors.email = "Введите корректный email.";
    }
    if (isRegister && Array.from(name.trim()).length < 2) {
      nextErrors.name = "Имя должно содержать не менее 2 символов.";
    }
    if (password.length < 8) {
      nextErrors.password = "Пароль должен содержать не менее 8 символов.";
    }
    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestError(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setPending(true);
    try {
      if (isRegister) {
        await register({ email, name, password });
      } else {
        await login({ email, password });
      }
      router.replace("/dashboard");
    } catch (reason) {
      if (reason instanceof AuthApiError) {
        if (reason.code === "email_already_registered") {
          setErrors({ email: "Этот email уже зарегистрирован." });
        } else if (reason.code === "invalid_credentials") {
          setErrors({ password: "Неверный email или пароль." });
        } else if (reason.code === "invalid_request") {
          setErrors({ password: "Проверьте корректность введённых данных." });
        } else {
          setRequestError("Не удалось выполнить запрос. Попробуйте снова.");
        }
      } else {
        setRequestError("Не удалось подключиться к серверу. Попробуйте снова.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-blue-600">Uptime</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{isRegister ? "Создайте аккаунт" : "Войдите в аккаунт"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isRegister ? "Зарегистрируйтесь, чтобы начать пользоваться сервисом." : "Введите данные учётной записи для входа."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Авторизация">
        <button className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`} type="button" role="tab" aria-selected={!isRegister} onClick={() => changeMode("login")}>Вход</button>
        <button className={`rounded-md px-3 py-2 text-sm font-medium transition ${isRegister ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`} type="button" role="tab" aria-selected={isRegister} onClick={() => changeMode("register")}>Регистрация</button>
      </div>

      <form className="space-y-4" onSubmit={submit} noValidate>
        {isRegister && (
          <label className="block text-sm font-medium text-slate-800">
            Имя
            <input className={inputClass("name")} value={name} onChange={(event) => { setName(event.target.value); clearError("name"); }} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} autoComplete="name" />
            {errors.name && <span id="name-error" className="mt-1.5 block text-sm font-normal text-red-600">{errors.name}</span>}
          </label>
        )}
        <label className="block text-sm font-medium text-slate-800">
          Email
          <input className={inputClass("email")} value={email} onChange={(event) => { setEmail(event.target.value); clearError("email"); }} type="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} autoComplete="email" />
          {errors.email && <span id="email-error" className="mt-1.5 block text-sm font-normal text-red-600">{errors.email}</span>}
        </label>
        <label className="block text-sm font-medium text-slate-800">
          Пароль
          <input className={inputClass("password")} value={password} onChange={(event) => { setPassword(event.target.value); clearError("password"); }} type="password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} autoComplete={isRegister ? "new-password" : "current-password"} />
          {errors.password && <span id="password-error" className="mt-1.5 block text-sm font-normal text-red-600">{errors.password}</span>}
        </label>

        {requestError && <p className="text-sm text-red-600" role="alert">{requestError}</p>}

        <button className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" disabled={pending} type="submit">
          {pending ? "Подождите…" : isRegister ? "Зарегистрироваться" : "Войти"}
        </button>
      </form>
    </section>
  );
}
