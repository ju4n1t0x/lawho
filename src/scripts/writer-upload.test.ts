import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installWriterUploads, MAX_NOTE_BODY_BYTES, readWriterSubmission,
  submitWriterForm, uploadPendingImage, WRITER_LIMITS, WriterFormValidationError,
} from "./writer-upload";

const origin = "https://lawho.example";
const signedUrl = "https://storage.example/private?signature=never-display";
const key = "pending/1/1234567890000-0123456789abcdef0123456789abcdef";
const file = new File(["private-image-bytes"], "image.png", { type: "image/png" });
const authorize = () => Response.json({ key, url: signedUrl, method: "PUT", headers: { "Content-Type": "image/png" } });
const submission = { title: "Title", subtitle: "Subtitle", body: "# Markdown", tag: "", pending_key: key };

function request(body: BodyInit = new URLSearchParams(submission), headers: Record<string, string> = {}) {
  return new Request(`${origin}/escritor/nueva`, {
    method: "POST", body,
    headers: { Origin: origin, "Content-Type": "application/x-www-form-urlencoded", ...headers },
  });
}

function formFixture(selected: File | undefined = file, required = true) {
  const image = { files: selected ? [selected] : [], required };
  const pending = { value: "stale-key" };
  const message = { textContent: "" };
  const button = { disabled: false };
  const fields = { ...submission };
  const controls: Record<string, unknown> = {
    'input[type="file"]': image, 'input[name="pending_key"]': pending,
    "[data-upload-status]": message, 'button[type="submit"]': button,
  };
  const form = {
    dataset: { maxBytes: String(file.size) },
    action: `${origin}/escritor/editar/existing-slug`,
    querySelector: (selector: string) => controls[selector],
    setAttribute: vi.fn(), removeAttribute: vi.fn(),
  } as unknown as HTMLFormElement;
  return { form, image, pending, message, button, fields };
}

afterEach(() => vi.unstubAllGlobals());

describe("direct image upload", () => {
  it("authorizes metadata only and sends bytes exclusively to the signed PUT", async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValueOnce(authorize()).mockResolvedValueOnce(new Response());
    expect(await uploadPendingImage(file, file.size, send)).toBe(key);
    expect(send.mock.calls[0]).toEqual(["/escritor/uploads", {
      method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: file.size, contentType: file.type }),
    }]);
    expect(send.mock.calls[1]).toEqual([signedUrl, {
      method: "PUT", headers: { "Content-Type": file.type }, credentials: "omit", body: file,
    }]);
  });

  it("rejects a file above the configured inclusive limit without a request", async () => {
    const send = vi.fn<typeof fetch>();
    await expect(uploadPendingImage(file, file.size - 1, send)).rejects.toThrow("tamaño máximo");
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME without a request", async () => {
    const send = vi.fn<typeof fetch>();
    await expect(uploadPendingImage(new File(["gif"], "file.gif", { type: "image/gif" }), 100, send)).rejects.toThrow("JPG o PNG");
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["authorization", "PUT", "network"])("preserves inputs and permits retry after %s failure without exposing URLs", async (failure) => {
    const fixture = formFixture();
    const submit = vi.fn();
    const send = vi.fn<typeof fetch>();
    if (failure === "authorization") send.mockResolvedValueOnce(Response.json({ error: signedUrl }, { status: 401 }));
    else {
      send.mockResolvedValueOnce(authorize());
      if (failure === "PUT") send.mockResolvedValueOnce(new Response(signedUrl, { status: 403 }));
      else send.mockRejectedValueOnce(new Error(signedUrl));
    }
    await submitWriterForm(fixture.form, send, submit);
    expect(submit).not.toHaveBeenCalled();
    expect(fixture.message.textContent).not.toContain(signedUrl);
    expect(fixture.message.textContent).toMatch(/intente nuevamente/i);
    expect(fixture.pending.value).toBe("");
    expect(fixture.button.disabled).toBe(false);
    expect(fixture.image.files[0]).toBe(file);
    expect(fixture.fields).toEqual(submission);
    send.mockResolvedValueOnce(authorize()).mockResolvedValueOnce(new Response());
    await submitWriterForm(fixture.form, send, submit);
    expect(submit).toHaveBeenCalledOnce();
    expect(fixture.pending.value).toBe(key);
  });

  it("keeps the original action and submits a pending key only after PUT success", async () => {
    const fixture = formFixture();
    const send = vi.fn<typeof fetch>().mockResolvedValueOnce(authorize()).mockResolvedValueOnce(new Response());
    const submit = vi.fn((form: HTMLFormElement) => {
      expect(send).toHaveBeenCalledTimes(2);
      expect(form.action).toBe(`${origin}/escritor/editar/existing-slug`);
      expect(fixture.pending.value).toBe(key);
    });
    await submitWriterForm(fixture.form, send, submit);
    expect(submit).toHaveBeenCalledOnce();
    expect(fixture.button.disabled).toBe(true);
  });

  it("skips upload when editing without replacement and clears a stale pending key", async () => {
    const fixture = formFixture(undefined, false);
    fixture.image.files = [];
    const send = vi.fn<typeof fetch>();
    const submit = vi.fn();
    await submitWriterForm(fixture.form, send, submit);
    expect(send).not.toHaveBeenCalled();
    expect(submit).toHaveBeenCalledWith(fixture.form);
    expect(fixture.pending.value).toBe("");
  });

  it("blocks a missing required image without publishing", async () => {
    const fixture = formFixture();
    fixture.image.files = [];
    const submit = vi.fn();
    await submitWriterForm(fixture.form, vi.fn(), submit);
    expect(submit).not.toHaveBeenCalled();
    expect(fixture.message.textContent).toContain("imagen es obligatoria");
  });

  it("blocks double submission while authorization is pending", async () => {
    let resolve!: (response: Response) => void;
    const send = vi.fn<typeof fetch>().mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce(new Response());
    const fixture = formFixture();
    const submit = vi.fn();
    const first = submitWriterForm(fixture.form, send, submit);
    await submitWriterForm(fixture.form, send, submit);
    expect(send).toHaveBeenCalledOnce();
    resolve(authorize());
    await first;
    expect(submit).toHaveBeenCalledOnce();
  });

  it("delegates submission to forms arriving after installation", async () => {
    const document = new EventTarget();
    const fixture = formFixture();
    const nativeSubmit = vi.fn();
    class FakeForm { submit() {} }
    FakeForm.prototype.submit = nativeSubmit;
    Object.setPrototypeOf(fixture.form, FakeForm.prototype);
    Object.assign(fixture.form, { hasAttribute: (name: string) => name === "data-writer-upload" });
    vi.stubGlobal("HTMLFormElement", FakeForm);
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValueOnce(authorize()).mockResolvedValueOnce(new Response()));
    installWriterUploads(document as unknown as Document);
    installWriterUploads(document as unknown as Document);
    const event = new Event("submit", { cancelable: true });
    Object.defineProperty(event, "target", { value: fixture.form });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(nativeSubmit).toHaveBeenCalledOnce());
  });
});

