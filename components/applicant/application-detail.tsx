"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPLICATION_STAGES, readDemoApplications, readDemoPrograms, updateDemoApplication, type FranchiseApplication, type ProgramField } from "@/lib/demo-data";
import { canApply, readWorkspaceIdentity } from "@/lib/demo-session";
import { saveDemoFiles, type PendingDemoFile } from "@/lib/demo-files";
import { DemoFileLink } from "@/components/demo-file-link";
import { CommunicationPanel } from "@/components/communication-panel";
import { LocationPicker } from "@/components/applicant/location-picker";
import { googleMapsUrl, parseMapPoint } from "@/lib/location";

const FLOW = ["submitted", "screening", "review", "revision", "interview", "proposal", "approved"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "zip"]);

function fileError(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_FILE_EXTENSIONS.has(extension)) return "Gunakan PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, atau ZIP.";
  if (file.size > MAX_FILE_SIZE) return "Ukuran setiap berkas maksimal 10 MB.";
  return "";
}

function stageLabel(stage: FranchiseApplication["stage"]) {
  return APPLICATION_STAGES.find((item) => item.id === stage)?.label ?? stage;
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Tanggal tidak tersedia" : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function words(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(badan usaha|bisnis|business|perusahaan)\b/g, " company ")
    .replace(/\b(profil|profile|cv)\b/g, " profile ")
    .replace(/\b(finansial|keuangan|financial)\b/g, " finance ")
    .replace(/\b(lokasi|site|alamat)\b/g, " location ")
    .replace(/\b(foto|photos?)\b/g, " photo ")
    .replace(/\b(pengalaman)\b/g, " experience ")
    .replace(/\b(ringkasan)\b/g, " summary ")
    .replace(/\b(unggah|upload|perbarui|lengkapi|perbaiki|revisi|informasi|dokumen|berkas|pendukung|wajib|yang|untuk|terbaru)\b/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function matchScore(label: string, candidate: string) {
  const request = new Set(words(label));
  return [...new Set(words(candidate))].filter((word) => request.has(word)).length;
}

function isFileRevision(label: string) {
  return /unggah|upload|dokumen|profil|finansial|foto|berkas|file/i.test(label);
}

function resolveRevisionField(label: string, index: number, application: FranchiseApplication, fields: ProgramField[]) {
  const requestedId = application.revisionFieldIds?.[index];
  if (requestedId) {
    return fields.find((field) => field.id === requestedId) ?? {
      id: requestedId,
      label,
      type: isFileRevision(label) ? "file" as const : "textarea" as const,
      required: true,
    };
  }

  const exact = fields.find((field) => field.label.toLowerCase() === label.toLowerCase());
  if (exact) return exact;
  const requestedFiles = isFileRevision(label);
  const candidates = fields.filter((field) => (field.type === "file") === requestedFiles);
  const match = candidates
    .map((field) => ({ field, score: matchScore(label, `${field.id} ${field.label}`) }))
    .sort((left, right) => right.score - left.score)[0];
  if (match?.score) return match.field;

  const answerKey = Object.keys(application.answers)
    .map((id) => ({ id, score: matchScore(label, id) }))
    .sort((left, right) => right.score - left.score)[0];
  if (answerKey?.score) return {
    id: answerKey.id,
    label,
    type: requestedFiles ? "file" as const : "textarea" as const,
    required: true,
  };
  return undefined;
}

function groupFields(fields: ProgramField[]) {
  const groups = new Map<string, ProgramField[]>();
  fields.forEach((field) => {
    const section = field.section?.trim() ?? "";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return [...groups.entries()];
}

export default function ApplicationDetail({ applicationId }: { applicationId: string }) {
  const [application, setApplication] = useState<FranchiseApplication | null>(null);
  const [programFields, setProgramFields] = useState<ProgramField[]>([]);
  const [revisionValues, setRevisionValues] = useState<Record<string, string>>({});
  const [revisionFiles, setRevisionFiles] = useState<Record<string, File>>({});
  const [revisionErrors, setRevisionErrors] = useState<Record<string, string>>({});
  const [savingRevision, setSavingRevision] = useState(false);
  const [proposalNote, setProposalNote] = useState("");
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const identity = readWorkspaceIdentity();
      const candidate = readDemoApplications().find((item) => item.id === applicationId);
      const item = candidate && canApply(identity) && (candidate.applicantIdentityId
        ? candidate.applicantIdentityId === identity.id
        : candidate.email.toLowerCase() === identity.email.toLowerCase()) ? candidate : null;
      setApplication(item);
      setProgramFields(item ? readDemoPrograms().find((program) => program.id === item.programId)?.fields ?? [] : []);
    };
    const initialize = () => {
      refresh();
      setReady(true);
    };
    const timer = window.setTimeout(initialize, 0);
    window.addEventListener("storage", refresh);
    window.addEventListener("franchise-prototype:update", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("franchise-prototype:update", refresh);
    };
  }, [applicationId]);

  function setRevisionValue(key: string, value: string) {
    setRevisionValues((current) => ({ ...current, [key]: value }));
    setRevisionErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setNotice("");
  }

  async function submitRevision() {
    if (!application || savingRevision) return;
    const revisions = application.revisionItems.map((label, index) => {
      const field = resolveRevisionField(label, index, application, programFields);
      return { field, key: application.revisionFieldIds?.[index] ?? field?.id ?? `legacy-${index}` };
    }).filter((revision) => revision.field);
    if (!revisions.length) {
      setNotice("Tidak ada kolom revisi yang dapat diperbarui.");
      return;
    }
    const errors: Record<string, string> = {};
    revisions.forEach(({ field, key }) => {
      if (!field) return;
      const value = revisionValues[key] ?? (field.type !== "file" ? application.answers[field.id] ?? "" : "");
      if (field.required && ((field.type as string) === "checkbox" ? value !== "true" : !value.trim())) errors[key] = `${field.label} wajib diisi.`;
      if (field.type === "file" && !revisionFiles[key]) errors[key] = "Pilih berkas pengganti.";
      if (field.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) errors[key] = "Pilih tanggal yang valid.";
      if (field.type === "location" && value && !parseMapPoint(value)) errors[key] = "Pilih titik lokasi yang valid di peta.";
      if (["ktp", "npwp", "nib"].includes(field.id) && value && /\D/.test(value)) errors[key] = "Masukkan angka saja.";
      if (field.id === "siteArea" && value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) errors[key] = "Masukkan luas lebih dari 0 m².";
    });
    if (Object.keys(errors).length) {
      setRevisionErrors(errors);
      setNotice("Lengkapi setiap informasi revisi sebelum mengirim.");
      return;
    }

    setSavingRevision(true);
    const pendingFiles: PendingDemoFile[] = revisions.flatMap(({ field, key }) => field?.type === "file" && revisionFiles[key]
      ? [{ fieldId: field.id, file: revisionFiles[key] }]
      : []);
    try {
      await saveDemoFiles(application.id, pendingFiles);
    } catch (error) {
      setNotice(error instanceof Error ? `Berkas belum tersimpan. ${error.message}` : "Berkas belum tersimpan. Coba lagi.");
      setSavingRevision(false);
      return;
    }

    const answers = { ...application.answers };
    const documents = application.documents.map((document) => ({
      ...document,
      fieldId: document.fieldId
        ?? programFields.find((field) => field.type === "file" && application.answers[field.id] === document.name)?.id
        ?? programFields.filter((field) => field.type === "file")
          .map((field) => ({ field, score: matchScore(`${field.id} ${field.label}`, document.name) }))
          .sort((left, right) => right.score - left.score)[0]?.field.id,
    }));
    revisions.forEach(({ field, key }) => {
      if (!field) return;
      if (field.type !== "file") {
        answers[field.id] = revisionValues[key] === undefined ? answers[field.id] ?? "" : revisionValues[key].trim();
        return;
      }
      const value = revisionFiles[key].name;
      answers[field.id] = value;
      const existingIndex = documents.findIndex((document) => document.fieldId === field.id);
      const replacement = { fieldId: field.id, name: value, status: "received" as const };
      if (existingIndex >= 0) documents[existingIndex] = replacement;
      else documents.push(replacement);
    });

    const updated = updateDemoApplication(application.id, { answers, documents, revisionItems: [], revisionFieldIds: [], revisionNotes: [], stage: "review" });
    if (updated) {
      setApplication(updated);
      setRevisionValues({});
      setRevisionFiles({});
      setRevisionErrors({});
      setNotice("Revisi terkirim. Pengajuan kembali ke tahap peninjauan.");
    } else setNotice("Revisi tidak dapat disimpan. Muat kembali halaman dan coba lagi.");
    setSavingRevision(false);
  }

  function respondToProposal(response: "accepted" | "rejected" | "changes-requested") {
    if (!application?.proposal) return;
    if (response === "changes-requested" && !proposalNote.trim()) {
      setNotice("Tuliskan bagian proposal yang ingin dibahas kembali.");
      return;
    }
    const answers = response === "changes-requested" ? { ...application.answers, proposalChangeRequest: proposalNote.trim() } : application.answers;
    const mutuallyApproved = response === "accepted" && application.proposal.franchisorResponse === "accepted";
    const stage = response === "accepted" ? (mutuallyApproved ? "approved" : application.stage) : response === "rejected" ? "rejected" : application.stage;
    const updated = updateDemoApplication(application.id, {
      stage,
      answers,
      proposal: { ...application.proposal, response },
    });
    if (updated) {
      setApplication(updated);
      setNotice(response === "accepted" ? (mutuallyApproved ? "Kedua pihak menyetujui proposal." : "Respons tersimpan. Menunggu persetujuan franchisor.") : response === "rejected" ? "Proposal ditolak dan pengajuan ditutup dalam prototipe." : "Permintaan pembahasan ulang tersimpan dalam prototipe.");
    } else setNotice("Respons tidak dapat disimpan. Muat kembali halaman dan coba lagi.");
  }

  if (!ready) return <div className="container-wide py-12" aria-busy="true">Memuat pengajuan…</div>;

  if (!application) {
    return (
      <div className="container-wide py-10 sm:py-14">
        <div className="surface-card max-w-2xl p-7 sm:p-9">
          <h1 className="text-2xl font-bold">Aplikasi tidak ditemukan</h1>
          <p className="mt-2 text-sm text-muted-foreground">Data tidak ada di browser ini.</p>
          <Button className="mt-6 w-fit" nativeButton={false} render={<Link href="/applications" />}>Kembali ke aplikasi saya</Button>
        </div>
      </div>
    );
  }

  const currentIndex = FLOW.indexOf(application.stage as (typeof FLOW)[number]);
  const isClosed = application.stage === "rejected";
  const final = application.stage === "approved" || isClosed;
  const canWithdraw = !isClosed && application.stage !== "approved" && !application.proposal;
  const canRespond = application.stage === "proposal" && Boolean(application.proposal) && !["accepted", "rejected"].includes(application.proposal?.response ?? "");
  const revisionRows = application.revisionItems.map((label, index) => {
    const field = resolveRevisionField(label, index, application, programFields);
    return { label, field, key: application.revisionFieldIds?.[index] ?? field?.id ?? `legacy-${index}`, index };
  });
  const revisionNotes = [...(application.revisionNotes ?? []), ...revisionRows.filter((row) => !row.field).map((row) => row.label)];
  const detailGroups = groupFields(programFields.filter((field) => field.type !== "file"
    && Boolean(application.answers[field.id]?.trim())
    && (!field.condition || Boolean(application.answers[field.condition]?.trim()))));

  function withdrawApplication() {
    if (!application || !canWithdraw || !window.confirm("Batalkan pengajuan ini?")) return;
    const updated = updateDemoApplication(application.id, { stage: "rejected", withdrawnAt: new Date().toISOString() });
    if (updated) {
      setApplication(updated);
      setNotice("Pengajuan dibatalkan.");
    } else setNotice("Pengajuan tidak dapat dibatalkan. Muat ulang halaman dan coba lagi.");
  }

  return (
    <div className="container-wide py-8 sm:py-12">
      <Link className="text-link" href="/applications">Kembali ke aplikasi saya</Link>
      <div className="mt-5 flex flex-col justify-between gap-5 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">{application.reference}</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">{application.programName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Diajukan {dateLabel(application.submittedAt)}</p>
        </div>
        <div className="border-l-4 border-secondary pl-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Status saat ini</p>
          <p className="mt-1 text-lg font-bold">{application.withdrawnAt ? "Dibatalkan oleh pemohon" : stageLabel(application.stage)}</p>
          {canWithdraw ? <Button className="mt-3 h-auto px-0 text-destructive" variant="link" onClick={withdrawApplication} type="button">Batalkan pengajuan</Button> : null}
        </div>
      </div>

      {isClosed ? (
        <div className="mt-6 border-l-4 border-primary bg-muted p-4 sm:p-5" role="status">
          <h2 className="font-bold">{application.withdrawnAt ? "Pengajuan dibatalkan" : "Pengajuan ditutup"}</h2>
          {application.screening?.outcome === "reject" && application.screening.reasons.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{application.screening.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
        </div>
      ) : null}

      {application.stage === "approved" ? (
        <div className="mt-6 border-l-4 border-secondary bg-muted p-4 sm:p-5" role="status">
          <h2 className="font-bold">Proposal disetujui bersama</h2>
          <p className="mt-1 text-sm text-muted-foreground">Simulasi prototipe. Bukan kontrak.</p>
        </div>
      ) : null}

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0 space-y-7">
          <section className="surface-card p-5 sm:p-7">
            <h2 className="text-xl font-bold">Status pengajuan</h2>
            <ol className="mt-6 grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
              {FLOW.filter((stage) => stage !== "approved").map((stage, index) => {
                const active = application.stage === stage;
                const complete = !isClosed && (final || currentIndex > index);
                return (
                  <li key={stage} className="relative flex gap-3 border-l border-border pb-5 pl-4 last:pb-0 sm:min-h-[94px] sm:border-l-0 sm:border-t sm:pl-0 sm:pt-4">
                    <span className={`absolute -left-[5px] top-0 h-2.5 w-2.5 border sm:left-0 sm:top-[-5px] ${active ? "border-secondary bg-secondary" : complete ? "border-foreground bg-foreground" : "border-border bg-white"}`} aria-hidden="true" />
                    <div className="sm:pt-2">
                      <p className="text-sm font-bold">{stageLabel(stage)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{active ? "Sedang berjalan" : complete ? "Selesai" : "Belum dimulai"}</p>
                    </div>
                  </li>
                );
              })}
              {application.stage === "approved" ? (
                <li className="relative flex gap-3 border-l border-border pb-5 pl-4 sm:min-h-[94px] sm:border-l-0 sm:border-t sm:pl-0 sm:pt-4">
                  <span className="absolute -left-[5px] top-0 h-2.5 w-2.5 border border-secondary bg-secondary sm:left-0 sm:top-[-5px]" aria-hidden="true" />
                  <div className="sm:pt-2"><p className="text-sm font-bold">Disetujui</p><p className="mt-1 text-xs text-muted-foreground">Selesai</p></div>
                </li>
              ) : null}
              {isClosed ? <li className="relative border-l border-border pl-4 sm:border-l-0 sm:border-t sm:pl-0 sm:pt-4"><span className="absolute -left-[5px] top-0 h-2.5 w-2.5 border border-primary bg-primary sm:left-0 sm:top-[-5px]" aria-hidden="true" /><div className="sm:pt-2"><p className="text-sm font-bold">{application.withdrawnAt ? "Dibatalkan" : "Ditutup"}</p><p className="mt-1 text-xs text-muted-foreground">Proses berakhir</p></div></li> : null}
            </ol>
          </section>

          {application.stage === "revision" ? (
            <section className="surface-card border-t-4 border-t-secondary p-5 sm:p-7">
              <h2 className="text-xl font-bold">Permintaan revisi</h2>
              {application.revisionItems.length ? (
                <div className="mt-5 space-y-5">
                  {revisionNotes.length ? (
                    <div className="border-l-2 border-border pl-4">
                      <h3 className="text-sm font-bold">Catatan tim</h3>
                      <ul className="mt-2 space-y-1 text-sm leading-6">{revisionNotes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ul>
                    </div>
                  ) : null}
                  {revisionRows.map(({ label, field, key, index }) => {
                    if (!field) return null;
                    const id = `revision-${application.id}-${index}`;
                    const error = revisionErrors[key];
                    const value = revisionValues[key] ?? (field.type !== "file" ? application.answers[field.id] ?? "" : "");
                    const oldFile = field.type === "file"
                      ? application.answers[field.id] || application.documents.find((document) => matchScore(`${field.id} ${field.label}`, document.name) > 0)?.name
                      : undefined;
                    return (
                      <div key={key}>
                        <p className="mb-2 text-sm font-semibold">{label}</p>
                        {field.type === "file" ? (
                          <div>
                            <label className="field-label" htmlFor={id}>{field.label}</label>
                            <Input id={id} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => {
                              const file = event.currentTarget.files?.[0];
                              event.currentTarget.value = "";
                              if (!file) return;
                              const problem = fileError(file);
                              if (problem) {
                                setRevisionErrors((current) => ({ ...current, [key]: problem }));
                                setNotice(problem);
                                return;
                              }
                              setRevisionFiles((current) => ({ ...current, [key]: file }));
                              setRevisionValue(key, file.name);
                            }} />
                            <p className="mt-2 break-all text-sm text-muted-foreground">{revisionFiles[key]?.name || (oldFile ? `Berkas saat ini: ${oldFile}` : "Pilih berkas pengganti")}</p>
                          </div>
                        ) : field.type === "location" ? (
                          <>
                            <label className="field-label" htmlFor={id}>{field.label}</label>
                            <LocationPicker id={id} value={value} onChange={(next) => setRevisionValue(key, next)} invalid={Boolean(error)} describedBy={error ? `${id}-error` : undefined} />
                          </>
                        ) : field.type === "textarea" ? (
                          <>
                            <label className="field-label" htmlFor={id}>{field.label}</label>
                            <Textarea id={id} rows={3} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setRevisionValue(key, event.target.value)} />
                          </>
                        ) : field.type === "select" ? (
                          <>
                            <label className="field-label" htmlFor={id}>{field.label}</label>
                            <Select id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setRevisionValue(key, event.target.value)}>
                              <option value="">Pilih salah satu</option>
                              {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                            </Select>
                          </>
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-start gap-3">
                            <input id={id} className="mt-1 h-4 w-4 accent-secondary" type="checkbox" checked={value === "true"} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setRevisionValue(key, event.target.checked ? "true" : "")} />
                            <label htmlFor={id} className="text-sm leading-6">{field.label}</label>
                          </div>
                        ) : (
                          <>
                            <label className="field-label" htmlFor={id}>{field.label}</label>
                            <Input
                              id={id}
                              type={field.type}
                              inputMode={["ktp", "npwp", "nib"].includes(field.id) ? "numeric" : undefined}
                              min={field.id === "siteArea" ? 0.01 : undefined}
                              step={field.id === "siteArea" ? "any" : undefined}
                              value={value}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? `${id}-error` : undefined}
                              onChange={(event) => setRevisionValue(key, ["ktp", "npwp", "nib"].includes(field.id) ? event.target.value.replace(/\D/g, "") : event.target.value)}
                            />
                          </>
                        )}
                        {error ? <p id={`${id}-error`} className="mt-2 text-sm font-semibold text-primary" role="alert">{error}</p> : null}
                      </div>
                    );
                  })}
                  <Button type="button" disabled={savingRevision} onClick={() => void submitRevision()}>{savingRevision ? "Menyimpan berkas…" : "Kirim revisi"}</Button>
                </div>
              ) : <p className="mt-5 text-sm">Tidak ada permintaan tercatat.</p>}
            </section>
          ) : null}

          {application.proposal ? (
            <section className="surface-card border-t-4 border-t-secondary p-5 sm:p-7">
              <h2 className="text-xl font-bold">Proposal</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6">{application.proposal.summary}</p>
              <div className="mt-5 border-y border-border py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nilai indikatif</p>
                <p className="mt-1 text-lg font-bold">{application.proposal.amount}</p>
              </div>
              {application.proposal.terms ? (
                <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {[
                    ["Area", application.proposal.terms.area],
                    ["Model operasional", application.proposal.terms.operatingModel],
                    ["Durasi", application.proposal.terms.duration],
                    ["Biaya awal", application.proposal.terms.initialFee],
                    ["Royalti", application.proposal.terms.royalty],
                    ["Ketentuan", application.proposal.terms.conditions],
                  ].filter(([, value]) => value).map(([label, value]) => (
                    <div key={label} className="min-w-0 border-t border-border pt-3">
                      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
                      <dd className="mt-1 whitespace-pre-line break-words text-sm leading-6">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {application.proposal.attachments?.length ? (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-sm font-bold">Lampiran</h3>
                  <ul className="mt-2 divide-y divide-border">
                    {application.proposal.attachments.map((name) => <li key={name} className="break-all py-2 text-sm">{name}</li>)}
                  </ul>
                </div>
              ) : null}
              {application.proposal.response ? (
                <p className="mt-4 text-sm font-semibold" role="status">
                  Respons Anda: {application.proposal.response === "accepted" ? "Diterima" : application.proposal.response === "rejected" ? "Ditolak" : "Meminta perubahan"}.
                </p>
              ) : null}
              {application.proposal.franchisorResponse === "accepted" && !application.proposal.response ? <p className="mt-4 text-sm">Proposal disetujui franchisor. Menunggu jawaban Anda.</p> : null}
              {application.proposal.response === "accepted" && application.proposal.franchisorResponse !== "accepted" ? <p className="mt-4 text-sm">Menunggu persetujuan franchisor.</p> : null}
              {canRespond ? (
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="field-label" htmlFor="proposal-note">Catatan untuk permintaan perubahan</label>
                    <Textarea id="proposal-note" rows={3} value={proposalNote} onChange={(event) => setProposalNote(event.target.value)} placeholder="Bagian mana yang ingin dibahas kembali?" />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button type="button" onClick={() => respondToProposal("accepted")}>Terima proposal</Button>
                    <Button type="button" variant="secondary" onClick={() => respondToProposal("changes-requested")}>Minta perubahan</Button>
                    <Button type="button" variant="destructive" onClick={() => respondToProposal("rejected")}>Tolak proposal</Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">Simulasi prototipe. Tidak membuat kontrak.</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <CommunicationPanel applicationId={application.id} submittedAt={application.submittedAt} stage={application.stage} />

          <section className="surface-card p-5 sm:p-7">
            <h2 className="text-xl font-bold">Jawaban pemohon</h2>
            {detailGroups.length ? (
              <div className="mt-5 space-y-5">
                {detailGroups.map(([section, fields]) => (
                  <div key={section || "answers"}>
                    {section ? <h3 className="border-t border-border pt-3 text-sm font-bold">{section}</h3> : null}
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      {fields.map((field) => (
                        <div key={field.id} className="min-w-0 border-t border-border pt-3">
                          <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{field.label}</dt>
                          <dd className="mt-1 break-words text-sm leading-6">{field.type === "checkbox" ? (application.answers[field.id] === "true" ? "Ya" : "Tidak") : field.type === "location" ? (googleMapsUrl(application.answers[field.id]) ? <a className="text-link" href={googleMapsUrl(application.answers[field.id])} target="_blank" rel="noreferrer">Lihat titik di Google Maps</a> : "Belum dipilih") : application.answers[field.id]}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  ["Nama pemohon", application.applicantName],
                  ["Email", application.email],
                  ["Nomor telepon", application.phone],
                  ["Kota", application.city || "Belum diisi"],
                  ["Pengalaman", application.experience || "Belum diisi"],
                  ["Catatan lokasi", application.locationNotes || "Belum ada catatan"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 border-t border-border pt-3">
                    <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words text-sm leading-6">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <section className="surface-card p-5 sm:p-7">
            <h2 className="text-xl font-bold">Dokumen</h2>
            {application.documents.length ? (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {application.documents.map((document, index) => {
                  const field = programFields.find((candidate) => candidate.type === "file"
                    && (application.answers[candidate.id] === document.name || matchScore(`${candidate.id} ${candidate.label}`, document.name) >= 2));
                  return (
                    <li key={`${document.name}-${index}`} className="flex flex-col justify-between gap-1 py-3 sm:flex-row sm:items-center">
                      <span className="break-all text-sm font-semibold">{field ? `${field.label}: ` : ""}<DemoFileLink applicationId={application.id} fieldId={document.fieldId ?? field?.id} name={document.name} /></span>
                      <span className="text-xs text-muted-foreground">{document.status === "needs-update" ? "Perlu diperbarui" : "Diterima"}</span>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="mt-4 text-sm text-muted-foreground">Belum ada dokumen tercatat.</p>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="surface-card p-5 sm:p-6">
            <p className="section-kicker">Reviewer</p>
            <h2 className="mt-2 text-lg font-bold">{application.owner || "Tim Franchise"}</h2>
            <p className="mt-4 border-t border-border pt-4 text-sm"><span className="font-bold">Email pemohon</span><br />{application.email}</p>
          </section>
          <section className="bg-muted p-5 sm:p-6">
            <h2 className="text-lg font-bold">Catatan reviewer</h2>
            <p className="mt-3 text-sm leading-6">{application.summary}</p>
            {application.strengths.length ? <><h3 className="mt-5 border-t border-border pt-4 text-sm font-bold">Kekuatan</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{application.strengths.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
            {application.concerns.length ? <><h3 className="mt-5 border-t border-border pt-4 text-sm font-bold">Perlu dikonfirmasi</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">{application.concerns.map((item) => <li key={item}>{item}</li>)}</ul></> : null}
          </section>
        </aside>
      </div>
      {notice ? <p className="fixed inset-x-4 bottom-4 z-10 mx-auto max-w-2xl border border-border bg-white p-4 text-sm font-semibold shadow-md sm:inset-x-auto" role="status" aria-live="polite">{notice}</p> : null}
      {final ? <p className="sr-only" aria-live="polite">Proses aplikasi selesai.</p> : null}
    </div>
  );
}
