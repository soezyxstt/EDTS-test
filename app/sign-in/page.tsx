import Image from "next/image";
import { SignInButton } from "@/components/auth/sign-in-button";
import { DemoAccess } from "@/components/demo-access";

function safeCallbackURL(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string }>;
}) {
  const { callbackURL } = await searchParams;
  return (
    <section className="container-wide flex flex-1 items-center py-8 sm:py-12">
      <div className="surface-card mx-auto grid w-full max-w-5xl overflow-hidden md:grid-cols-2">
        <div className="relative flex min-h-64 flex-col justify-end overflow-hidden bg-foreground text-white sm:min-h-80 md:min-h-[460px]">
          <Image
            src="/images/mcd-foods.webp"
            alt=""
            fill
            preload
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="relative z-10 p-6 sm:p-9">
            <h1 className="max-w-md text-3xl font-bold tracking-tight sm:text-4xl">Mulai pengajuan Anda</h1>
          </div>
        </div>
        <div className="flex flex-col justify-center bg-gradient-to-br from-white via-[#fffdf7] to-[#fff3ce] p-6 sm:p-9">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Akses portal franchise</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Kelola pengajuan sebagai pemohon atau tinjau aplikasi sebagai franchisor.
            </p>
          </div>
          <SignInButton callbackURL={safeCallbackURL(callbackURL)} />
          <DemoAccess callbackURL={safeCallbackURL(callbackURL)} />
        </div>
      </div>
    </section>
  );
}
