import { PageHeader } from "@/components/app-shell/PageHeader";

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Categories"
        description="Kontrol kategori produk. Route ini admin-only dan akan mengarahkan akun Kasir kembali ke dashboard."
        action="Add Category"
      />
      <section className="mt-5 border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-600">
          Category management placeholder for admin workflow.
        </p>
      </section>
    </>
  );
}
