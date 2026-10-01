"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPLICATION_STAGES,
  readDemoPrograms,
  updateDemoApplication,
  type ProgramField,
} from "@/lib/demo-data";
import styles from "./franchisor.module.css";
import { useDemoApplications } from "./use-demo-applications";
import { ProposalEditor } from "./proposal-editor";
import { DemoFileLink } from "@/components/demo-file-link";
import { CommunicationPanel } from "@/components/communication-panel";
import { googleMapsUrl } from "@/lib/location";

function groupFields(fields: ProgramField[]) {
  const groups = new Map<string, ProgramField[]>();
  fields.forEach((field) => {
    const section = field.section?.trim() ?? "";
    groups.set(section, [...(groups.get(section) ?? []), field]);
  });
  return [...groups.entries()];
}

export function ApplicationReview({ applicationId }: { applicationId: string }) {
  const applications = useDemoApplications();
  const [revisionText, setRevisionText] = useState("");
  const [revisionFieldIds, setRevisionFieldIds] = useState<string[]>([]);
  const [programFields, setProgramFields] = useState<ProgramField[]>([]);
  const [notice, setNotice] = useState("");
  const application = applications.find((item) => item.id === applicationId);
  const answerGroups = groupFields(programFields.filter((field) => field.type !== "file"
    && Boolean(application?.answers[field.id]?.trim())));

  useEffect(() => {
    const refresh = () => setProgramFields(readDemoPrograms().find((item) => item.id === application?.programId)?.fields ?? []);
    refresh();
    window.addEventListener("franchise-prototype:update", refresh);
    return () => window.removeEventListener("franchise-prototype:update", refresh);
  }, [application?.programId]);

  function changeStage(stage: string) {
    if (!application) return;
    updateDemoApplication(application.id, { stage: stage as typeof application.stage });
    setNotice(`Tahap diubah menjadi ${APPLICATION_STAGES.find((item) => item.id === stage)?.label ?? stage}.`);
  }

  function requestRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const selectedFields = revisionFieldIds.flatMap((id) => {
      const field = programFields.find((item) => item.id === id);
      return field ? [field] : [];
    });
    const labels = selectedFields.map((field) => field.label);
    const notes = revisionText.split("\n").map((item) => item.trim()).filter(Boolean);
    if (!labels.length) {
      setNotice("Pilih field yang perlu diperbarui.");
      return;
    }
    updateDemoApplication(application.id, { stage: "revision", revisionItems: labels, revisionFieldIds: selectedFields.map((field) => field.id), revisionNotes: notes });
    setRevisionFieldIds([]);
    setRevisionText("");
    setNotice("Permintaan revisi tersimpan. Pemohon dapat melihat daftar ini di ruang aplikasinya.");
  }

  if (!application) {
    return (
      <main className={`container-wide ${styles.page}`}>
        <p>Aplikasi tidak ditemukan.</p>
        <Link className={styles.backLink} href="/manage/applications">Kembali ke daftar aplikasi</Link>
      </main>
    );
  }

  return (
    <main className={`container-wide ${styles.page}`}>
      <Link className={styles.backLink} href="/manage/applications">Kembali ke aplikasi</Link>
      <header className={styles.detailsTop}>
        <div>
          <p className={styles.kicker}>{application.programName}</p>
          <h1>{application.applicantName}</h1>
          <p className={styles.reference}>{application.reference} · Dikirim {new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(application.submittedAt))}</p>
        </div>
        <div className={styles.toolField}>
          <label htmlFor="application-stage">Tahap aplikasi</label>
          <Select
            id="application-stage"
            onChange={(event) => changeStage(event.target.value)}
            value={application.stage}
          >
            {APPLICATION_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </Select>
        </div>
      </header>

      <div className={styles.actionGrid}>
        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="summary-heading">
            <div className={styles.panelHeader}><h2 id="summary-heading" className={styles.sectionTitle}>Ringkasan</h2></div>
            <div className={styles.panelBody}>
              <p className={styles.summaryText}>{application.summary}</p>
              {application.reviewSource ? <p className={styles.sectionIntro}>{application.reviewSource === "pending" ? "Gemini sedang menyiapkan ringkasan…" : application.reviewSource === "gemini" ? "Ringkasan dan rekomendasi awal oleh Gemini." : "Ringkasan dari pemeriksaan aturan."}</p> : null}
              {application.reviewNote ? <p className={styles.sectionIntro}>{application.reviewNote}</p> : null}
              {application.followUpQuestions?.length ? (
                <div className={styles.formStack} style={{ marginTop: 18 }}>
                  <strong className={styles.fieldLabel}>Pertanyaan tindak lanjut</strong>
                  <ul className={styles.plainList}>{application.followUpQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
                </div>
              ) : null}
            </div>
          </section>

          {application.locationAssessment ? (
            <section className={styles.panel} aria-labelledby="location-assessment-heading">
              <div className={styles.panelHeader}>
                <h2 id="location-assessment-heading" className={styles.sectionTitle}>Penilaian lokasi awal</h2>
                <strong className={styles.plainStatus}>{application.locationAssessment.rating === "promising" ? "Berpotensi" : application.locationAssessment.rating === "needs-review" ? "Perlu ditinjau" : "Data belum cukup"}</strong>
              </div>
              <div className={styles.panelBody}>
                <p className={styles.summaryText}>{application.locationAssessment.summary}</p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <div><strong className={styles.fieldLabel}>Sinyal yang disebutkan</strong>{application.locationAssessment.signals.length ? <ul className={styles.plainList}>{application.locationAssessment.signals.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.sectionIntro}>Belum ada.</p>}</div>
                  <div><strong className={styles.fieldLabel}>Perlu dilengkapi</strong>{application.locationAssessment.gaps.length ? <ul className={`${styles.plainList} ${styles.concerns}`}>{application.locationAssessment.gaps.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.sectionIntro}>Tidak ada catatan tambahan.</p>}</div>
                </div>
                <p className={styles.sectionIntro}>Penilaian berdasarkan data pemohon, bukan survei pasar atau pemeriksaan lapangan.</p>
              </div>
            </section>
          ) : null}

          {application.screening?.checks.length ? (
            <section className={styles.panel} aria-labelledby="screening-heading">
              <div className={styles.panelHeader}><h2 id="screening-heading" className={styles.sectionTitle}>Pemeriksaan awal</h2></div>
              <div className={styles.panelBody}>
                <ul className={styles.plainList}>
                  {application.screening.checks.map((check) => (
                    <li key={check.id}><strong>{check.outcome === "pass" ? "Lolos" : check.outcome === "reject" ? "Tidak lolos" : "Perlu ditinjau"}:</strong> {check.label}. {check.reason}</li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          <div className={styles.twoColumn}>
            <section className={styles.panel} aria-labelledby="strengths-heading">
              <div className={styles.panelHeader}><h2 id="strengths-heading" className={styles.sectionTitle}>Kekuatan</h2></div>
              <div className={styles.panelBody}>
                {application.strengths.length ? <ul className={styles.plainList}>{application.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.sectionIntro}>Belum ada catatan.</p>}
              </div>
            </section>
            <section className={styles.panel} aria-labelledby="concerns-heading">
              <div className={styles.panelHeader}><h2 id="concerns-heading" className={styles.sectionTitle}>Hal yang perlu ditinjau</h2></div>
              <div className={styles.panelBody}>
                {application.concerns.length ? <ul className={`${styles.plainList} ${styles.concerns}`}>{application.concerns.map((item) => <li key={item}>{item}</li>)}</ul> : <p className={styles.sectionIntro}>Belum ada catatan.</p>}
              </div>
            </section>
          </div>

          <section className={styles.scorePanel} aria-label={`Skor pemeriksaan aturan ${application.score} dari 100`}>
            <strong className={styles.scoreValue}>{application.score}<small>/100</small></strong>
            <div className={styles.scoreCopy}>
              <strong>Skor pemeriksaan aturan</strong>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="applicant-heading">
            <div className={styles.panelHeader}><h2 id="applicant-heading" className={styles.sectionTitle}>Informasi pemohon</h2></div>
            <div className={styles.panelBody}>
              {answerGroups.length ? answerGroups.map(([section, fields]) => (
                <div key={section || "answers"} className={styles.formStack}>
                  {section ? <h3 className={styles.fieldLabel}>{section}</h3> : null}
                  <dl className={styles.definitionList}>
                    {fields.map((field) => (
                      <div key={field.id}>
                        <dt>{field.label}</dt>
                        <dd>{field.type === "checkbox" ? (application.answers[field.id] === "true" ? "Ya" : "Tidak") : field.type === "location" ? (googleMapsUrl(application.answers[field.id]) ? <a className={styles.panelLink} href={googleMapsUrl(application.answers[field.id])} target="_blank" rel="noreferrer">Lihat titik di Google Maps</a> : "Belum dipilih") : application.answers[field.id]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )) : (
                <dl className={styles.definitionList}>
                  <div><dt>Email</dt><dd>{application.email}</dd></div>
                  <div><dt>Telepon</dt><dd>{application.phone}</dd></div>
                  <div><dt>Kota</dt><dd>{application.city}</dd></div>
                  <div><dt>Kapasitas investasi</dt><dd>{application.investmentCapacity ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(application.investmentCapacity) : "Tidak dicantumkan"}</dd></div>
                  <div><dt>Pengalaman</dt><dd>{application.experience}</dd></div>
                  <div><dt>Catatan lokasi</dt><dd>{application.locationNotes}</dd></div>
                </dl>
              )}
              <div className={styles.toolField} style={{ marginTop: 20 }}>
                <label htmlFor="reviewer-owner">Penanggung jawab</label>
                <Select
                  id="reviewer-owner"
                  onChange={(event) => updateDemoApplication(application.id, { owner: event.target.value })}
                  value={application.owner}
                >
                  {["Dimas Pratama", "Sari Wibowo", "Tim Franchise"].map((reviewer) => <option key={reviewer} value={reviewer}>{reviewer}</option>)}
                </Select>
              </div>
            </div>
          </section>

          <section className={styles.panel} aria-labelledby="documents-heading">
            <div className={styles.panelHeader}><h2 id="documents-heading" className={styles.sectionTitle}>Dokumen</h2></div>
            <div className={styles.panelBody}>
              {application.documentFindings?.length ? (
                <div className={styles.formStack} style={{ marginBottom: 18 }}>
                  <strong className={styles.fieldLabel}>Ekstraksi OCR awal</strong>
                  {application.documentFindings.map((finding) => (
                    <div key={finding.fieldId}>
                      <strong className={styles.fieldLabel}>{finding.fieldId === "businessProfile" ? "Profil bisnis" : "Ringkasan finansial"}</strong>
                      <p className={styles.sectionIntro}>{finding.summary}</p>
                      {finding.verificationItems.length ? <ul className={styles.concerns}>{finding.verificationItems.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                    </div>
                  ))}
                  <p className={styles.sectionIntro}>Temuan otomatis perlu dicocokkan dengan dokumen asli.</p>
                </div>
              ) : null}
              {application.documentNote ? <p className={styles.sectionIntro}>{application.documentNote}</p> : null}
              {application.documents.length ? (
                <div className={styles.documentList}>
                  {application.documents.map((document) => (
                    <div className={styles.documentRow} key={document.fieldId ?? document.name}>
                      <span><DemoFileLink applicationId={application.id} fieldId={document.fieldId} name={document.name} /></span>
                      <span className={styles.documentState}>{document.status === "received" ? "Diterima" : "Perlu diperbarui"}</span>
                    </div>
                  ))}
                </div>
              ) : <p className={styles.sectionIntro}>Belum ada dokumen yang dilampirkan.</p>}
            </div>
          </section>
        </div>

        <aside className={styles.stack} aria-label="Tindakan peninjau">
          <ProposalEditor key={application.id} application={application} />

          <CommunicationPanel applicationId={application.id} submittedAt={application.submittedAt} stage={application.stage} />

          <section className={styles.panel} aria-labelledby="revision-heading">
            <div className={styles.panelHeader}><h2 id="revision-heading" className={styles.sectionTitle}>Minta revisi</h2></div>
            <form className={`${styles.panelBody} ${styles.formStack}`} onSubmit={requestRevision}>
              {application.revisionItems.length > 0 ? (
                <div className={styles.formStack}>
                  <strong className={styles.fieldLabel}>Permintaan revisi aktif</strong>
                  <ul className={styles.plainList}>{application.revisionItems.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              ) : null}
              {programFields.length ? (
                <details>
                  <summary className={styles.fieldLabel}>Pilih field yang perlu diperbarui{revisionFieldIds.length ? ` (${revisionFieldIds.length})` : ""}</summary>
                  <fieldset className={styles.formStack} style={{ border: 0, margin: 0, padding: "12px 0 0" }}>
                    <legend className="sr-only">Field revisi</legend>
                    {programFields.map((field) => (
                      <label key={field.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={revisionFieldIds.includes(field.id)}
                          onChange={(event) => setRevisionFieldIds((current) => event.target.checked ? [...current, field.id] : current.filter((id) => id !== field.id))}
                          style={{ accentColor: "var(--mcd-red)" }}
                        />
                        {field.label}{field.type === "file" ? " · dokumen" : ""}
                      </label>
                    ))}
                  </fieldset>
                </details>
              ) : null}
              <label className={styles.fieldLabel} htmlFor="revision-items">Catatan tambahan, satu per baris</label>
              <Textarea
                id="revision-items"
                onChange={(event) => setRevisionText(event.target.value)}
                value={revisionText}
              />
              <Button type="submit">Kirim permintaan revisi</Button>
            </form>
          </section>
          <p className={styles.notice} aria-live="polite">{notice}</p>
        </aside>
      </div>
    </main>
  );
}
