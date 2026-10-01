"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateDemoApplication, type FranchiseApplication } from "@/lib/demo-data";
import styles from "./franchisor.module.css";

type Proposal = NonNullable<FranchiseApplication["proposal"]>;
type Terms = NonNullable<Proposal["terms"]>;

type Draft = { summary: string; amount: string; terms: Terms; attachments: string[] };

const EMPTY_TERMS: Terms = { area: "", operatingModel: "", duration: "", initialFee: "", royalty: "", conditions: "" };
const DRAFT_PREFIX = "franchise-prototype:proposal-draft:v1:";

function getProposal(application: FranchiseApplication) {
  return application.proposal;
}

function readDraft(application: FranchiseApplication): Draft {
  const proposal = getProposal(application);
  const previousSummary = proposal?.summary ?? "";
  const summary = previousSummary.includes("\n\nArea:") ? previousSummary.split("\n\nArea:")[0] : previousSummary;
  const fallback: Draft = {
    summary,
    amount: proposal?.amount ?? "",
    terms: { ...EMPTY_TERMS, ...proposal?.terms },
    attachments: proposal?.attachments ?? [],
  };
  try {
    const saved = window.localStorage.getItem(`${DRAFT_PREFIX}${application.id}`);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved) as Partial<Draft>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
      amount: typeof parsed.amount === "string" ? parsed.amount : fallback.amount,
      terms: { ...EMPTY_TERMS, ...parsed.terms },
      attachments: Array.isArray(parsed.attachments) ? parsed.attachments.filter((name): name is string => typeof name === "string") : fallback.attachments,
    };
  } catch {
    return fallback;
  }
}

