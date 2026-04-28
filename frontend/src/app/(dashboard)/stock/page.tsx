import { PageHeader } from "@/components/app-shell/PageHeader";

export default function StockPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Stock"
        description="Kontrol stok dan audit stock movement. Route ini disiapkan untuk role admin."
        action="Adjust Stock"
      />
      <section className="mt-5 border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-600">
          Stock movement controls will connect to backend stock APIs.
        </p>
      </section>
    </>
  );
}
