"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { APPLICATION_STAGES, hasRemoteWorkspace, readDemoApplications, type FranchiseApplication } from "@/lib/demo-data";
import { readWorkspaceIdentity } from "@/lib/demo-session";

function stageLabel(stage: FranchiseApplication["stage"]) {
  return APPLICATION_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

function submittedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function ApplicationList() {
  const [applications, setApplications] = useState<FranchiseApplication[]>([]);
  const [identityRole, setIdentityRole] = useState(readWorkspaceIdentity().role);

  useEffect(() => {
    const refresh = () => {
      const identity = readWorkspaceIdentity();
      setIdentityRole(identity.role);
      setApplications(identity.role === "applicant"
        ? hasRemoteWorkspace() ? readDemoApplications() : readDemoApplications().filter((application) => application.applicantIdentityId === identity.id || (!application.applicantIdentityId && application.email.toLowerCase() === identity.email.toLowerCase()))
        : []);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("franchise-prototype:update", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("franchise-prototype:update", refresh);
    };
  }, []);

  const revisions = applications.filter((application) => application.stage === "revision").length;
  const active = applications.filter((application) => !["approved", "rejected"].includes(application.stage)).length;

  return (
    <div className="container-wide py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Aplikasi saya</h1>
        </div>
        <Button className="w-fit" nativeButton={false} render={<Link href="/#programs" />}>Ajukan program</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Total pengajuan", applications.length],
          ["Sedang berjalan", active],
          ["Perlu revisi", revisions],
        ].map(([label, number]) => (
          <div key={label} className="surface-card flex items-center justify-between gap-4 p-4 sm:p-5">
            <span className="text-sm font-semibold text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold tabular-nums">{number}</span>
          </div>
        ))}
      </div>

      {applications.length ? (
        <div className="mt-4 divide-y divide-border border-y border-border">
          {[...applications].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).map((application) => (
            <article key={application.id} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs font-bold tracking-wide text-muted-foreground">{application.reference}</p>
                  <span className="hidden h-1 w-1 bg-secondary sm:block" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">Diajukan {submittedDate(application.submittedAt)}</p>
                </div>
                <h3 className="mt-2 text-lg font-bold">{application.programName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{application.applicantName} · {application.city || "Lokasi belum ditentukan"}</p>
                <p className="mt-3 text-sm"><span className="font-bold">Status:</span> {application.withdrawnAt ? "Dibatalkan oleh pemohon" : stageLabel(application.stage)}</p>
                {application.stage === "revision" && application.revisionItems.length ? (
                  <p className="mt-2 text-sm font-semibold text-primary">Ada {application.revisionItems.length} informasi yang perlu diperbarui.</p>
                ) : null}
                {application.proposal ? <p className="mt-2 text-sm font-semibold">Proposal tersedia untuk ditinjau.</p> : null}
              </div>
              <Button className="w-full sm:w-fit" variant="secondary" nativeButton={false} render={<Link href={`/applications/${application.id}`} />}>Buka pengajuan</Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface-card mt-5 p-7 sm:p-9">
          <h3 className="text-lg font-bold">{identityRole === "applicant" ? "Belum ada pengajuan" : "Pilih akun pemohon"}</h3>
          {identityRole === "franchisor" ? <p className="mt-2 text-sm text-muted-foreground">Mulai demo pemohon untuk melihat aplikasi.</p> : null}
        </div>
      )}
    </div>
  );
}
