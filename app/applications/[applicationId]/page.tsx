import ApplicationDetail from "@/components/applicant/application-detail";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return <ApplicationDetail applicationId={applicationId} />;
}
