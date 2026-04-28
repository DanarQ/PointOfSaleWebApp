import { PageHeader } from "@/components/app-shell/PageHeader";

const transactions = [
  { invoice: "INV-000001", status: "Completed", total: "Rp25.000", method: "Cash" },
  { invoice: "INV-000002", status: "Completed", total: "Rp50.000", method: "QRIS" },
  { invoice: "INV-000003", status: "Completed", total: "Rp75.000", method: "Debit" },
];

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Transactions"
        description="Riwayat transaksi untuk pengecekan shift. Role user dapat melihat aktivitas kasir tanpa membuka kontrol admin."
      />
      <section className="mt-5 overflow-hidden rounded-lg border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-emerald-950/10 bg-stone-50 px-4 py-3 text-xs font-black uppercase text-stone-500">
          <span>Invoice</span>
          <span>Total</span>
        </div>
        {transactions.map((transaction) => (
          <div
            className="flex items-center justify-between gap-4 border-b border-emerald-950/10 p-4 last:border-b-0 hover:bg-emerald-50/50"
            key={transaction.invoice}
          >
            <div>
              <p className="font-black text-emerald-950">{transaction.invoice}</p>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                {transaction.status} transaction - {transaction.method}
              </p>
            </div>
            <p className="font-black text-emerald-700">{transaction.total}</p>
          </div>
        ))}
      </section>
    </>
  );
}
