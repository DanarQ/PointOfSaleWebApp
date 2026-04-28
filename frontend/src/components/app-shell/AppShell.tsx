"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { canAccessPath, getSidebarItemsForRole } from "@/components/sidebar/sidebar.config";
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

  const visibleItems = useMemo(() => {
    if (!auth) {
      return [];
    }

    return getSidebarItemsForRole(auth.user.role);
  }, [auth]);

  function handleLogout() {
    clearStoredAuth();
    router.replace("/");
  }

  if (!auth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 text-neutral-950">
        <div className="border border-neutral-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm">
          Preparing workspace...
        </div>
      </main>
    );
  }

  if (!canAccessPath(pathname, auth.user.role)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-5 text-neutral-950">
        <div className="max-w-md border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase text-neutral-500">Access blocked</p>
          <h1 className="mt-3 text-2xl font-black">Redirecting to dashboard</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Akun kasir tidak punya akses ke halaman kontrol admin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:block">
        <Sidebar email={auth.user.email} role={auth.user.role} onLogout={handleLogout} />
      </div>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-950/40"
            aria-label="Close sidebar"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw]">
            <Sidebar
              email={auth.user.email}
              role={auth.user.role}
              onLogout={handleLogout}
              onNavigate={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-neutral-500">
                {auth.user.role === "admin" ? "Admin Control" : "Kasir Mode"}
              </p>
              <h1 className="text-lg font-black tracking-tight">Point of Sale</h1>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="h-10 border border-neutral-950 px-3 text-sm font-bold lg:hidden"
            >
              Menu
            </button>
          </div>
        </header>

        <main className="px-4 py-5 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">
            {children}

            <section className="mt-8 border border-neutral-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-neutral-500">Visible controls</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {visibleItems.map((item) => (
                  <span
                    className="border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-700"
                    key={item.href}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
