"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DEMO_PROGRAMS, readDemoPrograms, type FranchiseProgram } from "@/lib/demo-data";
import { Button } from "@/components/ui/button";

export default function ProgramDirectory() {
  const [programs, setPrograms] = useState<FranchiseProgram[]>(DEMO_PROGRAMS);

  useEffect(() => {
    const refresh = () => setPrograms(readDemoPrograms());
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("franchise-prototype:update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("franchise-prototype:update", refresh);
    };
  }, []);

  const openPrograms = programs.filter((program) => program.open);

  return (
    <>
      <section className="landing-hero border-b border-border">
        <div className="container-wide grid gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12 lg:py-14">
          <div>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
              Temukan peluang untuk tumbuh bersama.
            </h1>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="secondary" nativeButton={false} render={<Link href="#programs" />}>Lihat program</Button>
              <Button variant="outline" nativeButton={false} render={<Link href="/applications" />}>Lihat aplikasi saya</Button>
            </div>
          </div>
          <div className="relative aspect-[16/10] min-h-64 overflow-hidden rounded-md border border-border bg-white shadow-sm">
            <Image
              src="/images/mcd-foods-2.avif"
              alt="Pilihan menu McDonald's"
              fill
              preload
              sizes="(max-width: 900px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <section id="programs" className="container-wide py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Program yang tersedia</h2>
        </div>

        {openPrograms.length ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {openPrograms.map((program) => (
              <article key={program.id} className="surface-card flex flex-col border-t-4 border-t-secondary p-6 sm:p-8">
                <h3 className="text-2xl font-bold leading-tight">{program.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{program.summary}</p>
                <dl className="mt-6 grid gap-4 border-y border-border py-5 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Model kemitraan</dt>
                    <dd className="mt-1 text-sm font-semibold">{program.operatingModel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Area</dt>
                    <dd className="mt-1 text-sm font-semibold">{program.locations}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Informasi investasi</dt>
                    <dd className="mt-1 text-sm font-semibold">{program.investmentLabel}</dd>
                  </div>
                </dl>
                <div className="mt-6">
                  <Button
                    nativeButton={false}
                    render={<Link href={{ pathname: "/sign-in", query: { callbackURL: `/apply/${program.id}` } }} />}
                  >
                    Mulai pengajuan
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="surface-card mt-7 p-8 text-sm text-muted-foreground">Belum ada program pengajuan yang dibuka.</div>
        )}
      </section>

      <section id="alur" className="landing-process">
        <div className="container-wide grid gap-6 py-10 sm:py-14 lg:grid-cols-[1fr_1fr]">
          <div className="relative min-h-64 overflow-hidden rounded-md border border-white/70 bg-muted shadow-sm sm:min-h-80">
            <Image
              src="/images/front-of-mcdonalds-building.jpg"
              alt="Restoran McDonald's"
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <aside className="surface-card p-6 shadow-sm sm:p-8" aria-label="Cara kerja pengajuan">
            <h2 className="text-2xl font-bold tracking-tight">Cara kerja</h2>
            <ol className="mt-5 divide-y divide-border">
              {[
                ["01", "Pilih program"],
                ["02", "Lengkapi informasi"],
                ["03", "Pantau status"],
              ].map(([number, title]) => (
                <li key={number} className="grid grid-cols-[42px_1fr] gap-3 py-4 first:pt-0 last:pb-0">
                  <span className="pt-0.5 text-sm font-bold text-primary">{number}</span>
                  <h3 className="text-sm font-bold">{title}</h3>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>
    </>
  );
}
