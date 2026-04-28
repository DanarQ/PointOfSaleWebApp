"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthUser, login } from "@/lib/auth";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedUser = window.localStorage.getItem("pos_user");

      if (!storedUser) {
        return;
      }

      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        window.localStorage.removeItem("pos_user");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

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

      window.localStorage.setItem("pos_token", result.token);
      window.localStorage.setItem("pos_refresh_token", result.refreshToken);
      window.localStorage.setItem("pos_user", JSON.stringify(result.user));

      setUser(result.user);
      setEmail("");
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem("pos_token");
    window.localStorage.removeItem("pos_refresh_token");
    window.localStorage.removeItem("pos_user");
    setUser(null);
    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 py-10 text-neutral-950">
      <section className="w-full max-w-md border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Point of Sale
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Login</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Masuk untuk mulai menggunakan aplikasi kasir.
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            <div className="border border-neutral-200 bg-neutral-50 p-5">
              <p className="text-sm font-medium text-neutral-500">Logged in as</p>
              <p className="mt-2 break-words text-lg font-semibold">{user.email}</p>
              <p className="mt-1 text-sm text-neutral-600">Role: {user.role}</p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="h-11 w-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-neutral-800" htmlFor="email">
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
              <label className="text-sm font-medium text-neutral-800" htmlFor="password">
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
              className="h-11 w-full bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}
      </section>
      </main>
  );
}
