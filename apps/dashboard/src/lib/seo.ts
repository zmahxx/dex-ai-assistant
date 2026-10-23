export const seo = (title: string, description: string) => ({
  meta: [
    { title: `${title} · Dex-Ai` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} · Dex-Ai` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
