"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LocationPicker } from "@/components/applicant/location-picker";
import { hasRemoteWorkspace, readDemoPrograms, saveDemoApplication, updateDemoApplication, type DocumentFinding, type FranchiseProgram, type LocationAssessment, type ProgramField } from "@/lib/demo-data";
import { parseMapPoint } from "@/lib/location";
import { isDemoWorkspace, readWorkspaceIdentity, readDemoProfile, writeDemoProfile, type WorkspaceIdentity } from "@/lib/demo-session";
import { evaluateScreening, scoreScreening } from "@/lib/screening";
import { saveDemoFiles, type PendingDemoFile } from "@/lib/demo-files";
import { normalizeActions } from "@/lib/ai-actions";
import type { ReviewBrief } from "@/app/api/application-review/route";

type Answers = Record<string, string>;
type Step = { title: string; fields: ProgramField[] };

const DRAFT_PREFIX = "franchise-prototype:applicant-draft:";
const PERSONAL_FIELDS = new Set(["fullName", "email", "phone"]);
const SECTION_ORDER = ["Profil pemohon", "Pengalaman usaha", "Kesiapan usaha", "Informasi lokasi", "Kondisi lokasi"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "zip"]);
const RESUME_FILE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);
const RESUME_FIELD_IDS = new Set(["fullName", "email", "phone", "age", "residentialAddress", "occupation", "companyName", "educationLevel", "businessType", "businessDuration", "experience"]);
const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function fileError(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !ALLOWED_FILE_EXTENSIONS.has(extension)) return "Gunakan PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, atau ZIP.";
  if (file.size > MAX_FILE_SIZE) return "Ukuran setiap berkas maksimal 10 MB.";
  return "";
}

function withoutFileAnswers(answers: Answers, program: FranchiseProgram) {
  const result = { ...answers };
  program.fields.filter((field) => field.type === "file").forEach((field) => delete result[field.id]);
  return result;
}

function draftKey(identityId: string, programId: string) {
  return `${DRAFT_PREFIX}${identityId}:${programId}`;
}

function profileAnswers(identity: WorkspaceIdentity): Answers {
  if (identity.role !== "applicant") return {};
  const profile = readDemoProfile(identity.id, { fullName: identity.name, email: identity.email });
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    age: profile.age,
    residentialAddress: profile.residentialAddress,
  };
}