describe("writer page handlers", () => {
  async function runPage(page: "nueva.astro" | "editar/[slug].astro", options: {
    authenticated?: boolean; fields?: Record<string, string>; origin?: string; failure?: Error;
  } = {}) {
    const source = readFileSync(new URL(`../pages/escritor/${page}`, import.meta.url), "utf8");
    // Execute the actual page frontmatter with local dependencies, without a DB,
    // Astro dev server, cloud credentials, or network writes.
    const frontmatter = source.split("---")[1].replace(/^import .*;\n/gm, "").replace("export const prerender", "const prerender");
    const Astro = {
      request: request(new URLSearchParams(options.fields ?? submission), { Origin: options.origin ?? origin }),
      url: new URL(`${origin}/escritor/nueva`), params: { slug: "existing-slug" },
      cookies: { get: vi.fn(() => ({ value: "session-token" })) },
      response: { headers: new Headers(), status: 200 },
      redirect: vi.fn((location: string) => ({ redirect: location })),
    };
    class UploadValidationError extends Error {}
    const dependencies = {
      Astro, readWriterSubmission, WriterFormValidationError, UploadValidationError,
      SESSION_COOKIE_NAME: "session",
      getActiveSession: vi.fn().mockResolvedValue(options.authenticated === false ? null : { userId: 42 }),
      getNoteBySlug: vi.fn().mockResolvedValue({ slug: "existing-slug", data: { title: "Old", subtitle: "Old subtitle", image: "/media/notes/old.png" }, body: "Old body" }),
      createManagedNote: vi.fn().mockResolvedValue({ slug: "created-slug" }),
      updateManagedNote: vi.fn().mockResolvedValue({ slug: "existing-slug" }),
    };
    if (options.failure) {
      dependencies.createManagedNote.mockRejectedValue(options.failure);
      dependencies.updateManagedNote.mockRejectedValue(options.failure);
    }
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const handler = new AsyncFunction(...Object.keys(dependencies),
      stripTypeScriptTypes(`async function pageHandler() {\n${frontmatter}\nreturn { values, error };\n}`) + "\nreturn pageHandler();");
    const result = await handler(...Object.values(dependencies));
    return { result, ...dependencies };
  }

  it("passes text, pending key and revalidated user to creation and keeps the success redirect", async () => {
    const page = await runPage("nueva.astro");
    expect(page.createManagedNote).toHaveBeenCalledWith({ title: "Title", subtitle: "Subtitle", body: "# Markdown", tag: undefined }, key, 42);
    expect(page.result).toEqual({ redirect: "/operativos-de-salud/created-slug/" });
  });

  it("passes undefined replacement on edit and retains the existing preview reference", async () => {
    const page = await runPage("editar/[slug].astro", { fields: { ...submission, pending_key: "" } });
    expect(page.updateManagedNote).toHaveBeenCalledWith("existing-slug", { title: "Title", subtitle: "Subtitle", body: "# Markdown", tag: undefined }, undefined, 42);
    expect(page.result).toEqual({ redirect: "/escritor/" });
  });

  it("authenticates before reading any edit note or draft", async () => {
    const page = await runPage("editar/[slug].astro", { authenticated: false });
    expect(page.result).toEqual({ redirect: "/escritor/" });
    expect(page.getNoteBySlug).not.toHaveBeenCalled();
    expect(page.updateManagedNote).not.toHaveBeenCalled();
  });

  it.each(["nueva.astro", "editar/[slug].astro"] as const)("blocks CSRF in %s without calling managed services", async (route) => {
    const page = await runPage(route, { origin: "https://attacker.example" });
    expect(page.Astro.response.status).toBe(403);
    expect(page.createManagedNote).not.toHaveBeenCalled();
    expect(page.updateManagedNote).not.toHaveBeenCalled();
  });

  it.each(["nueva.astro", "editar/[slug].astro"] as const)("preserves fields and hides unexpected service errors in %s", async (route) => {
    const page = await runPage(route, { failure: new Error(signedUrl) });
    expect(page.result.values).toEqual({ title: "Title", subtitle: "Subtitle", body: "# Markdown", tag: "" });
    expect(page.result.error).toContain("No se pudo guardar");
    expect(page.result.error).not.toContain(signedUrl);
    expect(page.Astro.response.status).toBe(500);
  });

  it("rejects a missing image reference and blank required fields before managed creation", async () => {
    const missingImage = await runPage("nueva.astro", { fields: { ...submission, pending_key: "" } });
    expect(missingImage.result.error).toContain("imagen es obligatoria");
    expect(missingImage.createManagedNote).not.toHaveBeenCalled();
    const blankTitle = await runPage("nueva.astro", { fields: { ...submission, title: " " } });
    expect(blankTitle.result.error).toContain("Complete el título");
    expect(blankTitle.createManagedNote).not.toHaveBeenCalled();
  });
});

