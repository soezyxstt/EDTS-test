import { SignOutButton } from "@/components/auth/sign-out-button";
import { redirect } from "next/navigation";
import { getDemoSession, getSession } from "@/lib/auth-server";

export default async function ProfilePage() {
  const demo = await getDemoSession();
  const session = demo ? { user: demo } : await getSession();
  if (!session) redirect("/sign-in");

  return (
    <section className="container-wide flex-1 py-10 sm:py-14">
      <div className="surface-card max-w-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold">Akun</h1>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-[9rem_1fr]">
          <dt className="font-semibold">Nama</dt><dd>{session.user.name}</dd>
          <dt className="font-semibold">Email</dt><dd>{session.user.email}</dd>
          <dt className="font-semibold">Peran</dt><dd>{session.user.role}</dd>
        </dl>
        <div className="mt-6"><SignOutButton /></div>
      </div>
    </section>
  );
}
