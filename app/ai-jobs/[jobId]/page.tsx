import { AiJobReviewPage } from "@/components/ai/ai-job-review-page";

type AiJobDetailPageProps = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export default async function AiJobDetailPage({ params }: AiJobDetailPageProps) {
  const resolvedParams = await Promise.resolve(params);
  return <AiJobReviewPage jobId={resolvedParams.jobId} />;
}
