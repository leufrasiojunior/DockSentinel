export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type HttpOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

function getBaseUrl() {
  // opcional: se você preferir usar ENV ao invés de proxy
  const env = import.meta.env.VITE_API_URL as string | undefined;
  return (env ?? "").replace(/\/$/, "");
}

async function readErrorMessage(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const data = await res.json();
      const msg =
        (typeof data?.message === "string" && data.message) ||
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.detail === "string" && data.detail) ||
        `HTTP ${res.status}`;
      return { msg, details: data };
    }

    const text = await res.text();
    const msg = text?.trim() ? text.trim() : `HTTP ${res.status}`;
    return { msg, details: text };
  } catch {
    return { msg: `HTTP ${res.status}`, details: null };
  }
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };

  const hasBody = options.body !== undefined;
  if (hasBody) headers["Content-Type"] = headers["Content-Type"] ?? "application/json";

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    credentials: "include", // cookie ds_session
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  // Se não for 2xx, erro normal
  if (!res.ok) {
    const { msg, details } = await readErrorMessage(res);
    throw new ApiError(res.status, msg, details);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";

  // ✅ Se veio HTML, quase certeza que bateu no Vite (SPA fallback) ou num proxy errado
  if (contentType.includes("text/html")) {
    const snippet = (await res.text()).slice(0, 200);
    throw new ApiError(
      502,
      "Resposta HTML inesperada. A API não está sendo alcançada. Verifique o proxy do Vite ou VITE_API_URL.",
      { url, contentType, snippet },
    );
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  // fallback texto
  return (await res.text()) as unknown as T;
}
