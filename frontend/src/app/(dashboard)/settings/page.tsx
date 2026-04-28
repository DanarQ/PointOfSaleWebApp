import { PageHeader } from "@/components/app-shell/PageHeader";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Pengaturan toko, sistem, dan preferensi operasional. Route ini admin-only."
      />
      <section className="mt-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <p className="text-sm font-bold text-stone-600">
          Settings placeholder for store configuration.
        </p>
      </section>
    </>
  );
}