function groupFields(fields: ProgramField[]) {
  const groups = new Map<string, ProgramField[]>();
  fields.forEach((field) => {
    const section = field.section?.trim() ?? "";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return [...groups.entries()];
}

function getSteps(program: FranchiseProgram): Step[] {
  const personal = program.fields.filter((field) => PERSONAL_FIELDS.has(field.id)
    || /data diri|identitas/i.test(field.section ?? ""));
  const finalFields = program.fields.filter((field) => field.type === "checkbox"
    || /dokumen|legalitas|persetujuan/i.test(field.section ?? ""));
  const details = program.fields.filter((field) => !personal.includes(field) && !finalFields.includes(field));
  const detailSteps = groupFields(details).sort(([left], [right]) => {
    const rank = (section: string) => {
      const index = SECTION_ORDER.indexOf(section);
      return index === -1 ? SECTION_ORDER.length : index;
    };
    return rank(left) - rank(right);
  });
  return [
    { title: "Data diri", fields: personal },
    ...detailSteps.map(([section, fields]) => ({ title: section || "Informasi pengajuan", fields })),
    { title: "Legalitas dan dokumen", fields: finalFields },
  ].filter((step) => step.fields.length > 0);
}

function investmentAmount(value: string) {
  if (value.includes("Di bawah")) return 5_000_000_000;
  if (value.includes("10–25")) return 18_000_000_000;
  if (value.includes("Di atas")) return 30_000_000_000;
  const amount = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export default function ApplicationForm({
  programId,
  initialProgram,
}: {
  programId: string;
  initialProgram?: FranchiseProgram;
}) {
  const router = useRouter();
  const fallbackProgram = useMemo<FranchiseProgram>(() => initialProgram ?? {
    id: programId,
    name: "Program tidak ditemukan",
    summary: "",
    investmentLabel: "",
    operatingModel: "",
    locations: "",
    open: false,
    fields: [],
    screeningRules: [],
  }, [initialProgram, programId]);
  const [program, setProgram] = useState(fallbackProgram);
  const [programExists, setProgramExists] = useState(() => isDemoWorkspace() && Boolean(initialProgram));
  const [answers, setAnswers] = useState<Answers>({});
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [draftIdentityId, setDraftIdentityId] = useState("");
  const submittedRef = useRef(false);
  const [isApplicant, setIsApplicant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingResume, setIsExtractingResume] = useState(false);
  const [resumeNotice, setResumeNotice] = useState("");
  const [isCheckingDraft, setIsCheckingDraft] = useState(false);
  const [draftCheck, setDraftCheck] = useState<{ snapshot: string; result?: ReviewBrief; error?: string }>();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const steps = useMemo(() => getSteps(program), [program]);
  const visible = (field: ProgramField) => !field.condition || Boolean(answers[field.condition]?.trim());
  const currentFields = (steps[stepIndex]?.fields ?? []).filter(visible);
  const currentGroups = groupFields(currentFields);

  useEffect(() => { stepHeadingRef.current?.focus(); }, [stepIndex]);
  const draftSnapshot = JSON.stringify({ answers, program, identity: draftIdentityId });
  const currentCheck = draftCheck?.snapshot === draftSnapshot ? draftCheck : undefined;

  async function checkDraft() {
    if (isCheckingDraft || answers.aiConsent !== "true") return;
    const snapshot = draftSnapshot;
    setIsCheckingDraft(true);
    setDraftCheck(undefined);
    try {
      const response = await fetch("/api/application-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programName: program.name,
          fields: program.fields.filter(visible).map(({ id, label, type, required }) => ({ id, label, type, required })),
          answers: withoutFileAnswers(answers, program),
          screening: evaluateScreening(program.screeningRules, program.fields, answers),
          documentFieldIds: [],
          aiConsent: true,
        }),
      });
      const result = await response.json() as ReviewBrief;
      if (!response.ok || typeof result.summary !== "string" || !["rules", "gemini"].includes(result.source)) throw new Error("Pemeriksaan belum tersedia. Coba lagi.");
      setDraftCheck({ snapshot, result: { ...result, actions: normalizeActions(result.actions, program.fields, answers) } });
    } catch {
      setDraftCheck({ snapshot, error: "Pemeriksaan belum tersedia. Anda tetap dapat melanjutkan pengajuan." });
    } finally {
      setIsCheckingDraft(false);
    }
  }

  useEffect(() => {
    let activeIdentityId = readWorkspaceIdentity().id;
    const initialize = () => {
      const identity = readWorkspaceIdentity();
      activeIdentityId = identity.id;
      setDraftIdentityId(identity.id);
      const savedProfile = profileAnswers(identity);
      setIsApplicant(identity.role === "applicant");
      const storedProgram = (isDemoWorkspace() || hasRemoteWorkspace())
        ? readDemoPrograms().find((item) => item.id === programId)
        : undefined;
      if (storedProgram) {
        setProgram(storedProgram);
        setProgramExists(true);
      } else setProgramExists(isDemoWorkspace() && Boolean(initialProgram));
      try {
        const legacyKey = identity.id === "nadia" ? `${DRAFT_PREFIX}${programId}` : null;
        const draft = window.localStorage.getItem(draftKey(identity.id, programId))
          ?? (legacyKey ? window.localStorage.getItem(legacyKey) : null);
        if (draft) {
          const parsed = JSON.parse(draft) as { answers?: Answers; stepIndex?: number };
          setAnswers(withoutFileAnswers({ ...savedProfile, ...(parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}) }, storedProgram ?? fallbackProgram));
          if (typeof parsed.stepIndex === "number") setStepIndex(Math.max(0, Math.min(parsed.stepIndex, Math.max(0, getSteps(storedProgram ?? fallbackProgram).length - 1))));
          setNotice("Draf tersimpan ditemukan. Anda dapat melanjutkan pengisian.");
        } else setAnswers(withoutFileAnswers(savedProfile, storedProgram ?? fallbackProgram));
      } catch {
        setNotice("Draf sebelumnya tidak dapat dibaca. Anda dapat mulai mengisi kembali.");
      }
      setReady(true);
    };
    const timer = window.setTimeout(initialize, 0);
    const refreshProgram = () => {
      const identity = readWorkspaceIdentity();
      const updated = (isDemoWorkspace() || hasRemoteWorkspace())
        ? readDemoPrograms().find((item) => item.id === programId)
        : undefined;
      const currentProgram = updated ?? fallbackProgram;
      setIsApplicant(identity.role === "applicant");
      if (identity.id !== activeIdentityId) {
        activeIdentityId = identity.id;
        setDraftIdentityId(identity.id);
        const savedProfile = profileAnswers(identity);
        setSelectedFiles({});
        setAnswers(withoutFileAnswers(savedProfile, currentProgram));
        setStepIndex(0);
        try {
          const draft = window.localStorage.getItem(draftKey(identity.id, programId));
          if (draft) {
            const parsed = JSON.parse(draft) as { answers?: Answers; stepIndex?: number };
            setAnswers(withoutFileAnswers({ ...savedProfile, ...(parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}) }, currentProgram));
            if (typeof parsed.stepIndex === "number") setStepIndex(Math.max(0, Math.min(parsed.stepIndex, Math.max(0, getSteps(currentProgram).length - 1))));
          }
        } catch {
          setAnswers(savedProfile);
        }
      }
      if (updated) {
        setProgram(updated);
        setProgramExists(true);
      } else setProgramExists(isDemoWorkspace() && Boolean(initialProgram));
    };
    window.addEventListener("franchise-prototype:update", refreshProgram);
    window.addEventListener("storage", refreshProgram);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("franchise-prototype:update", refreshProgram);
      window.removeEventListener("storage", refreshProgram);
    };
  }, [fallbackProgram, initialProgram, programId]);

  useEffect(() => {
    if (!ready || !isApplicant || !programExists || submittedRef.current) return;
    if (readWorkspaceIdentity().id !== draftIdentityId) return;
    try {
      window.localStorage.setItem(draftKey(draftIdentityId, programId), JSON.stringify({ answers: withoutFileAnswers(answers, program), stepIndex }));
    } catch {
      const timer = window.setTimeout(() => setNotice("Draf tidak dapat disimpan di perangkat ini."), 0);
      return () => window.clearTimeout(timer);
    }
  }, [answers, draftIdentityId, isApplicant, program, programExists, programId, ready, stepIndex]);

  function setAnswer(fieldId: string, value: string) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
    setNotice("");
  }

  async function fillFromResume(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !RESUME_FILE_EXTENSIONS.has(extension)) {
      setResumeNotice("Gunakan PDF, JPG, atau PNG.");
      return;
    }
    if (file.size > MAX_RESUME_SIZE) {
      setResumeNotice("Ukuran resume maksimal 5 MB.");
      return;
    }

    setSelectedFiles((current) => ({ ...current, resume: file }));
    setAnswers((current) => ({ ...current, resume: file.name }));
    setIsExtractingResume(true);
    setResumeNotice("Gemini sedang membaca resume…");

    try {
      const formData = new FormData();
      formData.append("intent", "extract-resume");
      formData.append("resume", file);
      const response = await fetch("/api/application-review", { method: "POST", body: formData });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Resume tidak dapat dibaca.");
      const rawFields = (payload as Record<string, unknown>).fields;
      if (!rawFields || typeof rawFields !== "object" || Array.isArray(rawFields)) throw new Error("Hasil pembacaan tidak valid.");
      const availableFields = new Map(program.fields.map((field) => [field.id, field]));
      const extracted = Object.fromEntries(Object.entries(rawFields as Record<string, unknown>).flatMap(([fieldId, value]) => {
        const field = availableFields.get(fieldId);
        if (!RESUME_FIELD_IDS.has(fieldId) || !field || typeof value !== "string" || !value.trim()) return [];
        if (field.type === "select" && !field.options?.includes(value)) return [];
        return [[fieldId, value.trim()]];
      }));
      setAnswers((current) => ({ ...current, ...extracted, resume: file.name }));
      setErrors((current) => {
        const next = { ...current };
        [...Object.keys(extracted), "resume"].forEach((fieldId) => delete next[fieldId]);
        return next;
      });
      setResumeNotice(Object.keys(extracted).length
        ? "Resume tersimpan. Periksa data yang terisi."
        : "Resume tersimpan. Tidak ada data yang terbaca otomatis.");
    } catch {
      setResumeNotice("Resume tersimpan. Isi atau periksa data secara manual.");
    } finally {
      setIsExtractingResume(false);
    }
  }

  function validate(fields: ProgramField[]) {
    const next: Record<string, string> = {};
    fields.filter(visible).forEach((field) => {
      const value = answers[field.id]?.trim() ?? "";
      if (field.required && (field.type === "file" ? !selectedFiles[field.id] : (field.type as string) === "checkbox" ? value !== "true" : !value)) next[field.id] = field.type === "file" ? `Pilih berkas ${field.label}.` : `${field.label} wajib diisi.`;
      else if (field.type === "email" && value && !/^\S+@\S+\.\S+$/.test(value)) next[field.id] = "Masukkan alamat email yang valid.";
      else if (field.type === "date" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) next[field.id] = "Pilih tanggal yang valid.";
      else if (field.type === "location" && value && !parseMapPoint(value)) next[field.id] = "Pilih titik lokasi yang valid di peta.";
      else if (["ktp", "npwp", "nib"].includes(field.id) && value && /\D/.test(value)) next[field.id] = "Masukkan angka saja.";
      else if (field.id === "siteArea" && value && (!Number.isFinite(Number(value)) || Number(value) <= 0)) next[field.id] = "Masukkan luas lebih dari 0 m².";
    });
    setErrors((current) => ({ ...current, ...next }));
    return next;
  }

  function saveDraft() {
    try {
      const identity = readWorkspaceIdentity();
      window.localStorage.setItem(draftKey(identity.id, programId), JSON.stringify({ answers: withoutFileAnswers(answers, program), stepIndex }));
      setNotice("Draf tersimpan di perangkat ini. Anda dapat kembali melanjutkan nanti.");
    } catch {
      setNotice("Draf tidak dapat disimpan di perangkat ini.");
    }
  }

  async function submitApplication(now: number) {
    if (isSubmitting) return;
    const allVisible = steps.flatMap((step) => step.fields).filter(visible);
    const foundErrors = validate(allVisible);
    if (Object.keys(foundErrors).length) {
      const firstInvalidStep = steps.findIndex((step) => step.fields.some((field) => foundErrors[field.id]));
      if (firstInvalidStep >= 0) setStepIndex(firstInvalidStep);
      setNotice("Periksa kembali informasi yang belum lengkap.");
      return;
    }

    setIsSubmitting(true);
    const id = `app-${now}`;
    const pendingFiles: PendingDemoFile[] = Object.entries(selectedFiles).map(([fieldId, file]) => ({ fieldId, file }));
    try {
      await saveDemoFiles(id, pendingFiles);
    } catch (error) {
      setNotice(error instanceof Error ? `Berkas belum tersimpan. ${error.message}` : "Berkas belum tersimpan. Coba lagi.");
      setIsSubmitting(false);
      return;
    }

    const documents = program.fields
      .filter((field) => field.type === "file" && selectedFiles[field.id])
      .map((field) => ({ fieldId: field.id, name: selectedFiles[field.id].name, status: "received" as const }));
    const screening = evaluateScreening(program.screeningRules, program.fields, answers);
    const stage = screening.outcome === "reject" ? "rejected" as const : screening.outcome === "warning" ? "screening" as const : "review" as const;
    const identity = readWorkspaceIdentity();
    const profile = readDemoProfile(identity.id, { fullName: identity.name, email: identity.email });
    writeDemoProfile(identity.id, {
      fullName: answers.fullName || profile.fullName,
      email: answers.email || profile.email,
      phone: answers.phone || profile.phone,
      age: answers.age || profile.age,
      residentialAddress: answers.residentialAddress || profile.residentialAddress,
    });
    const application = {
      id,
      reference: `FR-${String(now).slice(-5)}`,
      programId: program.id,
      programName: program.name,
      applicantIdentityId: identity.id,
      applicantName: answers.fullName || identity.name,
      email: answers.email || identity.email,
      phone: answers.phone || "",
      city: answers.city || "",
      investmentCapacity: investmentAmount(answers.investmentCapacity || ""),
      experience: answers.experience || answers.siteNotes || "",
      submittedAt: new Date(now).toISOString(),
      stage,
      reviewSource: screening.outcome === "reject" || answers.aiConsent !== "true" ? "rules" as const : "pending" as const,
      reviewNote: screening.outcome === "reject"
        ? "Analisis AI tidak dijalankan karena pengajuan tidak memenuhi aturan awal."
        : answers.aiConsent !== "true" ? "Analisis AI tidak diaktifkan. Tim dapat meninjau pengajuan secara manual." : undefined,
      score: scoreScreening(screening),
      owner: "Tim Franchise",
      summary: screening.outcome === "reject"
        ? "Pengajuan tidak memenuhi aturan otomatis program."
        : screening.outcome === "warning"
          ? "Pemeriksaan awal selesai. Beberapa hal perlu ditinjau tim."
          : "Pemeriksaan awal selesai. Menunggu peninjauan tim.",
      screening,
      strengths: [],
      concerns: screening.reasons,
      documents,
      revisionItems: [],
      locationNotes: [
        answers.siteAddress,
        answers.siteArea && `Luas ${answers.siteArea} m²`,
        answers.buildingType && `Bangunan ${answers.buildingType}`,
        answers.siteOwnership && `Status ${answers.siteOwnership}`,
        answers.siteTraffic,
        answers.siteNotes,
      ].filter(Boolean).join(" · ") || "Belum ada catatan lokasi.",
      answers: { ...answers },
    };
    saveDemoApplication(application);
    if (screening.outcome !== "reject" && answers.aiConsent === "true") {
      const documentFieldIds = ["businessProfile", "financialSummary"].filter((fieldId) => Boolean(selectedFiles[fieldId]));
      const ocrFiles = documentFieldIds.flatMap((fieldId) => {
        const file = selectedFiles[fieldId];
        const extension = file?.name.split(".").pop()?.toLowerCase();
        return file && file.size <= 5 * 1024 * 1024 && ["pdf", "jpg", "jpeg", "png"].includes(extension ?? "") ? [{ fieldId, file }] : [];
      });
      const reviewInput = {
        programName: program.name,
        fields: program.fields.filter((field) => field.type !== "file").map(({ id, label, type, required }) => ({ id, label, type, required })),
        answers: withoutFileAnswers(answers, program),
        screening,
        aiConsent: true,
        documentFieldIds,
      };
      const formData = new FormData();
      formData.append("payload", JSON.stringify(reviewInput));
      ocrFiles.forEach(({ fieldId, file }) => formData.append(fieldId, file));
      const requestBody: BodyInit = ocrFiles.length ? formData : JSON.stringify(reviewInput);
      void fetch("/api/application-review", { method: "POST", body: requestBody })
        .then(async (response) => {
          if (!response.ok) throw new Error("Analisis tidak tersedia.");
        const brief: unknown = await response.json();
        if (!brief || typeof brief !== "object" || Array.isArray(brief)) throw new Error("Respons analisis tidak valid.");
        const result = brief as Record<string, unknown>;
        if (typeof result.summary !== "string" || typeof result.score !== "number" || !Array.isArray(result.strengths) || !Array.isArray(result.concerns) || !Array.isArray(result.questions)) throw new Error("Respons analisis tidak lengkap.");
        const rawLocation = result.locationAssessment;
        const locationAssessment = rawLocation && typeof rawLocation === "object" && !Array.isArray(rawLocation)
          ? rawLocation as LocationAssessment
          : undefined;
        const documentFindings = Array.isArray(result.documentFindings)
          ? result.documentFindings.filter((item): item is DocumentFinding => {
              if (!item || typeof item !== "object" || Array.isArray(item)) return false;
              const finding = item as Record<string, unknown>;
              return (finding.fieldId === "businessProfile" || finding.fieldId === "financialSummary")
                && typeof finding.summary === "string"
                && Array.isArray(finding.verificationItems);
            })
          : [];
        updateDemoApplication(application.id, {
          summary: result.summary,
          strengths: result.strengths.filter((item): item is string => typeof item === "string"),
          concerns: [...new Set([...screening.reasons, ...result.concerns.filter((item): item is string => typeof item === "string")])],
          score: result.score,
          followUpQuestions: result.questions.filter((item): item is string => typeof item === "string"),
          reviewActions: normalizeActions(result.actions, program.fields, answers),
          reviewSource: result.source === "gemini" ? "gemini" : "rules",
          reviewNote: typeof result.reviewNote === "string" ? result.reviewNote : undefined,
          locationAssessment,
          documentFindings,
          documentNote: typeof result.documentNote === "string" ? result.documentNote : undefined,
        }, application);
        })
        .catch(() => updateDemoApplication(application.id, {
          summary: "Pemeriksaan otomatis tidak tersedia. Pengajuan menunggu tinjauan manual.",
          reviewSource: "rules",
          reviewNote: "Layanan analisis tidak terhubung. Tinjau jawaban dan dokumen secara manual.",
          score: scoreScreening(screening),
          concerns: screening.reasons,
          documentNote: documentFieldIds.length ? "OCR belum berjalan; periksa dokumen secara manual." : undefined,
        }, application));
    }
    submittedRef.current = true;
    window.localStorage.removeItem(draftKey(identity.id, programId));
    if (identity.id === "nadia") window.localStorage.removeItem(`${DRAFT_PREFIX}${programId}`);
    router.push(`/applications/${application.id}`);
  }

  async function onContinue(event: FormEvent<HTMLFormElement>, submittedAt: number) {
    event.preventDefault();
    const foundErrors = validate(currentFields);
    if (Object.keys(foundErrors).length) return;
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
      setNotice("");
    } else {
      await submitApplication(submittedAt);
    }
  }

  function renderField(field: ProgramField) {
    if (!visible(field)) return null;
    const error = errors[field.id];
    const checkbox = (field.type as string) === "checkbox";
    return (
      <div key={field.id} className="min-w-0">
        {checkbox ? (
          <div className="flex items-start gap-3">
            <input id={field.id} className="mt-1 h-4 w-4 accent-secondary" type="checkbox" required={field.required} checked={answers[field.id] === "true"} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.id}-error` : undefined} onChange={(event) => setAnswer(field.id, event.target.checked ? "true" : "")} />
            <label className="text-sm leading-6" htmlFor={field.id}>
              {field.label}{field.required ? <span aria-hidden="true"> *</span> : null}
              {field.helpText ? <span className="mt-1 block text-xs text-muted-foreground">{field.helpText}</span> : null}
            </label>
          </div>
        ) : (
          <>
            <label className="field-label" htmlFor={field.type === "location" ? `${field.id}-latitude` : field.id}>
              {field.label}{field.required ? <span aria-hidden="true"> *</span> : null}
            </label>
            {field.helpText ? <p className="form-hint mb-2">{field.helpText}</p> : null}
          </>
        )}
        {field.type === "location" ? (
          <LocationPicker id={field.id} value={answers[field.id] ?? ""} onChange={(value) => setAnswer(field.id, value)} invalid={Boolean(error)} describedBy={error ? `${field.id}-error` : undefined} />
        ) : field.type === "textarea" ? (
          <Textarea id={field.id} rows={4} required={field.required} value={answers[field.id] ?? ""} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.id}-error` : undefined} onChange={(event) => setAnswer(field.id, event.target.value)} />
        ) : field.type === "select" ? (
          <Select id={field.id} required={field.required} value={answers[field.id] ?? ""} aria-invalid={Boolean(error)} aria-describedby={error ? `${field.id}-error` : undefined} onChange={(event) => setAnswer(field.id, event.target.value)}>
            <option value="">Pilih salah satu</option>
            {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </Select>
        ) : field.type === "file" ? (
          <div>
            <Input id={field.id} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" aria-invalid={Boolean(error)} aria-describedby={error ? `${field.id}-error` : undefined} onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              const problem = fileError(file);
              if (problem) {
                setErrors((current) => ({ ...current, [field.id]: problem }));
                setNotice(problem);
                return;
              }
              setSelectedFiles((current) => ({ ...current, [field.id]: file }));
              setAnswer(field.id, file.name);
            }} />
            {selectedFiles[field.id] ? <p className="mt-2 break-all text-sm text-muted-foreground">Berkas: {selectedFiles[field.id].name}</p> : null}
          </div>
        ) : checkbox ? null : (
          <Input
            id={field.id}
            type={field.type}
            inputMode={["ktp", "npwp", "nib"].includes(field.id) ? "numeric" : undefined}
            min={field.id === "siteArea" ? 0.01 : undefined}
            step={field.id === "siteArea" ? "any" : undefined}
            required={field.required}
            value={answers[field.id] ?? ""}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${field.id}-error` : undefined}
            onChange={(event) => setAnswer(field.id, ["ktp", "npwp", "nib"].includes(field.id) ? event.target.value.replace(/\D/g, "") : event.target.value)}
          />
        )}
        {error ? <p id={`${field.id}-error`} className="mt-2 text-sm font-semibold text-primary" role="alert">{error}</p> : null}
      </div>
    );
  }

  if (!ready) return <div className="container-wide py-12" aria-busy="true">Memuat formulir…</div>;

  if (!programExists) {
    return <div className="container-wide py-10 sm:py-14"><div className="surface-card max-w-2xl p-7 sm:p-9"><h1 className="text-2xl font-bold">Program tidak ditemukan</h1><Button className="mt-6 w-fit" nativeButton={false} render={<Link href="/" />}>Kembali ke program</Button></div></div>;
  }

  if (!isApplicant) {
    return <div className="container-wide py-10 sm:py-14"><div className="surface-card max-w-2xl p-7 sm:p-9"><h1 className="text-2xl font-bold">Pilih akun pemohon</h1><Button className="mt-6 w-fit" nativeButton={false} render={<Link href="/applications" />}>Kembali</Button></div></div>;
  }

  return (
    <div className="application-page container-wide py-8 sm:py-12">
      <Link className="text-link" href="/">Kembali ke program</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <section>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{program.name}</h1>

          {!program.open ? (
            <div className="surface-card mt-8 p-6" role="status">
              <h2 className="text-xl font-bold">Pengajuan belum dibuka</h2>
            </div>
          ) : (
            <div className="application-card surface-card mt-8 p-5 sm:p-8">
              <div className="form-progress grid grid-cols-2 gap-x-3 gap-y-4 border-b border-border pb-6 sm:grid-cols-3 sm:gap-4 xl:grid-cols-7">
                {steps.map((step, index) => (
                  <div key={step.title} className="min-w-0">
                    <div className={`flex h-8 w-8 items-center justify-center border text-xs font-bold ${index === stepIndex ? "border-secondary bg-secondary text-foreground" : index < stepIndex ? "border-foreground bg-foreground text-white" : "border-border bg-white text-muted-foreground"}`} aria-current={index === stepIndex ? "step" : undefined}>
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className={`mt-2 text-xs font-bold sm:text-sm ${index === stepIndex ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p>
                  </div>
                ))}
              </div>

              <form key={stepIndex} className="form-step pt-6" onSubmit={(event) => void onContinue(event, window.performance.timeOrigin + event.timeStamp)} noValidate>
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <h2 ref={stepHeadingRef} tabIndex={-1} className="text-xl font-bold">{steps[stepIndex]?.title}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Langkah {stepIndex + 1} dari {steps.length}</p>
                </div>
                {stepIndex === 0 ? (
                  <div className="mt-5 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">Gemini membaca PDF, JPG, atau PNG (maks. 5 MB). Periksa hasilnya.</p>
                      {resumeNotice ? <p className="mt-1 text-sm font-semibold" role="status" aria-live="polite">{resumeNotice}</p> : null}
                    </div>
                    <input
                      ref={resumeInputRef}
                      className="sr-only"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      aria-label="Pilih resume untuk mengisi data"
                      tabIndex={-1}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        void fillFromResume(file);
                      }}
                    />
                    <Button className="shrink-0" variant="outline" type="button" disabled={isExtractingResume} onClick={() => resumeInputRef.current?.click()}>
                      {isExtractingResume ? "Membaca resume…" : selectedFiles.resume ? "Ganti resume" : "Isi dengan resume"}
                    </Button>
                  </div>
                ) : null}
                <div className="mt-6 grid gap-x-5 gap-y-6 sm:grid-cols-2">
                  {currentGroups.map(([section, fields]) => (
                    <div key={section || "fields"} className="contents">
                      {section && section.toLowerCase() !== steps[stepIndex]?.title.toLowerCase() ? <h3 className="border-b border-border pb-2 text-sm font-bold sm:col-span-2">{section}</h3> : null}
                      {fields.map((field) => <div key={field.id} className={field.type === "textarea" || field.type === "file" || field.type === "location" ? "sm:col-span-2" : ""}>{renderField(field)}</div>)}
                    </div>
                  ))}
                  {!currentFields.length ? <p className="sm:col-span-2 text-sm text-muted-foreground">Tidak ada informasi tambahan pada langkah ini.</p> : null}
                </div>

                {stepIndex === steps.length - 1 ? (
                  <section className="mt-8 border-t border-border pt-5" aria-labelledby="draft-check-heading">
                    <h3 id="draft-check-heading" className="text-lg font-bold">Periksa kesiapan pengajuan</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Dapatkan saran untuk memperjelas jawaban bisnis sebelum dikirim. Pemeriksaan draf ini hanya membaca isian, belum membaca berkas.</p>
                    {answers.aiConsent !== "true" ? <p className="mt-2 text-sm">Aktifkan persetujuan analisis AI untuk menggunakan pemeriksaan ini.</p> : null}
                    <Button className="mt-4" type="button" variant="outline" disabled={isCheckingDraft || answers.aiConsent !== "true"} onClick={() => void checkDraft()}>
                      {isCheckingDraft ? "Memeriksa draf…" : "Periksa draf dengan AI"}
                    </Button>
                    <div role="status" aria-live="polite" className="mt-3 text-sm">
                      {currentCheck?.error}
                      {currentCheck?.result ? <>
                        <p>{currentCheck.result.source === "gemini" ? "Saran AI berdasarkan jawaban Anda." : currentCheck.result.reviewNote}</p>
                        <p className="mt-2">{currentCheck.result.summary}</p>
                        {currentCheck.result.actions.length ? <ul className="mt-4 space-y-4">
                          {currentCheck.result.actions.map((action) => <li key={action.fieldId}>
                            <strong>{program.fields.find((field) => field.id === action.fieldId)?.label}</strong>
                            <p className="mt-1 text-muted-foreground">{action.evidence ? `Dasar: “${action.evidence}”` : "Belum diisi."}</p>
                            <p className="mt-1">{action.suggestion}</p>
                            <Button className="mt-2" variant="link" type="button" onClick={() => {
                              const index = steps.findIndex((step) => step.fields.some((field) => field.id === action.fieldId));
                              if (index >= 0) {
                                setStepIndex(index);
                                window.setTimeout(() => document.getElementById(action.fieldId)?.focus(), 0);
                              }
                            }}>Perbaiki jawaban</Button>
                          </li>)}
                        </ul> : <p className="mt-2">Tidak ada saran per kolom. Tetap periksa kelengkapan dan kebenaran data.</p>}
                      </> : null}
                    </div>
                  </section>
                ) : null}

                <div className="mt-8 border-t border-border pt-5">
                  <p className="mb-4 text-xs text-muted-foreground">Isian dan langkah tersimpan otomatis di perangkat ini. Setelah memuat ulang halaman, pilih kembali berkas.</p>
                  {notice ? <p className="mb-4 text-sm font-semibold" role="status" aria-live="polite">{notice}</p> : null}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      {stepIndex > 0 ? <Button variant="secondary" type="button" onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>Kembali</Button> : <Button variant="outline" nativeButton={false} render={<Link href="/" />}>Batal</Button>}
                      <Button className="h-auto px-1" variant="link" type="button" onClick={saveDraft}>Simpan draf</Button>
                    </div>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan berkas…" : stepIndex === steps.length - 1 ? "Kirim pengajuan" : "Lanjutkan"}</Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </section>

        <aside className="surface-card border-t-4 border-t-secondary p-5 sm:p-6">
          <h2 className="text-lg font-bold">Informasi program</h2>
          <dl className="mt-4 divide-y divide-border text-sm">
            <div className="py-3 first:pt-0"><dt className="text-muted-foreground">Model</dt><dd className="mt-1 font-bold">{program.operatingModel}</dd></div>
            <div className="py-3"><dt className="text-muted-foreground">Area</dt><dd className="mt-1 font-bold">{program.locations}</dd></div>
            <div className="py-3"><dt className="text-muted-foreground">Informasi investasi</dt><dd className="mt-1 font-bold">{program.investmentLabel}</dd></div>
          </dl>
          <p className="mt-3 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Berkas tersimpan di perangkat ini.</p>
        </aside>
      </div>
    </div>
  );
}
