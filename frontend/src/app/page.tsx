"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Store,
  Wifi,
} from "lucide-react";
import { login } from "@/lib/auth";
import { readStoredAuth, saveStoredAuth } from "@/lib/session";

const accessSignals = [
  { label: "Register", value: "01", note: "Ready" },
  { label: "Shift", value: "Open", note: "Live counter" },
  { label: "Mode", value: "Staff", note: "Role based" },
];

const systemChecks = [
  { label: "Backend connected", note: "Auth API online", icon: Wifi },
  { label: "Role access", note: "Admin / Kasir", icon: ShieldCheck },
  { label: "Sales workspace", note: "Checkout ready", icon: ReceiptText },
];

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
      setError(
        loginError instanceof Error ? loginError.message : "Login failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-emerald-950">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-950/10 bg-white px-5 py-4 text-sm font-bold shadow-sm shadow-emerald-950/5">
          <Clock3 className="size-4 text-emerald-700" />
          Checking staff session...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 text-emerald-950">
      <div className="grid min-h-screen">
        <section className="flex items-center justify-center px-5 py-8 sm:px-7 lg:px-10">
          <div className="w-full max-w-lg">
            <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-emerald-950/10 bg-white px-4 py-3 shadow-sm shadow-emerald-950/5">
              <div>
                <p className="text-xs font-black uppercase text-emerald-700">
                  Point of Sale
                </p>
                <p className="mt-1 text-sm font-bold text-stone-600">
                  Secure staff entry
                </p>
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-md bg-amber-100 px-3 text-xs font-black text-amber-900">
                <CheckCircle2 className="size-4" />
                Ready
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-emerald-950/10 bg-white shadow-xl shadow-emerald-950/10">
              <div className="h-1.5 bg-gradient-to-r from-emerald-700 via-emerald-500 to-amber-400" />
              <div className="border-b border-emerald-950/10 bg-stone-50 px-5 py-5 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-emerald-700">
                      Staff Login
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight text-emerald-950">
                      Masuk Register
                    </h2>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm shadow-emerald-900/20">
                    <LockKeyhole className="size-5" />
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
                  Gunakan akun staff yang sudah terdaftar untuk membuka
                  workspace kasir atau admin.
                </p>
              </div>

              <form className="space-y-5 p-5 sm:p-7" onSubmit={handleSubmit}>
                <div>
                  <label
                    className="text-sm font-black text-emerald-950"
                    htmlFor="email"
                  >
                    Email
                  </label>
                  <div className="relative mt-2">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      className="h-11 w-full rounded-md border border-emerald-950/15 bg-stone-50 px-3 pl-9 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-600/15"
                      placeholder="staff@toko.com"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-black text-emerald-950"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <div className="relative mt-2">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="h-11 w-full rounded-md border border-emerald-950/15 bg-stone-50 px-3 pl-9 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-3 focus:ring-emerald-600/15"
                      placeholder="Password staff"
                    />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-black text-white shadow-sm shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-3 focus:ring-emerald-700/25 disabled:cursor-not-allowed disabled:bg-stone-400"
                >
                  {isLoading ? "Logging in..." : "Login to Workspace"}
                  <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                </button>

                <div className="grid grid-cols-2 gap-2 border-t border-emerald-950/10 pt-4 text-xs font-bold text-stone-500">
                  <span className="rounded-md bg-stone-50 px-3 py-2">
                    JWT secured
                  </span>
                  <span className="rounded-md bg-stone-50 px-3 py-2 text-right">
                    Role guarded
                  </span>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
