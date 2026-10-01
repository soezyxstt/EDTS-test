"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  APPLICATION_STAGES,
  updateDemoApplication,
} from "@/lib/demo-data";
import styles from "./franchisor.module.css";
import { useDemoApplications } from "./use-demo-applications";

export function ApplicationPipeline() {
  const applications = useDemoApplications();
  const [notice, setNotice] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const positioned = useRef(false);

  useEffect(() => {
    if (positioned.current) return;
    const index = APPLICATION_STAGES.findIndex(({ id }) => applications.some((application) => application.stage === id));
    const board = boardRef.current;
    const column = board?.children.item(index) as HTMLElement | null;
    if (board && column && index > 0) {
      board.scrollLeft = column.getBoundingClientRect().left - board.getBoundingClientRect().left;
    }
    positioned.current = true;
  }, [applications]);

  function moveApplication(id: string, stage: string) {
    const application = applications.find((item) => item.id === id);
    const targetStage = APPLICATION_STAGES.find((item) => item.id === stage);
    if (!application || !targetStage || application.stage === targetStage.id) return;
    updateDemoApplication(id, { stage: targetStage.id });
    const stageLabel = targetStage.label;
    setNotice(`${application.applicantName} dipindahkan ke tahap ${stageLabel}.`);
  }

  function startDrag(event: ReactDragEvent<HTMLElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    setDraggingId(id);
  }

  function dropOnStage(event: ReactDragEvent<HTMLElement>, stage: string) {
    event.preventDefault();
    moveApplication(event.dataTransfer.getData("text/plain"), stage);
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <main className={`container-wide ${styles.page}`}>
      <header className={styles.pageHeader}>
        <div>
          <h1>Pipeline</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/manage/applications" />}>Daftar aplikasi</Button>
      </header>

      <p id="pipeline-help" className="mb-3 text-xs text-[var(--text-muted)]">
        Pindahkan kartu dengan menyeretnya atau pilih tahap di kartu.
      </p>
      <div ref={boardRef} className={styles.pipelineBoard} aria-label="Tahap pipeline aplikasi">
          {APPLICATION_STAGES.map((stage) => {
            const stageApplications = applications.filter((application) => application.stage === stage.id);
            return (
              <section
                className={`${styles.pipelineColumn} ${dropTarget === stage.id ? "border-[var(--mcd-red)]" : ""}`}
                key={stage.id}
                data-stage={stage.id}
                aria-labelledby={`stage-${stage.id}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(stage.id);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null);
                }}
                onDrop={(event) => dropOnStage(event, stage.id)}
              >
                <header className={styles.pipelineHeader}>
                  <h2 id={`stage-${stage.id}`}>{stage.label}</h2>
                  <span aria-label={`${stageApplications.length} aplikasi`}>{stageApplications.length}</span>
                </header>
                <div className={styles.pipelineCards}>
                  {stageApplications.map((application) => (
                    <article
                      className={`${styles.pipelineCard} cursor-grab active:cursor-grabbing ${draggingId === application.id ? "opacity-50" : ""}`}
                      key={application.id}
                      draggable
                      aria-describedby="pipeline-help"
                      onDragStart={(event) => startDrag(event, application.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDropTarget(null);
                      }}
                    >
                      <div className={styles.pipelineCardTop}>
                        <Link className={styles.pipelineCardTitle} href={`/manage/applications/${application.id}`}>
                          {application.applicantName}
                        </Link>
                        <span className={styles.pipelineScore} aria-label={`Skor ${application.score}`}>
                          <small>Skor</small>
                          <strong>{application.score}</strong>
                        </span>
                      </div>
                      <div className={styles.pipelineMeta}>
                        <span className={styles.pipelineReference}>{application.reference}</span>
                        <span>{application.programName}</span>
                        <span>{application.city}</span>
                      </div>
                      <label className="sr-only" htmlFor={`move-${application.id}`}>Pindahkan {application.applicantName} ke tahap</label>
                      <Select
                        className="h-9 text-xs"
                        id={`move-${application.id}`}
                        onChange={(event) => moveApplication(application.id, event.target.value)}
                        value={application.stage}
                      >
                        {APPLICATION_STAGES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </Select>
                    </article>
                  ))}
                  {!stageApplications.length && <p className={styles.emptyState}>Belum ada aplikasi.</p>}
                </div>
              </section>
            );
          })}
      </div>
      <p className={styles.notice} aria-live="polite">{notice}</p>
    </main>
  );
}
