import { describe, expect, it } from "vitest";
import { homeSeo, listingSeo, noteSeo } from "./seo";

const origin = "https://lawho.com.ar";
const fallback = `${origin}/images/og-lawho.jpg`;

describe("public SEO metadata", () => {
  it("uses the institutional title, canonical URL, and stable sharing image on the home", () => {
    expect(homeSeo).toMatchObject({
      title: "LAWHO | Médicos voluntarios en el Chaco Salteño",
      canonical: `${origin}/`,
      type: "website",
      image: fallback,
    });
  });

  it("keeps a successfully loaded empty list accessible but noindex", () => {
    expect(listingSeo(0)).toMatchObject({
      status: 200,
      seo: {
        title: "Operativos de salud en el Chaco Salteño | LAWHO",
        canonical: `${origin}/operativos-de-salud/`,
        robots: "noindex",
      },
    });
  });

  it("makes the listing indexable when there is a published note", () => {
    const result = listingSeo(1);
    expect(result.status).toBe(200);
    expect(result.seo).toMatchObject({ canonical: `${origin}/operativos-de-salud/` });
    expect(result.seo).not.toHaveProperty("robots");
  });

  it("reports an unavailable list as a failure rather than a successful empty list", () => {
    const result = listingSeo(undefined);
    expect(result.status).toBe(503);
    expect(result.seo).not.toHaveProperty("robots");
  });

  it("uses article metadata and the stable managed URL for a published note", () => {
    expect(noteSeo("operativo-en-salta", {
      title: "Operativo en Salta", subtitle: "Una semana en terreno.", image: `/media/notes/${"a".repeat(32)}.jpg`, draft: false,
    })).toEqual({
      title: "Operativo en Salta | LAWHO",
      description: "Una semana en terreno.",
      canonical: `${origin}/operativos-de-salud/operativo-en-salta/`,
      type: "article",
      image: `${origin}/media/notes/${"a".repeat(32)}.jpg`,
    });
  });

  it("uses the same stable delivery route for a published PNG", () => {
    const image = `/media/notes/${"b".repeat(32)}.png`;
    expect(noteSeo("operativo", { title: "Operativo", subtitle: "Salta", image, draft: false }))
      .toMatchObject({ image: `${origin}${image}` });
  });

  it("falls back to the institutional image instead of exposing an external signed URL", () => {
    expect(noteSeo("operativo", {
      title: "Operativo", subtitle: "Salta", image: "https://storage.example/private?signature=secret", draft: false,
    })).toMatchObject({ image: fallback });
  });

  it("does not use the draft title, content or image in article metadata", () => {
    expect(noteSeo("borrador", {
      title: "Privado", subtitle: "Borrador", image: "/media/notes/private.webp", draft: true,
    })).toEqual({ robots: "noindex" });
  });
});
