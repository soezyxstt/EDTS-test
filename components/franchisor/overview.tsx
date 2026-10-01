"use client";

import Link from "next/link";
import { APPLICATION_STAGES } from "@/lib/demo-data";
import styles from "./franchisor.module.css";
import { useDemoApplications } from "./use-demo-applications";

const closedStages = ["approved", "rejected"];
const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export function FranchisorOverview() {
  const applications = useDemoApplications();
  const active = applications.filter((application) => !closedStages.includes(application.stage));
  const submitted = applications.filter((application) => application.stage === "submitted").length;
  const revisions = applications.filter((application) => application.stage === "revision").length;
  const averageScore = active.length
    ? Math.round(active.reduce((total, application) => total + application.score, 0) / active.length)
    : 0;
  const recentApplications = [...applications]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 4);
  const maxStageCount = Math.max(1, ...APPLICATION_STAGES.map(({ id }) =>
    applications.filter((application) => application.stage === id).length,
  ));

  return (
    <main className={`container-wide ${styles.page}`}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Ringkasan</h1>
        </div>
      </header>

      <section className={styles.overviewGrid} aria-label="Ikhtisar aplikasi">
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Aplikasi aktif</p>
          <strong className={styles.metricValue}>{active.length}</strong>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Baru masuk</p>
          <strong className={styles.metricValue}>{submitted}</strong>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Perlu revisi</p>
          <strong className={styles.metricValue}>{revisions}</strong>
        </div>
        <div className={styles.metric}>
          <p className={styles.metricLabel}>Rata-rata skor aktif</p>
          <strong className={styles.metricValue}>{averageScore}</strong>
        </div>
      </section>

      <div className={styles.contentGrid}>
        <section className={styles.panel} aria-labelledby="recent-title">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="recent-title" className={styles.sectionTitle}>Aplikasi terbaru</h2>
            </div>
            <Link className={styles.panelLink} href="/manage/applications">Semua aplikasi</Link>
          </div>
          {recentApplications.length ? (
            <div className={styles.applicationRows}>
              {recentApplications.map((application) => (
                <div className={styles.applicationRow} key={application.id}>
                  <div>
                    <Link className={styles.personName} href={`/manage/applications/${application.id}`}>
                      {application.applicantName}
                    </Link>
                    <span className={styles.subText}>{application.reference}</span>
                  </div>
                  <span>{application.programName}</span>
                  <span className={styles.plainStatus}>
                    {application.withdrawnAt ? "Dibatalkan pemohon" : APPLICATION_STAGES.find(({ id }) => id === application.stage)?.label}
                  </span>
                  <span className={styles.subText}>{dateFormat.format(new Date(application.submittedAt))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyState}>Belum ada aplikasi.</p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="stages-title">
          <div className={styles.panelHeader}>
            <div>
              <h2 id="stages-title" className={styles.sectionTitle}>Tahap aplikasi</h2>
            </div>
            <Link className={styles.panelLink} href="/manage/pipeline">Buka pipeline</Link>
          </div>
          <div className={`${styles.panelBody} ${styles.stageList}`}>
            {APPLICATION_STAGES.map((stage) => {
              const count = applications.filter((application) => application.stage === stage.id).length;
              return (
                <div className={styles.stageRow} key={stage.id}>
                  <span className={styles.stageName}>{stage.label}</span>
                  <div className={styles.stageTrack} aria-hidden="true">
                    <div className={styles.stageFill} style={{ width: `${(count / maxStageCount) * 100}%` }} />
                  </div>
                  <span className={styles.stageCount}>{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
