import { PageHeader } from "@/components/app-shell/PageHeader";

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Kelola akun staf dan role akses aplikasi POS. Route ini admin-only."
        action="Invite User"
      />
      <section className="mt-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5">
        <p className="text-sm font-bold text-stone-600">
          User management placeholder for auth administration.
        </p>
      </section>
    </>
  );
}
