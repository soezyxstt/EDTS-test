import type { ProgramField, ScreeningRule } from "./demo-data";

export type ScreeningOutcome = "pass" | "warning" | "reject";

export type ScreeningCheck = {
  id: string;
  label: string;
  outcome: ScreeningOutcome;
  reason: string;
};

export type ScreeningResult = {
  outcome: ScreeningOutcome;
  reasons: string[];
  checks: ScreeningCheck[];
};

export function scoreScreening(result: ScreeningResult) {
  const rejects = result.checks.filter((check) => check.outcome === "reject").length;
  const warnings = result.checks.filter((check) => check.outcome === "warning").length;
  return Math.max(0, Math.min(100, 100 - rejects * 40 - warnings * 12));
}

type RuleOperator = "present" | "equals" | "contains" | "gte";
type EvaluatedRule = ScreeningRule & {
  fieldId?: string;
  operator?: RuleOperator;
  value?: string | number;
};

const answerFor = (answers: Readonly<Record<string, string>>, fieldId: string) =>
  typeof answers[fieldId] === "string" ? answers[fieldId].trim() : "";

const pass = (id: string, label: string, reason = "Terpenuhi."): ScreeningCheck => ({ id, label, outcome: "pass", reason });

function readNumber(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return undefined;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}

function failure(rule: EvaluatedRule, reason: string): ScreeningCheck {
  return {
    id: rule.id,
    label: rule.label,
    outcome: rule.id === "identity" || rule.hardFail ? "reject" : "warning",
    reason,
  };
}

function evaluateConfiguredRule(
  rule: EvaluatedRule,
  fields: readonly ProgramField[],
  answers: Readonly<Record<string, string>>,
): ScreeningCheck {
  const field = fields.find((item) => item.id === rule.fieldId);
  if (!field) return { id: rule.id, label: rule.label, outcome: "warning", reason: "Bidang aturan tidak ditemukan." };

  const actual = answerFor(answers, field.id);
  const operator = rule.operator ?? "present";
  if (operator === "present") {
    return actual ? pass(rule.id, rule.label) : failure(rule, `${field.label} belum diisi.`);
  }

  if (rule.value === undefined || String(rule.value).trim() === "") {
    return { id: rule.id, label: rule.label, outcome: "warning", reason: "Nilai pembanding aturan belum diatur." };
  }

  const expected = String(rule.value).trim();
  const actualNormalized = actual.toLocaleLowerCase("id-ID");
  const expectedNormalized = expected.toLocaleLowerCase("id-ID");

  if (operator === "equals") {
    return actualNormalized === expectedNormalized
      ? pass(rule.id, rule.label)
      : failure(rule, `${field.label} belum sesuai aturan.`);
  }

  if (operator === "contains") {
    return actualNormalized.includes(expectedNormalized)
      ? pass(rule.id, rule.label)
      : failure(rule, `${field.label} belum memuat keterangan yang diminta.`);
  }

  if (operator === "gte") {
    const actualNumber = readNumber(actual);
    const expectedNumber = readNumber(rule.value);
    if (actualNumber === undefined || expectedNumber === undefined) {
      return { id: rule.id, label: rule.label, outcome: "warning", reason: `Nilai ${field.label} perlu ditinjau manual.` };
    }
    return actualNumber >= expectedNumber
      ? pass(rule.id, rule.label)
      : failure(rule, `${field.label} belum memenuhi nilai minimum.`);
  }

  return { id: rule.id, label: rule.label, outcome: "warning", reason: "Operator aturan tidak didukung." };
}

function evaluateKnownRule(
  rule: EvaluatedRule,
  fields: readonly ProgramField[],
  answers: Readonly<Record<string, string>>,
): ScreeningCheck {
  if (rule.fieldId) return evaluateConfiguredRule(rule, fields, answers);

  if (rule.id === "identity") {
    const identityIds = ["fullName", "email", "phone"];
    const missing = identityIds.filter((id) => !answerFor(answers, id));
    return missing.length
      ? failure(rule, `Lengkapi identitas: ${missing.map((id) => fields.find((field) => field.id === id)?.label ?? id).join(", ")}.`)
      : pass(rule.id, rule.label);
  }

  if (rule.id === "investment") {
    const field = fields.find((item) => item.id === "investmentCapacity");
    if (!field || field.type !== "select" || !field.options?.length) {
      return { id: rule.id, label: rule.label, outcome: "warning", reason: "Pilihan kapasitas investasi belum dikonfigurasi." };
    }
    const selected = answerFor(answers, field.id);
    return selected && field.options.includes(selected)
      ? pass(rule.id, rule.label)
      : failure(rule, selected ? "Pilih opsi kapasitas investasi yang tersedia." : "Pilih kapasitas investasi.");
  }

  if (rule.id === "experience") {
    return answerFor(answers, "experience")
      ? pass(rule.id, rule.label)
      : failure(rule, "Isi pengalaman bisnis.");
  }

  if (rule.id === "location") {
    const locationFields = fields.filter((field) => ["city", "siteAddress", "sitePhotos"].includes(field.id));
    if (!locationFields.length) {
      return { id: rule.id, label: rule.label, outcome: "warning", reason: "Bidang lokasi belum dikonfigurasi." };
    }
    const missing = locationFields.filter((field) => !answerFor(answers, field.id));
    return missing.length
      ? failure(rule, `Lengkapi informasi lokasi: ${missing.map((field) => field.label).join(", ")}.`)
      : pass(rule.id, rule.label);
  }

  return { id: rule.id, label: rule.label, outcome: "warning", reason: "Aturan belum terhubung ke pemeriksaan." };
}

/** Evaluates required form values and each enabled deterministic screening rule. */
export function evaluateScreening(
  rules: readonly ScreeningRule[],
  fields: readonly ProgramField[],
  answers: Readonly<Record<string, string>>,
): ScreeningResult {
  const checks: ScreeningCheck[] = [];
  const requiredMissing = fields.filter((field) => {
    const visible = !field.condition || Boolean(answerFor(answers, field.condition));
    return visible && field.required && !answerFor(answers, field.id);
  });

  checks.push(requiredMissing.length
    ? {
        id: "required-fields",
        label: "Kolom wajib",
        outcome: "reject",
        reason: `Lengkapi kolom wajib: ${requiredMissing.map((field) => field.label).join(", ")}.`,
      }
    : pass("required-fields", "Kolom wajib", "Semua kolom wajib sudah diisi."));

  checks.push(...rules
    .filter((rule) => rule.enabled)
    .map((rule) => evaluateKnownRule(rule as EvaluatedRule, fields, answers)));

  const outcome: ScreeningOutcome = checks.some((check) => check.outcome === "reject")
    ? "reject"
    : checks.some((check) => check.outcome === "warning")
      ? "warning"
      : "pass";
  const reasons = [...new Set(checks.filter((check) => check.outcome !== "pass").map((check) => check.reason))];

  return { outcome, reasons, checks };
}
