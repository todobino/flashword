import PlayBySlug from './play-by-slug-client';
export default function Page({ params }: { params: { slug: string } }) {
  return <PlayBySlug slug={params.slug} />;
}
