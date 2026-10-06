"use client";

import { useEffect, useState } from "react";
import { readDemoApplications, type FranchiseApplication } from "@/lib/demo-data";

export function useDemoApplications() {
  const [applications, setApplications] = useState<FranchiseApplication[]>([]);

  useEffect(() => {
    const sync = () => setApplications(readDemoApplications());
    sync();
    window.addEventListener("franchise-prototype:update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("franchise-prototype:update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return applications;
}
