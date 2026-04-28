import { PageHeader } from "@/components/app-shell/PageHeader";

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Pengaturan toko, sistem, dan preferensi operasional. Route ini admin-only."
      />
      <section className="mt-5 border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-600">
          Settings placeholder for store configuration.
        </p>
      </section>
    </>
  );
}
