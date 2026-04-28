import { PageHeader } from "@/components/app-shell/PageHeader";

export default function PosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kasir"
        title="POS"
        description="Layar utama transaksi. Halaman ini disiapkan sebagai tujuan utama untuk role user setelah login."
        action="New Sale"
      />
      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-neutral-500">Product search</p>
          <div className="mt-4 h-12 border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
            Scan barcode atau cari produk
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Mie Instan", "Air Mineral", "Beras 5kg", "Kopi Sachet"].map((product) => (
              <button
                type="button"
                className="border border-neutral-200 p-4 text-left text-sm font-bold transition hover:border-neutral-950 hover:bg-neutral-50"
                key={product}
              >
                {product}
              </button>
            ))}
          </div>
        </div>
        <div className="border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black uppercase text-neutral-500">Cart</p>
          <div className="mt-6 border-y border-neutral-200 py-6 text-sm text-neutral-500">
            Belum ada item.
          </div>
          <div className="mt-5 flex items-center justify-between text-lg font-black">
            <span>Total</span>
            <span>Rp0</span>
          </div>
        </div>
      </section>
    </>
  );
}
