"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  readDemoPrograms,
  writeDemoPrograms,
  type FranchiseProgram,
} from "@/lib/demo-data";

export default function ProgramList() {
  const router = useRouter();
  const [programs, setPrograms] = useState<FranchiseProgram[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setPrograms(readDemoPrograms());
      setReady(true);
    };
    refresh();
    window.addEventListener("franchise-prototype:update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("franchise-prototype:update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function addProgram() {
    const id = `program-${crypto.randomUUID().slice(0, 8)}`;
    const program: FranchiseProgram = {
      id,
      name: "Program baru",
      summary: "",
      investmentLabel: "Dibahas bersama tim",
      operatingModel: "",
      locations: "Indonesia",
      open: false,
      fields: [
        { id: "fullName", label: "Nama lengkap", type: "text", required: true },
        { id: "email", label: "Alamat email", type: "email", required: true },
      ],
      screeningRules: [],
    };
    const next = [...readDemoPrograms(), program];
    writeDemoPrograms(next);
    router.push(`/manage/programs/${id}`);
  }

  function deleteProgram(program: FranchiseProgram) {
    const confirmed = window.confirm(
      `Hapus program “${program.name}” dari daftar? Aplikasi yang sudah dikirim tetap tersimpan.`,
    );
    if (!confirmed) return;
    const next = readDemoPrograms().filter((item) => item.id !== program.id);
    writeDemoPrograms(next);
    setPrograms(next);
  }

  return (
    <section className="container-wide py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">Program</h1>
        </div>
        <Button className="w-full sm:w-auto" onClick={addProgram} type="button">
          Tambah program
        </Button>
      </div>

      {!ready ? (
        <p className="py-10 text-sm text-[var(--text-muted)]">Memuat program…</p>
      ) : programs.length === 0 ? (
        <div className="surface-card px-6 py-10 text-center">
          <h2 className="text-lg font-bold">Belum ada program</h2>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {programs.map((program) => (
            <article className="surface-card flex min-w-0 flex-col border-t-4 border-t-[var(--mcd-yellow)] p-5 sm:p-6" key={program.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-bold leading-snug">{program.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{program.summary}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-[var(--ink)]">
                  <span className={`size-2 ${program.open ? "bg-[var(--mcd-yellow)]" : "bg-[var(--mcd-red)]"}`} aria-hidden="true" />
                  {program.open ? "Pendaftaran dibuka" : "Pendaftaran ditutup"}
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px border border-[var(--line)] bg-[var(--line)] text-sm">
                <div className="bg-[var(--surface-muted)] px-4 py-3">
                  <dt className="text-xs text-[var(--text-muted)]">Bidang formulir</dt>
                  <dd className="mt-1 text-xl font-bold">{program.fields.length}</dd>
                </div>
                <div className="bg-[var(--surface-muted)] px-4 py-3">
                  <dt className="text-xs text-[var(--text-muted)]">Aturan pemeriksaan</dt>
                  <dd className="mt-1 text-xl font-bold">{program.screeningRules.filter((rule) => rule.enabled).length}<span className="ml-1 text-xs font-semibold text-[var(--text-muted)]">aktif</span></dd>
                </div>
              </dl>
              <div className="mt-auto flex flex-wrap justify-end gap-3 border-t border-[var(--line)] pt-4">
                <Button
                  aria-label={`Hapus ${program.name}`}
                  className="h-auto px-1 text-sm text-primary underline underline-offset-4"
                  variant="link"
                  onClick={() => deleteProgram(program)}
                  type="button"
                >
                  Hapus
                </Button>
                <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/manage/programs/${program.id}`} />}>Atur program</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
