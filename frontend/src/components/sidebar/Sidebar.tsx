"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingCart,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
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

const itemIcons: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/pos": ShoppingCart,
  "/transactions": ReceiptText,
  "/products": Boxes,
  "/categories": Tags,
  "/stock": Boxes,
  "/reports": BarChart3,
  "/users": Users,
  "/settings": Settings,
};

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
  const Icon = itemIcons[item.href] ?? ReceiptText;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`group flex min-h-11 items-center justify-between rounded-md border px-3 py-2 text-sm font-bold transition ${
        isActive
          ? "border-emerald-400/30 bg-emerald-500 text-emerald-950 shadow-sm shadow-emerald-950/20"
          : "border-transparent text-emerald-50/70 hover:border-white/10 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </span>
      <span className={`h-2 w-2 rounded-full transition ${isActive ? "bg-emerald-950" : "bg-white/20 group-hover:bg-emerald-300"}`} aria-hidden="true" />
    </Link>
  );
}

export function Sidebar({ role, email, onNavigate, onLogout }: SidebarProps) {
  const items = getSidebarItemsForRole(role);

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-emerald-950 text-white">
      <div className="border-b border-white/10 p-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 text-xl font-black tracking-tight"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-sm text-emerald-950">
            POS
          </span>
          <span>Checkout Control</span>
        </Link>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/10 p-3">
          <p className="text-[11px] font-black uppercase text-emerald-200">Register status</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-sm font-black">Open Shift</span>
            <span className="rounded-md bg-emerald-400 px-2 py-1 text-[11px] font-black text-emerald-950">
              READY
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sectionOrder.map((section) => {
          const sectionItems = items.filter((item) => item.section === section);

          if (sectionItems.length === 0) {
            return null;
          }

          return (
            <div className="mb-6" key={section}>
              <p className="mb-2 px-3 text-[11px] font-black uppercase text-emerald-200/70">
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

      <div className="border-t border-white/10 p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-xs font-black text-emerald-950">
            {getInitials(email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{email}</p>
            <p className="text-xs font-bold text-emerald-200">{getRoleLabel(role)} Workspace</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="h-10 w-full rounded-md border border-white/15 bg-white/10 px-3 text-sm font-black text-white transition hover:border-emerald-300 hover:bg-emerald-500 hover:text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-emerald-950"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
