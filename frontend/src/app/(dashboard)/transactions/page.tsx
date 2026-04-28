import { PageHeader } from "@/components/app-shell/PageHeader";

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Transactions"
        description="Riwayat transaksi untuk pengecekan shift. Role user dapat melihat aktivitas kasir tanpa membuka kontrol admin."
      />
      <section className="mt-5 border border-neutral-200 bg-white shadow-sm">
        {["INV-000001", "INV-000002", "INV-000003"].map((invoice, index) => (
          <div
            className="flex items-center justify-between border-b border-neutral-200 p-4 last:border-b-0"
            key={invoice}
          >
            <div>
              <p className="font-black">{invoice}</p>
              <p className="mt-1 text-sm text-neutral-500">Completed transaction</p>
            </div>
            <p className="font-black">Rp{(index + 1) * 25000}</p>
          </div>
        ))}
      </section>
    </>
  );
}
