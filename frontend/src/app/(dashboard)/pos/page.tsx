import { PageHeader } from "@/components/app-shell/PageHeader";

const products = [
  { name: "Mie Instan", price: "Rp3.500", stock: "128 pcs" },
  { name: "Air Mineral", price: "Rp4.000", stock: "86 pcs" },
  { name: "Beras 5kg", price: "Rp72.000", stock: "24 sak" },
  { name: "Kopi Sachet", price: "Rp1.500", stock: "210 pcs" },
  { name: "Gula 1kg", price: "Rp17.000", stock: "38 pcs" },
  { name: "Telur 1kg", price: "Rp29.000", stock: "19 tray" },
];

export default function PosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kasir"
        title="POS"
        description="Layar utama register untuk scan produk, susun cart, dan checkout. Integrasi transaksi real akan masuk pada tahap berikutnya."
        action="New Sale"
      />
      <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-emerald-700">Product lookup</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-emerald-950">Scan or search item</h3>
            </div>
            <span className="rounded-md bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
              Barcode mode
            </span>
          </div>
          <div className="mt-4 flex h-14 items-center rounded-lg border-2 border-emerald-700 bg-emerald-50 px-4 text-sm font-black text-emerald-900">
            Scan barcode atau cari produk
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <button
                type="button"
                className="rounded-lg border border-emerald-950/10 bg-stone-50 p-4 text-left transition hover:border-emerald-600 hover:bg-emerald-50 hover:shadow-sm"
                key={product.name}
              >
                <span className="block text-sm font-black text-emerald-950">{product.name}</span>
                <span className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-black text-emerald-700">{product.price}</span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-stone-500">
                    {product.stock}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
          <div className="border-b border-emerald-950/10 p-4">
            <p className="text-xs font-black uppercase text-emerald-700">Current sale</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-emerald-950">Cart</h3>
          </div>
          <div className="p-4">
            <div className="rounded-lg border border-dashed border-emerald-950/20 bg-stone-50 px-4 py-10 text-center">
              <p className="text-sm font-black text-emerald-950">Belum ada item.</p>
              <p className="mt-2 text-xs font-semibold text-stone-500">
                Pilih produk dari grid untuk mulai transaksi.
              </p>
            </div>
            <div className="mt-4 space-y-2 text-sm font-bold">
              <div className="flex items-center justify-between text-stone-600">
                <span>Subtotal</span>
                <span>Rp0</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Discount</span>
                <span>Rp0</span>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-950/10 pt-3 text-2xl font-black text-emerald-950">
                <span>Total</span>
                <span>Rp0</span>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-5 h-12 w-full rounded-md bg-emerald-700 px-4 text-sm font-black text-white opacity-60"
            >
              Checkout belum tersedia
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
