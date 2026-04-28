import { MetricGrid, PageHeader } from "@/components/app-shell/PageHeader";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="Ringkasan awal untuk shift kasir dan kontrol toko. Data real-time bisa disambungkan ke backend POS berikutnya."
      />
      <MetricGrid
        metrics={[
          { label: "Shift status", value: "Open", note: "Siap menerima transaksi" },
          { label: "Role guard", value: "On", note: "Menu mengikuti role login" },
          { label: "Mode", value: "Kasir", note: "Role user tampil sebagai Kasir" },
        ]}
      />
    </>
  );
}
