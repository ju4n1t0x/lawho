import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";

/** A lazily-created Markdown renderer, shared by every caller in the process. */
let rendererPromise: ReturnType<typeof createSatteriMarkdownProcessor> | undefined;

/**
 * Return the shared `@astrojs/markdown-satteri` renderer.
 * The processor is first-party Astro (sanctioned by rule 1) and is created
 * once so the syntax highlighter is loaded a single time.
 */
function getRenderer(): ReturnType<typeof createSatteriMarkdownProcessor> {
  if (!rendererPromise) {
    rendererPromise = createSatteriMarkdownProcessor();
  }
  return rendererPromise;
}

/**
 * Render a Markdown string to an HTML string using Astro's sanctioned
 * Sätteri pipeline. Used by the live `notes` loader to populate `rendered.html`
 * because a `LiveLoader` context has no `renderMarkdown` helper.
 */
export async function renderMarkdown(content: string): Promise<string> {
  const renderer = await getRenderer();
  const result = await renderer.render(content);
  return result.code;
}
