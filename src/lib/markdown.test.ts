import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("renders a heading to an HTML string", async () => {
    const html = await renderMarkdown("# Hola");

    expect(html).toContain("<h1");
    expect(html).toContain("Hola");
  });

  it("renders emphasis and paragraphs", async () => {
    const html = await renderMarkdown("Esto es **negrita**.");

    expect(html).toContain("<p>");
    expect(html).toContain("<strong>negrita</strong>");
  });
});
