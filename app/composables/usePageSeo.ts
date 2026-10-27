/** Title, description, canonical URL and Open Graph tags for a public page. */
export function usePageSeo(input: {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  image?: MaybeRefOrGetter<string | null | undefined>;
}) {
  const { siteUrl } = useRuntimeConfig().public;
  const route = useRoute();
  const canonical = computed(() => new URL(route.path, siteUrl).toString());

  useSeoMeta({
    title: input.title,
    description: input.description,
    ogTitle: input.title,
    ogDescription: input.description,
    ogType: "website",
    ogUrl: canonical,
    ogImage: () => toValue(input.image) || undefined,
    twitterCard: () =>
      toValue(input.image) ? "summary_large_image" : "summary",
  });
  useHead({ link: [{ rel: "canonical", href: canonical }] });
}
