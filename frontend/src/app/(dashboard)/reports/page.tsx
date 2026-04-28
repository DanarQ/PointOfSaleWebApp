import { PageHeader } from "@/components/app-shell/PageHeader";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Reports"
        description="Laporan penjualan, performa produk, dan ringkasan kas. Route ini admin-only."
      />
      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {["Sales", "Payments", "Products"].map((report) => (
          <div className="rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5" key={report}>
            <p className="text-xs font-black uppercase text-emerald-700">{report}</p>
            <p className="mt-3 text-sm font-bold text-stone-600">
              Report placeholder for admin analytics.
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
