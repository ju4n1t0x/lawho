import { homeSeo, SITE_ORIGIN } from "./seo";

export function serializeJsonLd(data: Record<string, unknown>): string {
  // Inline script text must not contain an HTML tag opener.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const organizationJsonLd = serializeJsonLd({
  "@context": "https://schema.org",
  "@type": "NGO",
  name: "LAWHO",
  alternateName: "LAWHO Asociación Civil",
  url: homeSeo.canonical,
  logo: `${SITE_ORIGIN}/favicon.svg`,
  description: homeSeo.description,
  areaServed: "Rivadavia Banda Norte, Salta",
  sameAs: ["https://www.instagram.com/lawho_medicos_voluntarios/"],
  email: "lawhoasociacioncivil@gmail.com",
});
