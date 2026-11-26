import { describe, expect, it } from "vitest";
import { organizationJsonLd, serializeJsonLd } from "./organization-seo";

describe("home NGO structured data", () => {
  it("publishes only grounded facts about LAWHO", () => {
    expect(JSON.parse(organizationJsonLd)).toEqual({
      "@context": "https://schema.org",
      "@type": "NGO",
      name: "LAWHO",
      alternateName: "LAWHO Asociación Civil",
      url: "https://lawho.com.ar/",
      logo: "https://lawho.com.ar/favicon.svg",
      description: "Asociación civil de médicos voluntarios que realiza operativos de salud gratuitos en comunidades del Chaco Salteño, Salta. Conocé su trabajo y cómo colaborar.",
      areaServed: "Rivadavia Banda Norte, Salta",
      sameAs: ["https://www.instagram.com/lawho_medicos_voluntarios/"],
      email: "lawhoasociacioncivil@gmail.com",
    });
  });

  it("keeps script terminators and markup out of the inline script without changing the JSON value", () => {
    const data = { description: 'Salta & "atención" </ScRiPt><!--<script>' };
    const serialized = serializeJsonLd(data);

    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
