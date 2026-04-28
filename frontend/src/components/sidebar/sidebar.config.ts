import { UserRole } from "@/types/auth";

export type SidebarSection = "utama" | "operasional" | "kontrol";

export type SidebarItem = {
  label: string;
  href: string;
  roles: UserRole[];
  section: SidebarSection;
  description?: string;
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "user"],
    section: "utama",
    description: "Ringkasan shift dan aktivitas toko",
  },
  {
    label: "POS",
    href: "/pos",
    roles: ["admin", "user"],
    section: "utama",
    description: "Layar transaksi kasir",
  },
  {
    label: "Transactions",
    href: "/transactions",
    roles: ["admin", "user"],
    section: "operasional",
    description: "Riwayat transaksi penjualan",
  },
  {
    label: "Products",
    href: "/products",
    roles: ["admin", "user"],
    section: "operasional",
    description: "Katalog produk dan pencarian harga",
  },
  {
    label: "Categories",
    href: "/categories",
    roles: ["admin"],
    section: "kontrol",
    description: "Kelola kategori produk",
  },
  {
    label: "Stock",
    href: "/stock",
    roles: ["admin"],
    section: "kontrol",
    description: "Pergerakan dan penyesuaian stok",
  },
  {
    label: "Reports",
    href: "/reports",
    roles: ["admin"],
    section: "kontrol",
    description: "Laporan penjualan dan performa",
  },
  {
    label: "Users",
    href: "/users",
    roles: ["admin"],
    section: "kontrol",
    description: "Akun dan hak akses staf",
  },
  {
    label: "Settings",
    href: "/settings",
    roles: ["admin"],
    section: "kontrol",
    description: "Pengaturan toko dan sistem",
  },
];

export const sectionLabels: Record<SidebarSection, string> = {
  utama: "Utama",
  operasional: "Operasional",
  kontrol: "Kontrol Admin",
};

export function getSidebarItemsForRole(role: UserRole) {
  return sidebarItems.filter((item) => item.roles.includes(role));
}

export function canAccessPath(pathname: string, role: UserRole) {
  const route = sidebarItems.find((item) => item.href === pathname);

  if (!route) {
    return true;
  }

  return route.roles.includes(role);
}
