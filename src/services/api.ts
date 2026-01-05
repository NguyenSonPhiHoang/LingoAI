// Base API service for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

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
