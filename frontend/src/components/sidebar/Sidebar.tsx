"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole, getRoleLabel } from "@/types/auth";
import {
  SidebarItem,
  getSidebarItemsForRole,
  sectionLabels,
} from "@/components/sidebar/sidebar.config";

type SidebarProps = {
  role: UserRole;
  email: string;
  onNavigate?: () => void;
  onLogout: () => void;
};

const sectionOrder = ["utama", "operasional", "kontrol"] as const;

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function SidebarLink({
  item,
  onNavigate,
}: {
  item: SidebarItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex min-h-12 items-center justify-between border px-3 py-2 text-sm font-semibold transition ${
        isActive
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-transparent text-neutral-700 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-950"
      }`}
    >
      <span>{item.label}</span>
      <span
        className={`h-2 w-2 rounded-full transition ${
          isActive ? "bg-white" : "bg-neutral-300 group-hover:bg-neutral-950"
        }`}
        aria-hidden="true"
      />
    </Link>
  );
}

export function Sidebar({ role, email, onNavigate, onLogout }: SidebarProps) {
  const items = getSidebarItemsForRole(role);

  return (
    <aside className="flex h-full w-full flex-col border-r border-neutral-200 bg-white text-neutral-950">
      <div className="border-b border-neutral-200 p-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="block text-xl font-black tracking-tight"
        >
          POS Control
        </Link>
        <p className="mt-2 text-xs font-semibold uppercase text-neutral-500">
          {getRoleLabel(role)} Workspace
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sectionOrder.map((section) => {
          const sectionItems = items.filter((item) => item.section === section);

          if (sectionItems.length === 0) {
            return null;
          }

          return (
            <div className="mb-6" key={section}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase text-neutral-400">
                {sectionLabels[section]}
              </p>
              <div className="space-y-1">
                {sectionItems.map((item) => (
                  <SidebarLink item={item} key={item.href} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-neutral-950 text-xs font-black text-white">
            {getInitials(email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{email}</p>
            <p className="text-xs font-medium text-neutral-500">{getRoleLabel(role)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 w-full border border-neutral-950 bg-white px-3 text-sm font-bold text-neutral-950 transition hover:bg-neutral-950 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-2"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
