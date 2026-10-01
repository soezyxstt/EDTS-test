"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_SESSION_EVENT, readWorkspaceIdentity, type WorkspaceIdentity } from "@/lib/demo-session";
import {
  addDemoMessage,
  DEMO_COMMUNICATION_EVENT,
  isReminderDue,
  MAX_MESSAGE_LENGTH,
  readDemoCommunication,
  recordDemoReminder,
  type DemoCommunication,
} from "@/lib/demo-communication";
import type { ApplicationStage } from "@/lib/demo-data";

type CommunicationPanelProps = {
  applicationId: string;
  submittedAt: string;
  stage: ApplicationStage;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
}

export function CommunicationPanel({ applicationId, submittedAt, stage }: CommunicationPanelProps) {
  const [communication, setCommunication] = useState<DemoCommunication>({ messages: [] });
  const [identity, setIdentity] = useState<WorkspaceIdentity>(() => readWorkspaceIdentity());
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const refresh = () => {
      setCommunication(readDemoCommunication(applicationId));
      setIdentity(readWorkspaceIdentity());
    };
    refresh();
    window.addEventListener(DEMO_COMMUNICATION_EVENT, refresh);
    window.addEventListener(DEMO_SESSION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(DEMO_COMMUNICATION_EVENT, refresh);
      window.removeEventListener(DEMO_SESSION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [applicationId]);

  const latestMessage = communication.messages.reduce<(typeof communication.messages)[number] | undefined>(
    (latest, message) => latest === undefined || Date.parse(message.createdAt) > Date.parse(latest.createdAt) ? message : latest,
    undefined,
  );
  const lastActivityAt = latestMessage?.createdAt ?? submittedAt;
  const reminderDue = isReminderDue(stage, lastActivityAt, communication.reminder);
  const reminderRecordedForLatestActivity = communication.reminder?.activityAt === lastActivityAt;

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setCommunication(addDemoMessage(applicationId, body));
      setBody("");
      setStatus("Pesan tersimpan di browser ini.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pesan tidak dapat disimpan.");
    }
  }

  function markReminder() {
    try {
      setCommunication(recordDemoReminder(applicationId, lastActivityAt));
      setStatus("Pengingat dicatat sebagai terkirim di browser ini.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Pengingat tidak dapat dicatat.");
    }
  }

  return (
    <section aria-labelledby="communication-heading" className="surface-card p-5">
      <h2 className="m-0 text-lg font-bold" id="communication-heading">Pesan</h2>
      <ol aria-label="Riwayat pesan" className="my-4 divide-y divide-[var(--line)]">
        {communication.messages.length ? communication.messages.map((message) => (
          <li className="py-4 first:pt-0 last:pb-0" key={message.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="m-0 text-sm font-bold">{message.authorName}<span className="font-normal"> · {message.authorRole === "applicant" ? "Pemohon" : "Tim franchisor"}</span></p>
              <time className="text-xs text-[var(--text-muted)]" dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
            </div>
            <p className="mb-0 mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
          </li>
        )) : <li className="py-4 text-sm text-[var(--text-muted)]">Belum ada pesan.</li>}
      </ol>

      <form className="border-t border-[var(--line)] pt-4" onSubmit={sendMessage}>
        <label className="field-label" htmlFor={`message-${applicationId}`}>Tulis pesan</label>
        <Textarea
          className="min-h-24 resize-y"
          id={`message-${applicationId}`}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setBody(event.target.value)}
          required
          value={body}
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-muted)]">{body.length}/{MAX_MESSAGE_LENGTH}</span>
          <Button type="submit">Kirim pesan</Button>
        </div>
      </form>

      {identity.role === "franchisor" && (
        <div aria-label="Pengingat tindak lanjut" className="mt-5 border-t border-[var(--line)] pt-4">
          <h3 className="m-0 text-sm font-bold">Pengingat</h3>
          <p aria-live="polite" className="mb-0 mt-2 text-sm text-[var(--text-muted)]" role="status">
            {reminderDue
              ? "Tidak ada aktivitas selama 5 hari."
              : reminderRecordedForLatestActivity
                ? `Pengingat dicatat pada ${formatDate(communication.reminder!.sentAt)}.`
                : stage === "approved" || stage === "rejected"
                  ? "Aplikasi sudah ditutup."
                  : "Belum perlu pengingat."}
          </p>
          {reminderDue && <Button className="mt-3" variant="secondary" onClick={markReminder} type="button">Catat sebagai terkirim</Button>}
          {reminderRecordedForLatestActivity && <p className="mb-0 mt-1 text-xs text-[var(--text-muted)]">Tersimpan di browser ini. Email tidak dikirim.</p>}
        </div>
      )}
      <p aria-live="polite" className="sr-only" role="status">{status}</p>
    </section>
  );
}
