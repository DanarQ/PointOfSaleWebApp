"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, LockKeyhole, ShieldCheck, Wifi } from "lucide-react";
import { login } from "@/lib/auth";
import { readStoredAuth, saveStoredAuth } from "@/lib/session";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (readStoredAuth()) {
        router.replace("/dashboard");
      } else {
        setIsCheckingSession(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await login(normalizedEmail, password);

      saveStoredAuth(result);
      router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-emerald-950">
        <div className="rounded-lg border border-emerald-950/10 bg-white px-5 py-4 text-sm font-bold shadow-sm shadow-emerald-950/5">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-stone-100 text-emerald-950 lg:grid-cols-[minmax(380px,0.92fr)_1.08fr]">
      <section className="relative flex min-h-[46vh] flex-col justify-between overflow-hidden bg-emerald-950 px-6 py-8 text-white lg:min-h-screen lg:px-10">
        <div className="absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-emerald-500 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-amber-400 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-emerald-950">
              POS
            </span>
            <div>
              <p className="text-sm font-black uppercase text-emerald-200">Checkout Control</p>
              <p className="text-xs font-bold uppercase text-white/60">Retail register workspace</p>
            </div>
          </div>
          <h1 className="mt-8 max-w-xl text-4xl font-black leading-tight tracking-tight lg:text-6xl">
            Portal staff untuk shift kasir yang cepat dan terkontrol.
          </h1>
          <p className="mt-5 max-w-lg text-sm font-semibold leading-6 text-emerald-50/75">
            Login ke register, lanjutkan transaksi, dan biarkan role access menjaga menu admin tetap rapi.
          </p>
        </div>
        <div className="relative mt-10 grid gap-3 text-sm sm:grid-cols-3">
          {[
            { label: "Register Ready", note: "Open shift", icon: CheckCircle2 },
            { label: "Backend Connected", note: "API auth", icon: Wifi },
            { label: "Role Access", note: "Admin/Kasir", icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div className="rounded-lg border border-white/10 bg-white/10 p-3" key={item.label}>
                <Icon className="size-5 text-emerald-300" />
                <p className="mt-3 font-black">{item.label}</p>
                <p className="mt-1 text-xs font-semibold text-emerald-50/60">{item.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/10">
          <div className="border-b border-emerald-950/10 bg-emerald-50 px-7 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-emerald-700">Staff Login</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">Masuk Register</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <LockKeyhole className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
              Gunakan akun backend yang sudah ada. Role user akan masuk sebagai Kasir.
            </p>
          </div>
          <form className="space-y-5 p-7" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-black text-emerald-950" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-md border border-emerald-950/15 bg-stone-50 px-3 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-600/15"
                placeholder="kasir@toko.com"
              />
            </div>

            <div>
              <label className="text-sm font-black text-emerald-950" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-2 h-11 w-full rounded-md border border-emerald-950/15 bg-stone-50 px-3 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-600/15"
                placeholder="Minimal 6 karakter"
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-black text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-3 focus:ring-emerald-700/25 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
            <p className="text-center text-xs font-bold uppercase text-stone-400">
              Secure staff access
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