describe("bounded note submission", () => {
  it("reads only trimmed text fields and a pending reference", async () => {
    expect(await readWriterSubmission(request(new URLSearchParams({ ...submission, title: "  Title  " })), origin)).toEqual({
      values: { title: "Title", subtitle: "Subtitle", body: "# Markdown", tag: "" }, pendingKey: key,
    });
  });

  it.each(["https://attacker.example", "null", ""])("rejects non-same-origin requests: %s", async (foreign) => {
    await expect(readWriterSubmission(request(undefined, { Origin: foreign }), origin)).rejects.toMatchObject({ status: 403 });
  });

  it("rejects multipart file bodies before parsing", async () => {
    const body = new FormData();
    body.set("image", file);
    await expect(readWriterSubmission(request(body, { "Content-Type": "multipart/form-data; boundary=test" }), origin)).rejects.toMatchObject({ status: 415 });
  });

  it.each(["title=%", "title=%FF", "title=%C3%28", "title=one&title=two", "image=binary", "image_url=https://foreign.example"])("rejects malformed or forbidden fields: %s", async (body) => {
    await expect(readWriterSubmission(request(body), origin)).rejects.toThrow();
  });

  it("rejects oversized declared bodies", async () => {
    await expect(readWriterSubmission(request("", { "Content-Length": String(MAX_NOTE_BODY_BYTES + 1) }), origin)).rejects.toMatchObject({ status: 413 });
  });

  it("bounds actual bytes even with a forged short Content-Length", async () => {
    await expect(readWriterSubmission(request("a".repeat(MAX_NOTE_BODY_BYTES + 1), { "Content-Length": "1" }), origin)).rejects.toMatchObject({ status: 413 });
  });

  it("enforces field limits independently of browser validation", async () => {
    await expect(readWriterSubmission(request(new URLSearchParams({ ...submission, title: "a".repeat(WRITER_LIMITS.title + 1) })), origin)).rejects.toThrow("demasiado extensos");
  });

  it("renders no named file control, binary enctype, or invisible noscript-only island fallback", () => {
    const component = readFileSync(new URL("../components/server-islands/WriterForm.astro", import.meta.url), "utf8");
    const input = component.match(/<input\s+id="image"[\s\S]*?\/>/)?.[0];
    expect(input).toContain('type="file"');
    expect(input).not.toMatch(/\bname=/);
    expect(component).not.toContain("multipart/form-data");
    expect(component).toContain("data-max-bytes={MAX_UPLOAD_SIZE_BYTES}");
    for (const page of ["nueva.astro", "editar/[slug].astro"]) {
      const source = readFileSync(new URL(`../pages/escritor/${page}`, import.meta.url), "utf8");
      expect(source).toContain("<noscript>");
      expect(source).not.toContain("import.meta.env");
      expect(source).not.toContain("saveImageUpload");
    }
  });
});
