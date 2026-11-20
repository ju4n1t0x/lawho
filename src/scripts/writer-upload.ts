export const WRITER_LIMITS = { title: 200, subtitle: 500, body: 12000, tag: 100, pending_key: 1024 };
export const MAX_NOTE_BODY_BYTES = 128 * 1024;

export class WriterFormValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Shared Web API parser; no storage, environment, or server-only imports. */
export async function readWriterSubmission(request: Request, origin: string) {
  if (request.headers.get("Origin") !== origin) {
    throw new WriterFormValidationError("La solicitud no es válida. Recargue la página e intente nuevamente.", 403);
  }
  if (!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("Content-Type") ?? "")) {
    throw new WriterFormValidationError("Envíe solo los campos de la nota, sin archivos adjuntos.", 415);
  }
  const length = request.headers.get("Content-Length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_NOTE_BODY_BYTES)) {
    throw new WriterFormValidationError("El formulario supera el tamaño permitido.", 413);
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_NOTE_BODY_BYTES) {
          await reader.cancel();
          throw new WriterFormValidationError("El formulario supera el tamaño permitido.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let fields: URLSearchParams;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    // URLSearchParams alone silently accepts malformed escapes and invalid UTF-8.
    decodeURIComponent(text.replace(/\+/g, " "));
    fields = new URLSearchParams(text);
  } catch {
    throw new WriterFormValidationError("No se pudo leer el formulario. Revise los campos e intente nuevamente.");
  }
  for (const [key, value] of fields) {
    if (!Object.hasOwn(WRITER_LIMITS, key) || fields.getAll(key).length !== 1 || value.length > WRITER_LIMITS[key as keyof typeof WRITER_LIMITS]) {
      throw new WriterFormValidationError("El formulario contiene campos no válidos o demasiado extensos.");
    }
  }
  return {
    values: {
      title: (fields.get("title") ?? "").trim(),
      subtitle: (fields.get("subtitle") ?? "").trim(),
      body: (fields.get("body") ?? "").trim(),
      tag: (fields.get("tag") ?? "").trim(),
    },
    pendingKey: (fields.get("pending_key") ?? "").trim(),
  };
}

/** The signed URL stays in memory and is used only for the direct PUT. */
export async function uploadPendingImage(file: File, maxBytes: number, send: typeof fetch = fetch): Promise<string> {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0 || file.size > maxBytes) {
    throw new WriterFormValidationError("La imagen supera el tamaño máximo indicado.");
  }
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new WriterFormValidationError("Seleccione una imagen JPG o PNG.");
  }
  const authorization = await send("/escritor/uploads", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ size: file.size, contentType: file.type }),
  });
  if (!authorization.ok) {
    // Never surface an arbitrary response body or fetch error containing a URL.
    throw new WriterFormValidationError("No se pudo autorizar la carga. Verifique su sesión e intente nuevamente.");
  }
  const upload = await authorization.json();
  if (typeof upload.key !== "string" || !upload.key || upload.key.length > WRITER_LIMITS.pending_key ||
      typeof upload.url !== "string" || upload.method !== "PUT" || upload.headers?.["Content-Type"] !== file.type) {
    throw new WriterFormValidationError("No se pudo preparar la carga. Intente nuevamente.");
  }
  const response = await send(upload.url, {
    method: upload.method,
    headers: upload.headers,
    credentials: "omit",
    body: file,
  });
  if (!response.ok) {
    throw new WriterFormValidationError("No se pudo cargar la imagen o el enlace venció. Intente nuevamente para obtener un enlace nuevo.");
  }
  return upload.key;
}

const submitting = new WeakSet<HTMLFormElement>();

export async function submitWriterForm(
  form: HTMLFormElement,
  send: typeof fetch = fetch,
  submit: (form: HTMLFormElement) => void = (target) => HTMLFormElement.prototype.submit.call(target),
) {
  if (submitting.has(form)) return;
  const image = form.querySelector<HTMLInputElement>('input[type="file"]');
  const pending = form.querySelector<HTMLInputElement>('input[name="pending_key"]');
  const message = form.querySelector<HTMLElement>("[data-upload-status]");
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!image || !pending || !message || !button) return;
  submitting.add(form);
  button.disabled = true;
  form.setAttribute("aria-busy", "true");
  pending.value = "";
  message.textContent = "";
  try {
    const file = image.files?.[0];
    if (file && file.size > 0) {
      message.textContent = "Cargando imagen…";
      pending.value = await uploadPendingImage(file, Number(form.dataset.maxBytes), send);
    } else if (image.required) {
      throw new WriterFormValidationError("La imagen es obligatoria. Seleccione un archivo JPG o PNG.");
    }
    message.textContent = "Guardando nota…";
    // The unnamed file input is never a successful form control. Native POST
    // preserves the explicit create/update action and sends URL-encoded text only.
    submit(form);
  } catch (error) {
    pending.value = "";
    message.textContent = error instanceof WriterFormValidationError
      ? error.message
      : "No se pudo completar la carga. Revise su conexión e intente nuevamente.";
    button.disabled = false;
    form.removeAttribute("aria-busy");
    submitting.delete(form);
  }
}

const installed = new WeakSet<Document>();

export function installWriterUploads(document: Document) {
  if (installed.has(document)) return;
  installed.add(document);
  // Delegation also handles forms inserted later by a deferred server island.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-writer-upload")) return;
    event.preventDefault();
    void submitWriterForm(form);
  });
}