export function ProposalEditor({ application }: { application: FranchiseApplication }) {
  const [draft, setDraft] = useState(() => readDraft(application));
  const [notice, setNotice] = useState("");
  const proposal = getProposal(application);
  const mutuallyApproved = proposal?.response === "accepted" && proposal.franchisorResponse === "accepted";
  const needsFranchisorApproval = proposal?.response === "accepted" && !proposal.franchisorResponse;
  const terminal = application.stage === "rejected" || mutuallyApproved;

  function updateDraft(changes: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...changes }));
    setNotice("");
  }

  function updateTerm(key: keyof Terms, value: string) {
    setDraft((current) => ({ ...current, terms: { ...current.terms, [key]: value } }));
    setNotice("");
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(`${DRAFT_PREFIX}${application.id}`, JSON.stringify(draft));
      setNotice("Draf proposal tersimpan.");
    } catch {
      setNotice("Draf tidak dapat disimpan di browser ini.");
    }
  }

  function sendProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.summary.trim() || !draft.amount.trim() || !draft.terms.area.trim() || !draft.terms.operatingModel.trim()) {
      setNotice("Lengkapi ringkasan, nilai indikatif, area, dan model operasional.");
      return;
    }

    const termsText = [
      ["Area", draft.terms.area],
      ["Model operasional", draft.terms.operatingModel],
      ["Durasi", draft.terms.duration],
      ["Biaya awal", draft.terms.initialFee],
      ["Royalti", draft.terms.royalty],
      ["Ketentuan", draft.terms.conditions],
      draft.attachments.length ? ["Lampiran", draft.attachments.join(", ")] : null,
    ].filter((item): item is [string, string] => Boolean(item?.[1].trim()));
    const summary = `${draft.summary.trim()}\n\n${termsText.map(([label, value]) => `${label}: ${value}`).join("\n")}`;
    const nextProposal: Proposal = {
      summary,
      amount: draft.amount.trim(),
      terms: draft.terms,
      attachments: draft.attachments,
      sentAt: new Date().toISOString(),
    };
    const updated = updateDemoApplication(application.id, {
      stage: "proposal",
      proposal: nextProposal,
    });
    if (!updated) {
      setNotice("Proposal tidak dapat dikirim. Muat ulang halaman dan coba lagi.");
      return;
    }
    window.localStorage.removeItem(`${DRAFT_PREFIX}${application.id}`);
    setNotice("Proposal dikirim. Persetujuan bersama menunggu respons pemohon.");
  }

  function confirmMutualApproval() {
    if (!proposal || proposal.response !== "accepted") return;
    const updated = updateDemoApplication(application.id, {
      stage: "approved",
      proposal: { ...proposal, franchisorResponse: "accepted" },
    });
    setNotice(updated ? "Persetujuan bersama tercatat." : "Persetujuan tidak dapat disimpan.");
  }

  return (
    <section className={styles.panel} aria-labelledby="proposal-heading">
      <div className={styles.panelHeader}><h2 id="proposal-heading" className={styles.sectionTitle}>Proposal</h2></div>
      <div className={`${styles.panelBody} ${styles.formStack}`}>
        {mutuallyApproved ? <p className={styles.notice} role="status">Disetujui bersama.</p> : null}
        {needsFranchisorApproval ? (
          <div className={styles.formStack}>
            <p className={styles.notice} role="status">Pemohon menerima. Konfirmasi persetujuan franchisor.</p>
            <Button type="button" onClick={confirmMutualApproval}>Konfirmasi persetujuan bersama</Button>
          </div>
        ) : null}
        {proposal && !needsFranchisorApproval && !mutuallyApproved ? (
          <p className={styles.notice} role="status">
            {proposal.response === "rejected" ? "Proposal ditolak pemohon." : proposal.response === "changes-requested" ? "Pemohon meminta perubahan." : proposal.sentAt ? "Menunggu respons pemohon." : "Proposal belum dikirim."}
          </p>
        ) : null}

        {proposal?.response === "changes-requested" && application.answers.proposalChangeRequest ? (
          <p className={styles.notice}>Catatan pemohon: {application.answers.proposalChangeRequest}</p>
        ) : null}

        {!terminal && !needsFranchisorApproval && application.stage !== "approved" ? (
          <form className={styles.formStack} onSubmit={sendProposal}>
            <div className={styles.formStack}>
              <label className={styles.fieldLabel} htmlFor="proposal-summary">Ringkasan</label>
              <Textarea id="proposal-summary" required value={draft.summary} onChange={(event) => updateDraft({ summary: event.target.value })} />
            </div>
            <div className={styles.toolField}>
              <label htmlFor="proposal-amount">Nilai investasi indikatif</label>
              <Input id="proposal-amount" required value={draft.amount} onChange={(event) => updateDraft({ amount: event.target.value })} />
            </div>
            <div className={styles.twoColumn}>
              <div className={styles.toolField}>
                <label htmlFor="proposal-area">Area</label>
                <Input id="proposal-area" required value={draft.terms.area} onChange={(event) => updateTerm("area", event.target.value)} />
              </div>
              <div className={styles.toolField}>
                <label htmlFor="proposal-model">Model operasional</label>
                <Input id="proposal-model" required value={draft.terms.operatingModel} onChange={(event) => updateTerm("operatingModel", event.target.value)} />
              </div>
              <div className={styles.toolField}>
                <label htmlFor="proposal-duration">Durasi</label>
                <Input id="proposal-duration" value={draft.terms.duration} onChange={(event) => updateTerm("duration", event.target.value)} placeholder="Contoh: 10 tahun" />
              </div>
              <div className={styles.toolField}>
                <label htmlFor="proposal-fee">Biaya awal</label>
                <Input id="proposal-fee" value={draft.terms.initialFee} onChange={(event) => updateTerm("initialFee", event.target.value)} />
              </div>
              <div className={styles.toolField}>
                <label htmlFor="proposal-royalty">Royalti</label>
                <Input id="proposal-royalty" value={draft.terms.royalty} onChange={(event) => updateTerm("royalty", event.target.value)} />
              </div>
              <div className={styles.toolField}>
                <label htmlFor="proposal-conditions">Ketentuan</label>
                <Input id="proposal-conditions" value={draft.terms.conditions} onChange={(event) => updateTerm("conditions", event.target.value)} />
              </div>
            </div>
            <div className={styles.formStack}>
              <label className={styles.fieldLabel} htmlFor="proposal-attachments">Lampiran</label>
              <Input id="proposal-attachments" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => {
                const names = Array.from(event.target.files ?? [], (file) => file.name);
                updateDraft({ attachments: [...new Set([...draft.attachments, ...names])] });
                event.target.value = "";
              }} />
              {draft.attachments.length ? (
                <ul className={styles.plainList}>
                  {draft.attachments.map((name) => <li key={name}>{name} <Button className="h-auto px-1 text-xs text-primary underline underline-offset-4" variant="link" type="button" onClick={() => updateDraft({ attachments: draft.attachments.filter((item) => item !== name) })} aria-label={`Hapus lampiran ${name}`}>Hapus</Button></li>)}
                </ul>
              ) : null}
              <p className={styles.sectionIntro}>Nama berkas disimpan untuk demo; file tidak diunggah.</p>
            </div>
            <div className={styles.twoColumn}>
              <Button variant="outline" type="button" onClick={saveDraft}>Simpan draf</Button>
              <Button type="submit">Kirim proposal</Button>
            </div>
          </form>
        ) : null}
        {notice ? <p className={styles.notice} aria-live="polite">{notice}</p> : null}
      </div>
    </section>
  );
}
