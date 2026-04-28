import { PageHeader } from "@/components/app-shell/PageHeader";

export default function ProductsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operasional"
        title="Products"
        description="Untuk Kasir, halaman ini menjadi product lookup. Admin nantinya bisa mendapat kontrol kelola produk dari role yang sama."
      />
      <section className="mt-5 grid gap-3 md:grid-cols-2">
        {["SKU-001", "SKU-002", "SKU-003", "SKU-004"].map((sku) => (
          <div className="border border-neutral-200 bg-white p-4 shadow-sm" key={sku}>
            <p className="text-xs font-black uppercase text-neutral-500">{sku}</p>
            <h3 className="mt-2 text-lg font-black">Sample Product</h3>
            <p className="mt-2 text-sm text-neutral-600">Harga dan stok akan ditarik dari backend produk.</p>
          </div>
        ))}
      </section>
    </>
  );
}
