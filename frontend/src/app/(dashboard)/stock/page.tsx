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
      <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm shadow-amber-900/5">
        <p className="text-sm font-bold text-amber-950">
          Stock movement controls will connect to backend stock APIs.
        </p>
      </section>
    </>
  );
}
