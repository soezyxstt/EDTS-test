import ApplicationForm from "@/components/applicant/application-form";
import { DEMO_PROGRAMS } from "@/lib/demo-data";
import { requireRole } from "@/lib/auth-server";

export default async function ApplyPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  await requireRole("applicant", `/apply/${programId}`);
  const program = DEMO_PROGRAMS.find((item) => item.id === programId);
  return <ApplicationForm programId={programId} initialProgram={program} />;
}
