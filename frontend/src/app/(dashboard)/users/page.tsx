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
      <section className="mt-5 border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-600">
          User management placeholder for auth administration.
        </p>
      </section>
    </>
  );
}
