"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEMO_PROGRAMS,
  readDemoPrograms,
  writeDemoPrograms,
  type FranchiseProgram,
  type ProgramField,
  type ProgramFieldType,
  type ScreeningRule,
} from "@/lib/demo-data";

const fieldTypes: { value: ProgramFieldType; label: string }[] = [
  { value: "text", label: "Teks singkat" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Nomor telepon" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "textarea", label: "Teks panjang" },
  { value: "select", label: "Pilihan" },
  { value: "file", label: "Unggah dokumen" },
  { value: "checkbox", label: "Persetujuan" },
  { value: "location", label: "Titik lokasi peta" },
];

function subscribeToProgramChanges(onStoreChange: () => void) {
  window.addEventListener("franchise-prototype:update", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("franchise-prototype:update", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getProgramSnapshot(programId: string) {
  return JSON.stringify(readDemoPrograms().find((item) => item.id === programId) ?? null);
}

function getServerProgramSnapshot(programId: string) {
  const program = DEMO_PROGRAMS.find((item) => item.id === programId);
  return program ? JSON.stringify(program) : "";
}

export default function ProgramEditor({ programId }: { programId: string }) {
  const programSnapshot = useSyncExternalStore(
    subscribeToProgramChanges,
    () => getProgramSnapshot(programId),
    () => getServerProgramSnapshot(programId),
  );
  const program = programSnapshot ? JSON.parse(programSnapshot) as FranchiseProgram : null;
  const ready = programSnapshot !== "";

  function save(next: FranchiseProgram) {
    writeDemoPrograms(readDemoPrograms().map((item) => item.id === next.id ? next : item));
  }

  function updateField(fieldId: string, changes: Partial<ProgramField>) {
    if (!program) return;
    save({ ...program, fields: program.fields.map((field) => field.id === fieldId ? { ...field, ...changes } : field) });
  }

  function updateRule(ruleId: string, changes: Partial<ScreeningRule>) {
    if (!program) return;
    save({ ...program, screeningRules: program.screeningRules.map((rule) => rule.id === ruleId ? { ...rule, ...changes } : rule) });
  }

  function addField() {
    if (!program) return;
    const field: ProgramField = {
      id: `field-${crypto.randomUUID().slice(0, 8)}`,
      label: "Bidang baru",
      type: "text",
      required: false,
    };
    save({ ...program, fields: [...program.fields, field] });
  }

  function addRule() {
    if (!program) return;
    const rule: ScreeningRule = {
      id: `rule-${crypto.randomUUID().slice(0, 8)}`,
      label: "Aturan baru",
      description: "",
      hardFail: false,
      enabled: true,
      fieldId: program.fields[0]?.id,
      operator: "present",
    };
    save({ ...program, screeningRules: [...program.screeningRules, rule] });
  }

  if (!ready) return <section className="container-wide py-10 text-sm text-[var(--text-muted)]">Memuat program…</section>;
  if (!program) {
    return (
      <section className="container-wide py-10 sm:py-14">
        <h1 className="text-2xl font-bold">Program tidak ditemukan</h1>
        <Link className="text-link mt-5 inline-block" href="/manage/programs">Kembali ke program</Link>
      </section>
    );
  }

  return (
    <section className="container-wide py-8 sm:py-12">
      <Link className="text-link inline-block" href="/manage/programs">← Semua program</Link>
      <div className="mb-8 mt-5 border-b border-[var(--line)] pb-6 sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{program.name || "Program baru"}</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Tersimpan otomatis.</p>
        </div>
        <label className="mt-5 flex min-h-11 items-center gap-3 border-t border-[var(--line)] pt-4 text-sm font-bold sm:mt-0 sm:border-0 sm:pt-0">
          <input
            checked={program.open}
            className="size-4 accent-[var(--mcd-red)]"
            onChange={(event) => save({ ...program, open: event.target.checked })}
            type="checkbox"
          />
          Pendaftaran dibuka
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="surface-card p-5 sm:p-6">
            <h2 className="text-xl font-bold">Informasi program</h2>
            <div className="mt-5 grid grid-cols-1 gap-4">
              <label>
                <span className="field-label">Nama program</span>
                <Input onChange={(event) => save({ ...program, name: event.target.value })} value={program.name} />
              </label>
              <label>
                <span className="field-label">Ringkasan singkat</span>
                <Textarea className="min-h-20" onChange={(event) => save({ ...program, summary: event.target.value })} value={program.summary} />
              </label>
              <label>
                <span className="field-label">Keterangan investasi</span>
                <Input onChange={(event) => save({ ...program, investmentLabel: event.target.value })} value={program.investmentLabel} />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label>
                  <span className="field-label">Model operasional</span>
                  <Input onChange={(event) => save({ ...program, operatingModel: event.target.value })} value={program.operatingModel} />
                </label>
                <label>
                  <span className="field-label">Area tersedia</span>
                  <Input onChange={(event) => save({ ...program, locations: event.target.value })} value={program.locations} />
                </label>
              </div>
            </div>
          </section>

          <section className="surface-card p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Formulir pengajuan</h2>
              </div>
              <Button className="w-full sm:w-auto" variant="secondary" onClick={addField} type="button">Tambah bidang</Button>
            </div>
            <div className="mt-4 space-y-4">
              {program.fields.map((field, index) => (
                <details className="min-w-0 border border-[var(--line)]" key={field.id}>
                  <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
                    {index + 1}. {field.label || "Bidang tanpa label"}
                  </summary>
                  <fieldset className="min-w-0 border-t border-[var(--line)] p-4 sm:p-5">
                    <legend className="sr-only">Pengaturan bidang {index + 1}</legend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label>
                      <span className="field-label">Label bidang</span>
                      <Input onChange={(event) => updateField(field.id, { label: event.target.value })} value={field.label} />
                    </label>
                    <label>
                      <span className="field-label">Jenis bidang</span>
                      <Select onChange={(event) => updateField(field.id, { type: event.target.value as ProgramFieldType })} value={field.type}>
                        {fieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                      </Select>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="field-label">Bagian formulir</span>
                      <Input
                        list={`sections-${program.id}-${field.id}`}
                        onChange={(event) => updateField(field.id, { section: event.target.value || undefined })}
                        placeholder="Contoh: Data diri"
                        value={field.section ?? ""}
                      />
                      <datalist id={`sections-${program.id}-${field.id}`}>
                        {[...new Set(program.fields.map((item) => item.section).filter((section): section is string => Boolean(section)))].map((section) => (
                          <option key={section} value={section} />
                        ))}
                      </datalist>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="field-label">Petunjuk (opsional)</span>
                      <Input onChange={(event) => updateField(field.id, { helpText: event.target.value })} value={field.helpText ?? ""} />
                    </label>
                    {field.type === "select" && (
                      <label className="sm:col-span-2">
                        <span className="field-label">Pilihan jawaban</span>
                        <Textarea
                          className="min-h-20"
                          onChange={(event) => updateField(field.id, { options: event.target.value.split(/[\n,]/).map((option) => option.trim()).filter(Boolean) })}
                          placeholder="Satu pilihan per baris"
                          value={(field.options ?? []).join("\n")}
                        />
                      </label>
                    )}
                    <label className="sm:col-span-2">
                      <span className="field-label">Tampilkan jika bidang sebelumnya terisi</span>
                      <Select
                        onChange={(event) => updateField(field.id, { condition: event.target.value || undefined })}
                        value={field.condition ?? ""}
                      >
                        <option value="">Selalu tampilkan</option>
                        {program.fields.slice(0, index).map((dependency) => (
                          <option key={dependency.id} value={dependency.id}>{dependency.label || "Bidang tanpa label"}</option>
                        ))}
                      </Select>
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-4 sm:col-span-2">
                      <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
                        <input checked={field.required} className="size-4 accent-[var(--mcd-red)]" onChange={(event) => updateField(field.id, { required: event.target.checked })} type="checkbox" />
                        Wajib diisi
                      </label>
                      <Button
                        className="h-auto px-1 text-sm underline underline-offset-4"
                        variant="link"
                        onClick={() => save({
                          ...program,
                          fields: program.fields.filter((item) => item.id !== field.id).map((item) => item.condition === field.id ? { ...item, condition: undefined } : item),
                          screeningRules: program.screeningRules.map((rule) => rule.fieldId === field.id ? { ...rule, fieldId: undefined } : rule),
                        })}
                        type="button"
                      >
                        Hapus bidang
                      </Button>
                    </div>
                  </div>
                </fieldset>
                </details>
              ))}
              {program.fields.length === 0 && <p className="py-5 text-sm text-[var(--text-muted)]">Belum ada bidang formulir.</p>}
            </div>
          </section>
        </div>

        <section className="surface-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Pemeriksaan awal</h2>
            </div>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={addRule} type="button">Tambah aturan</Button>
          </div>
          <div className="mt-4 space-y-4">
            {program.screeningRules.map((rule, index) => (
              <details className="min-w-0 border border-[var(--line)]" key={rule.id}>
                <summary className="cursor-pointer px-4 py-3 text-sm font-bold">
                  {index + 1}. {rule.label || "Aturan tanpa nama"}
                </summary>
                <fieldset className="min-w-0 border-t border-[var(--line)] p-4 sm:p-5">
                  <legend className="sr-only">Pengaturan aturan {index + 1}</legend>
                <div className="grid grid-cols-1 gap-4">
                  <label>
                    <span className="field-label">Nama aturan</span>
                    <Input onChange={(event) => updateRule(rule.id, { label: event.target.value })} value={rule.label} />
                  </label>
                  <label>
                    <span className="field-label">Keterangan</span>
                    <Textarea className="min-h-20" onChange={(event) => updateRule(rule.id, { description: event.target.value })} value={rule.description} />
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label>
                      <span className="field-label">Bidang yang diperiksa</span>
                      <Select onChange={(event) => updateRule(rule.id, { fieldId: event.target.value || undefined })} value={rule.fieldId ?? ""}>
                        <option value="">Pilih bidang</option>
                        {program.fields.map((field) => <option key={field.id} value={field.id}>{field.label || "Bidang tanpa label"}</option>)}
                      </Select>
                    </label>
                    <label>
                      <span className="field-label">Kondisi</span>
                      <Select
                        onChange={(event) => updateRule(rule.id, { operator: event.target.value as ScreeningRule["operator"] })}
                        value={rule.operator ?? "present"}
                      >
                        <option value="present">Terisi</option>
                        <option value="equals">Sama dengan</option>
                        <option value="contains">Memuat teks</option>
                        <option value="gte">Minimal sebesar</option>
                      </Select>
                    </label>
                    {rule.operator && rule.operator !== "present" && (
                      <label className="sm:col-span-2">
                        <span className="field-label">{rule.operator === "gte" ? "Nilai minimum" : "Nilai pembanding"}</span>
                        <Input
                          onChange={(event) => updateRule(rule.id, { value: event.target.value })}
                          placeholder={rule.operator === "gte" ? "Contoh: 10" : "Masukkan nilai"}
                          type={rule.operator === "gte" ? "number" : "text"}
                          value={rule.value ?? ""}
                        />
                      </label>
                    )}
                  </div>
                  <label>
                    <span className="field-label">Jika aturan tidak terpenuhi</span>
                    <Select onChange={(event) => updateRule(rule.id, { hardFail: event.target.value === "reject" })} value={rule.hardFail ? "reject" : "warning"}>
                      <option value="warning">Tandai untuk ditinjau</option>
                      <option value="reject">Tolak otomatis</option>
                    </Select>
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
                    <label className="flex min-h-10 items-center gap-3 text-sm font-bold">
                      <input checked={rule.enabled} className="size-4 accent-[var(--mcd-red)]" onChange={(event) => updateRule(rule.id, { enabled: event.target.checked })} type="checkbox" />
                      Aktif
                    </label>
                    <Button
                      className="h-auto px-1 text-sm underline underline-offset-4"
                      variant="link"
                      onClick={() => save({ ...program, screeningRules: program.screeningRules.filter((item) => item.id !== rule.id) })}
                      type="button"
                    >
                      Hapus aturan
                    </Button>
                  </div>
                </div>
              </fieldset>
              </details>
            ))}
            {program.screeningRules.length === 0 && <p className="py-5 text-sm text-[var(--text-muted)]">Belum ada aturan pemeriksaan.</p>}
          </div>
          <p className="mt-5 border-l-2 border-[var(--mcd-yellow)] pl-3 text-xs leading-5 text-[var(--text-muted)]">
            Keputusan akhir tetap ditinjau oleh tim.
          </p>
        </section>
      </div>
    </section>
  );
}
