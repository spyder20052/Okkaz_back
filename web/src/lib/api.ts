// Client HTTP centralisé pour l'API OKKAZ (backend Express /api/v1).
// - Attache automatiquement le Bearer token
// - Rafraîchit le token sur 401 (une seule tentative) puis rejoue la requête
// - Normalise les erreurs backend ({ success:false, error:{ code, message, details } })
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

// Origine du backend (pour préfixer les URLs relatives /uploads/...)
export const API_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, "");

const AUTH_STORAGE_KEY = "okkaz_auth";
export const AUTH_UPDATED_EVENT = "okkaz-auth-updated";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface StoredAuth {
  user: import("./types").ApiUser;
  tokens: AuthTokens;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function readAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function writeAuth(auth: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (auth) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    document.cookie = `okkaz_session_role=${encodeURIComponent(auth.user.role)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    document.cookie = "okkaz_session_role=; Path=/; Max-Age=0; SameSite=Lax";
  }
  window.dispatchEvent(new Event(AUTH_UPDATED_EVENT));
}

// Transforme une URL renvoyée par le backend (ex: /uploads/listings/x.jpg)
// en URL absolue exploitable par le navigateur.
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return "/ads/car1.jpg";
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  // Les assets du dossier public Next (/ads, /images, etc.) restent locaux.
  // Seuls les fichiers uploadés par l'API doivent être préfixés par son origine.
  if (url.startsWith("/uploads/")) return `${API_ORIGIN}${url}`;
  return url;
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
  const auth = readAuth();
  if (!auth?.tokens?.refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: auth.tokens.refreshToken }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          writeAuth(null);
          return false;
        }
        writeAuth({ user: auth.user, tokens: json.data });
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  auth?: boolean; // attache le Bearer token si présent (défaut: true)
  query?: Record<string, string | number | boolean | undefined | null>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { method = "GET", body, formData, auth = true, query } = options;

  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {};
  if (!formData) headers["Content-Type"] = "application/json";
  const stored = readAuth();
  if (auth && stored?.tokens?.accessToken) {
    headers["Authorization"] = `Bearer ${stored.tokens.accessToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    // Token expiré → tentative de refresh puis rejeu (une seule fois)
    if (res.status === 401 && auth && stored && !isRetry) {
      const refreshed = await tryRefreshTokens();
      if (refreshed) return apiFetch<T>(path, options, true);
    }
    const err = json?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "UNKNOWN_ERROR",
      err.message ?? `Erreur ${res.status}`,
      err.details,
    );
  }

  return json as T;
}

// Réponses standard du backend
export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiPaginated<T> {
  success: true;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"], auth = true) =>
    apiFetch<ApiSuccess<T>>(path, { query, auth }),
  getPaginated: <T>(path: string, query?: RequestOptions["query"], auth = true) =>
    apiFetch<ApiPaginated<T>>(path, { query, auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<ApiSuccess<T>>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<ApiSuccess<T>>(path, { method: "PATCH", body, auth }),
  delete: (path: string, auth = true) =>
    apiFetch<void>(path, { method: "DELETE", auth }),
  upload: <T>(path: string, formData: FormData, method: "POST" | "PATCH" = "POST") =>
    apiFetch<ApiSuccess<T>>(path, { method, formData }),
};
