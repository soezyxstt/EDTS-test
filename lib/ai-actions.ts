import type { ProgramField } from "./demo-data";

export type ReviewAction = { fieldId: string; evidence: string; suggestion: string };

// Business answers only; identity, consent and file names do not help coaching.
export function isCoachableField(field: Pick<ProgramField, "id" | "type">) {
  return !["file", "checkbox", "email", "tel", "location"].includes(field.type)
    && !/(name|email|phone|age|address|ktp|npwp|nib|identity|sitepin|consent|gender|government|resume)/i.test(field.id);
}

export function normalizeActions(
  value: unknown,
  fields: readonly Pick<ProgramField, "id" | "type">[],
  answers: Readonly<Record<string, string>>,
): ReviewAction[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { fieldId, evidence, suggestion } = item as Record<string, unknown>;
    if (typeof fieldId !== "string" || typeof evidence !== "string" || typeof suggestion !== "string") return [];
    const field = fields.find((field) => field.id === fieldId && isCoachableField(field));
    if (!field || seen.has(fieldId) || !suggestion.trim()) return [];
    const answer = (answers[fieldId] ?? "").trim();
    const quote = evidence.trim();
    // Empty evidence is valid only for missing answers; other evidence must be verbatim.
    if (answer ? !quote || quote.length > 300 || !answer.includes(quote) : quote !== "") return [];
    seen.add(fieldId);
    return [{ fieldId, evidence: quote, suggestion: suggestion.trim().slice(0, 500) }];
  }).slice(0, 5);
}
