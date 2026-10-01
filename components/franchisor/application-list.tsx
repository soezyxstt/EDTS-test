"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { APPLICATION_STAGES } from "@/lib/demo-data";
import styles from "./franchisor.module.css";
import { useDemoApplications } from "./use-demo-applications";

const dateFormat = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });

export function ApplicationList() {
  const applications = useDemoApplications();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("id-ID");
    return applications.filter((application) => {
      const matchesStage = stageFilter === "all" || application.stage === stageFilter;
      const searchable = [
        application.reference,
        application.applicantName,
        application.email,
        application.city,
        application.programName,
      ].join(" ").toLocaleLowerCase("id-ID");
      return matchesStage && (!term || searchable.includes(term));
    }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [applications, query, stageFilter]);

  return (
    <main className={`container-wide ${styles.page}`}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Aplikasi</h1>
        </div>
        <span className={styles.plainStatus}>{filtered.length} aplikasi</span>
      </header>

      <div className={styles.tableTools}>
        <div className={styles.toolField}>
          <label htmlFor="application-search">Cari aplikasi</label>
          <Input
            className="min-w-0"
            id="application-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nama, referensi, kota, atau program"
            type="search"
            value={query}
          />
        </div>
        <div className={styles.toolField}>
          <label htmlFor="stage-filter">Tahap</label>
          <Select
            className="min-w-0"
            id="stage-filter"
            onChange={(event) => setStageFilter(event.target.value)}
            value={stageFilter}
          >
            <option value="all">Semua tahap</option>
            {APPLICATION_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
          </Select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Pemohon</th>
              <th scope="col">Program</th>
              <th scope="col">Kota</th>
              <th scope="col">Tahap</th>
              <th scope="col">Skor</th>
              <th scope="col">Dikirim</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? filtered.map((application) => (
              <tr key={application.id}>
                <td>
                  <Link href={`/manage/applications/${application.id}`}>{application.applicantName}</Link>
                  <span className={styles.subText}>{application.reference}</span>
                </td>
                <td>{application.programName}</td>
                <td>{application.city}</td>
                <td>{application.withdrawnAt ? "Dibatalkan pemohon" : APPLICATION_STAGES.find(({ id }) => id === application.stage)?.label}</td>
                <td>{application.score}/100</td>
                <td>{dateFormat.format(new Date(application.submittedAt))}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className={styles.emptyState}>Tidak ada aplikasi yang cocok dengan pencarian ini.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
