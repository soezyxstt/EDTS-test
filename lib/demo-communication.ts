import { readWorkspaceIdentity } from "@/lib/demo-session";

export const MAX_MESSAGE_LENGTH = 2000;
export const DEMO_COMMUNICATION_EVENT = "franchise-prototype:communication-update";

export type DemoMessage = {
  id: string;
  createdAt: string;
  authorName: string;
  authorRole: "applicant" | "franchisor";
  body: string;
};

export type DemoReminder = { sentAt: string; activityAt: string };
export type DemoCommunication = { messages: DemoMessage[]; reminder?: DemoReminder };

const STORAGE_PREFIX = "franchise-prototype:communication:v1:";
const EMPTY_COMMUNICATION: DemoCommunication = { messages: [] };
const FIVE_DAYS = 5 * 24 * 60 * 60 * 1000;

function storageKey(applicationId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(applicationId)}`;
}

function publish() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DEMO_COMMUNICATION_EVENT));
}

export function readDemoCommunication(applicationId: string): DemoCommunication {
  if (typeof window === "undefined") return EMPTY_COMMUNICATION;
  try {
    const raw = window.localStorage.getItem(storageKey(applicationId));
    if (!raw) return EMPTY_COMMUNICATION;
    const saved = JSON.parse(raw) as Partial<DemoCommunication>;
    const messages = Array.isArray(saved.messages) ? saved.messages.filter((item): item is DemoMessage =>
      typeof item?.id === "string" && typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)) &&
      typeof item.authorName === "string" && (item.authorRole === "applicant" || item.authorRole === "franchisor") &&
      typeof item.body === "string" && item.body.length <= MAX_MESSAGE_LENGTH,
    ) : [];
    const reminder = saved.reminder && typeof saved.reminder.sentAt === "string" && Number.isFinite(Date.parse(saved.reminder.sentAt)) &&
      typeof saved.reminder.activityAt === "string" && Number.isFinite(Date.parse(saved.reminder.activityAt))
      ? saved.reminder
      : undefined;
    return reminder ? { messages, reminder } : { messages };
  } catch {
    return EMPTY_COMMUNICATION;
  }
}

function writeDemoCommunication(applicationId: string, value: DemoCommunication) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(applicationId), JSON.stringify(value));
    publish();
  } catch {
    throw new Error("Tidak dapat menyimpan pesan di browser ini.");
  }
}

export function addDemoMessage(applicationId: string, body: string): DemoCommunication {
  if (body.length > MAX_MESSAGE_LENGTH) throw new RangeError(`Pesan maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
  const trimmed = body.trim();
  if (!trimmed) throw new RangeError("Tulis pesan sebelum mengirim.");
  const identity = readWorkspaceIdentity();
  const current = readDemoCommunication(applicationId);
  const message: DemoMessage = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    authorName: identity.name,
    authorRole: identity.role,
    body: trimmed,
  };
  const next = { ...current, messages: [...current.messages, message] };
  writeDemoCommunication(applicationId, next);
  return next;
}

export function recordDemoReminder(applicationId: string, activityAt: string): DemoCommunication {
  const next = {
    ...readDemoCommunication(applicationId),
    reminder: { sentAt: new Date().toISOString(), activityAt },
  };
  writeDemoCommunication(applicationId, next);
  return next;
}

export function isReminderDue(stage: string, lastActivityAt: string, reminder: DemoReminder | undefined, now = Date.now()) {
  if (stage === "approved" || stage === "rejected") return false;
  const activityTime = Date.parse(lastActivityAt);
  return Number.isFinite(activityTime) && now - activityTime >= FIVE_DAYS && reminder?.activityAt !== lastActivityAt;
}
