import { AlbumPublicClient } from './AlbumPublicClient';

export default async function AlbumPublicPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <AlbumPublicClient userId={userId} />;
}
