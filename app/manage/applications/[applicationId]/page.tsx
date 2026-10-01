import { ApplicationReview } from "@/components/franchisor/application-review";

export default async function ApplicationPage({ params }: PageProps<"/manage/applications/[applicationId]">) {
  const { applicationId } = await params;
  return <ApplicationReview applicationId={applicationId} />;
}
