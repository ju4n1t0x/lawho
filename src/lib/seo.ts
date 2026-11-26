import type { NoteData } from "./notes-mapper";
import { isManagedImageKey } from "./uploads";

export const SITE_ORIGIN = "https://lawho.com.ar";
export const OPERATIVES_PATH = "/operativos-de-salud/";
const shareImage = `${SITE_ORIGIN}/images/og-lawho.jpg`;

export interface PageMetadata {
  title: string;
  description: string;
  canonical: string;
  type: "website" | "article";
  image: string;
  robots?: "noindex";
}

export type PageSeo = PageMetadata | { robots: "noindex" };

export const homeSeo: PageMetadata = {
  title: "LAWHO | Médicos voluntarios en el Chaco Salteño",
  description: "Asociación civil de médicos voluntarios que realiza operativos de salud gratuitos en comunidades del Chaco Salteño, Salta. Conocé su trabajo y cómo colaborar.",
  canonical: `${SITE_ORIGIN}/`,
  type: "website",
  image: shareImage,
};

export function listingSeo(publishedCount: number | undefined): { status: 200 | 503; seo: PageMetadata } {
  return {
    status: publishedCount === undefined ? 503 : 200,
    seo: {
      title: "Operativos de salud en el Chaco Salteño | LAWHO",
      description: "Bitácora de los operativos de salud de LAWHO en el Chaco Salteño, Salta.",
      canonical: `${SITE_ORIGIN}${OPERATIVES_PATH}`,
      type: "website",
      image: shareImage,
      ...(publishedCount === 0 ? { robots: "noindex" } : {}),
    },
  };
}

export function notePath(slug: string): string {
  return `${OPERATIVES_PATH}${encodeURIComponent(slug)}/`;
}

export function noteSeo(slug: string, note: Pick<NoteData, "title" | "subtitle" | "image" | "draft">): PageSeo {
  if (note.draft) return { robots: "noindex" };

  // Managed media paths are stable; external and legacy references are not
  // guaranteed to be public, present in the deployment, or free of signatures.
  const image = note.image.startsWith("/media/") && isManagedImageKey(note.image.slice("/media/".length))
    ? `${SITE_ORIGIN}${note.image}`
    : shareImage;
  return {
    title: `${note.title} | LAWHO`,
    description: note.subtitle.trim() || `${note.title}. Bitácora de los operativos de salud de LAWHO.`,
    canonical: `${SITE_ORIGIN}${notePath(slug)}`,
    type: "article",
    image,
  };
}
