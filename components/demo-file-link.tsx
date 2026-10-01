"use client";

import { useEffect, useState } from "react";
import { readDemoFile } from "@/lib/demo-files";

export function DemoFileLink({ applicationId, fieldId, name }: { applicationId: string; fieldId?: string; name: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!fieldId) return;
    let objectUrl = "";
    let cancelled = false;
    void readDemoFile(applicationId, fieldId).then((file) => {
      if (!file || cancelled) return;
      objectUrl = URL.createObjectURL(file.blob);
      setUrl(objectUrl);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId, fieldId]);

  return url ? <a className="underline underline-offset-4" download={name} href={url}>{name}</a> : <span>{name}</span>;
}
