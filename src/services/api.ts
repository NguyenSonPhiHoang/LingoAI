// Base API service for backend communication

const DEFAULT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const LAN_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL_IP;

export function getApiBaseUrl(): string {
  // On the server, we can't inspect window.location.
  if (typeof window === "undefined") return DEFAULT_API_BASE_URL;

  const hostname = window.location.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  // When the app is opened via LAN IP/hostname, using localhost for API will fail.
  if (!isLocalhost) {
    if (LAN_API_BASE_URL) return LAN_API_BASE_URL;
    // Fallback: assume backend is on same host, port 4000.
    return `http://${hostname}:4000`;
  }

  return DEFAULT_API_BASE_URL;
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  token?: string | null;
}

export async function api<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // If token not explicitly provided, try retrieving from localStorage
  let authToken = token;
  if (!authToken && typeof window !== "undefined") {
    try {
      authToken = localStorage.getItem("lingoai_token");
    } catch (e) {
      authToken = null;
    }
  }
  if (authToken) {
    (config.headers as Record<string, string>)[
      "Authorization"
    ] = `Bearer ${authToken}`;
  }

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, config);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `API Error: ${response.status}`
    );
  }

  return data as T;
}

// Convenience methods
export const apiGet = <T = any>(endpoint: string, token?: string | null) =>
  api<T>(endpoint, { method: "GET", token });

export const apiPost = <T = any>(
  endpoint: string,
  body: any,
  token?: string | null
) => api<T>(endpoint, { method: "POST", body, token });

export const apiPut = <T = any>(
  endpoint: string,
  body: any,
  token?: string | null
) => api<T>(endpoint, { method: "PUT", body, token });

export const apiDelete = <T = any>(endpoint: string, token?: string | null) =>
  api<T>(endpoint, { method: "DELETE", token });
