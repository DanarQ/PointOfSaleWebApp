"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Menu, ReceiptText, ShieldCheck, Wifi } from "lucide-react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { canAccessPath } from "@/components/sidebar/sidebar.config";
import {
  clearStoredAuth,
} from "@/lib/session";
import { useAuthSession } from "@/lib/use-auth-session";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthSession();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (auth === null) {
      router.replace("/");
    }
  }, [auth, router]);

  useEffect(() => {
    if (!auth || canAccessPath(pathname, auth.user.role)) {
      return;
    }

    router.replace("/dashboard");
  }, [auth, pathname, router]);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/");
  }

  if (!auth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-emerald-950">
        <div className="rounded-lg border border-emerald-950/10 bg-white px-5 py-4 text-sm font-bold shadow-sm shadow-emerald-950/5">
          Preparing workspace...
        </div>
      </main>
    );
  }

  if (!canAccessPath(pathname, auth.user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-emerald-950">
        <div className="max-w-md rounded-lg border border-amber-300 bg-white p-6 shadow-sm shadow-amber-900/10">
          <p className="text-sm font-black uppercase text-amber-700">Access blocked</p>
          <h1 className="mt-3 text-2xl font-black">Redirecting to dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Akun kasir tidak punya akses ke halaman kontrol admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-emerald-950">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] lg:block">
        <Sidebar email={auth.user.email} role={auth.user.role} onLogout={handleLogout} />
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-emerald-950/50"
            aria-label="Close sidebar"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative h-full w-[17.5rem] max-w-[86vw]">
            <Sidebar
              email={auth.user.email}
              role={auth.user.role}
              onLogout={handleLogout}
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-white/90 px-4 py-3 shadow-sm shadow-emerald-950/5 backdrop-blur lg:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase text-stone-500">
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                  {auth.user.role === "admin" ? "Admin Control" : "Kasir Mode"}
                </span>
                <span>Register 01</span>
                <span>Shift Open</span>
              </div>
              <h1 className="mt-1 truncate text-lg font-black tracking-tight">Point of Sale Workspace</h1>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <span className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-950/10 bg-emerald-50 px-3 text-xs font-black text-emerald-800">
                <Wifi className="size-4" />
                Online
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800">
                <ReceiptText className="size-4" />
                Sales Ready
              </span>
              <span className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-950/10 bg-white px-3 text-xs font-black text-stone-700">
                <ShieldCheck className="size-4" />
                Role Guard
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-950 bg-emerald-950 px-3 text-sm font-black text-white lg:hidden"
            >
              <Menu className="size-4" />
              Menu
            </button>
          </div>
        </header>

        <main className="px-4 py-5 lg:px-7 lg:py-7">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
