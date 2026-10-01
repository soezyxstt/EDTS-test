"use client";

import { useEffect, useState } from "react";
import { DEMO_APPLICATIONS, readDemoApplications, type FranchiseApplication } from "@/lib/demo-data";

export function useDemoApplications() {
  const [applications, setApplications] = useState<FranchiseApplication[]>(() => process.env.NODE_ENV === "development" ? DEMO_APPLICATIONS : []);

  useEffect(() => {
    const sync = () => setApplications(readDemoApplications());
    sync();
    window.addEventListener("franchise-prototype:update", sync);
    return () => window.removeEventListener("franchise-prototype:update", sync);
  }, []);

  return applications;
}
