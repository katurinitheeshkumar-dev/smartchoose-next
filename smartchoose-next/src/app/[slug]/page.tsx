import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>
};

/**
 * Root-level /[slug] routes are redirected permanently to /blog/[slug]
 * to avoid duplicate content and "Duplicate without user-selected canonical" in Google Search Console.
 */
export default async function SlugRoute({ params }: Props) {
  const { slug } = await params;
  redirect(`/blog/${slug}`);
}

