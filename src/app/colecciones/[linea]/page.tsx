import { notFound } from "next/navigation";
import { businessLines, findBusinessLine } from "@/lib/brand";
import CollectionView from "./collection-view";
type PageProps = { params: Promise<{ linea: string }> };
export function generateStaticParams() {
  return businessLines.map(line => ({ linea: line.id }));
}
export default async function CollectionPage({ params }: PageProps) {
  const { linea } = await params;
  const line = findBusinessLine(linea);
  if (!line) notFound();
  return <CollectionView line={line} />;
}
