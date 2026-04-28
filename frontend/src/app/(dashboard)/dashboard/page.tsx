import { MetricGrid, PageHeader } from "@/components/app-shell/PageHeader";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Store Command"
        description="Ringkasan register, akses role, dan kesiapan operasional untuk shift kasir hari ini."
      />
      <MetricGrid
        metrics={[
          { label: "Shift status", value: "Open", note: "Register siap menerima transaksi" },
          { label: "Role guard", value: "Active", note: "Menu mengikuti akses login" },
          { label: "Mode", value: "Retail", note: "Workspace kasir dan admin toko" },
        ]}
      />
      <section className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
          <p className="text-xs font-black uppercase text-emerald-700">Register flow</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {["Login", "Scan Product", "Checkout"].map((step, index) => (
              <div className="rounded-md border border-emerald-950/10 bg-stone-50 p-3" key={step}>
                <p className="text-2xl font-black text-emerald-700">0{index + 1}</p>
                <p className="mt-2 text-sm font-black text-emerald-950">{step}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm shadow-amber-900/5">
          <p className="text-xs font-black uppercase text-amber-800">Operational note</p>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-950">
            Data transaksi real-time akan masuk setelah halaman checkout disambungkan ke endpoint backend.
          </p>
        </div>
      </section>
    </>
  );
}
