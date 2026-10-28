import { ContentDetail } from "@/components/content-detail/content-detail";

export const instant = false;

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ContentDetail contentId={id} />;
}
