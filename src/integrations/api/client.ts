const apiBasePath = (import.meta.env.VITE_API_BASE_PATH ?? "/api/v1").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiRequestOptions extends RequestInit {
  initData?: string | null;
  auth?: boolean;
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.clone().json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  } catch {
    // Fall through to the HTTP status below.
  }
  return `API request failed with ${response.status}`;
}

export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  if (!path.startsWith("/")) throw new Error("API paths must start with '/'");

  const { initData, auth = true, headers: providedHeaders, ...requestInit } = options;
  const normalizedInitData = initData?.trim() ?? "";
  if (auth && !normalizedInitData) {
    throw new Error("Telegram authentication is unavailable. Open Dexo Land from Telegram.");
  }

  const headers = new Headers(providedHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (auth) headers.set("Authorization", `tma ${normalizedInitData}`);

  const response = await fetch(`${apiBasePath}${path}`, {
    ...requestInit,
    headers,
  });

  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  return response;
}
