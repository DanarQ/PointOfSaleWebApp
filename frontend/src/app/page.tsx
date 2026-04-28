"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 text-neutral-950">
        <div className="border border-neutral-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm">
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-neutral-100 text-neutral-950 lg:grid-cols-[minmax(360px,0.95fr)_1.05fr]">
      <section className="flex min-h-[44vh] flex-col justify-between bg-neutral-950 px-6 py-8 text-white lg:min-h-screen lg:px-10">
        <div>
          <p className="text-sm font-black uppercase text-neutral-400">Point of Sale</p>
          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight tracking-tight lg:text-6xl">
            Workspace kasir yang cepat, jelas, dan siap kontrol role.
          </h1>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-3 text-sm">
          <div className="border border-white/15 p-3">
            <p className="font-black">Auth</p>
            <p className="mt-1 text-neutral-400">Backend login</p>
          </div>
          <div className="border border-white/15 p-3">
            <p className="font-black">Role</p>
            <p className="mt-1 text-neutral-400">Kasir/Admin</p>
          </div>
          <div className="border border-white/15 p-3">
            <p className="font-black">POS</p>
            <p className="mt-1 text-neutral-400">App shell</p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md border border-neutral-200 bg-white p-7 shadow-sm sm:p-8">
          <div className="mb-8">
            <p className="text-sm font-black uppercase text-neutral-500">Login</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Masuk ke POS</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Gunakan akun backend yang sudah ada. Role `user` akan masuk sebagai Kasir.
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-bold text-neutral-800" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                placeholder="kasir@toko.com"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-neutral-800" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-2 h-11 w-full border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10"
                placeholder="Minimal 6 karakter"
              />
            </div>

            {error ? (
              <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full bg-neutral-950 px-4 text-sm font-black text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
