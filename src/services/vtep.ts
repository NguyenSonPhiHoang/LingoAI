import { getApiBaseUrl, apiGet } from "./api";

export async function listVtepDocuments(options?: {
  page?: number;
  limit?: number;
  search?: string;
  skill?: string;
}) {
  const params = new URLSearchParams();
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.search) params.append("search", options.search);
  if (options?.skill) params.append("skill", options.skill);
  
  const queryString = params.toString();
  const url = queryString ? `/api/vtep/documents?${queryString}` : "/api/vtep/documents";
  
  return apiGet<{ documents: any[]; total: number; page: number; limit: number }>(url);
}

export async function listVtepDocumentsPublic(options?: {
  page?: number;
  limit?: number;
  search?: string;
  skill?: string;
}) {
  const params = new URLSearchParams();
  if (options?.page) params.append("page", options.page.toString());
  if (options?.limit) params.append("limit", options.limit.toString());
  if (options?.search) params.append("search", options.search);
  if (options?.skill) params.append("skill", options.skill);
  
  const queryString = params.toString();
  const url = queryString ? `/api/vtep/public/documents?${queryString}` : "/api/vtep/public/documents";
  
  return apiGet<{ documents: any[]; total: number; page: number; limit: number }>(url);
}

export async function getVtepDocument(id: string) {
  return apiGet<{ document: any }>(`/api/vtep/documents/${id}`);
}

export async function getVtepDocumentPublic(id: string) {
  return apiGet<{ document: any }>(`/api/vtep/public/documents/${id}`);
}

export async function listVtepDocumentItems(documentId: string) {
  return apiGet<{ items: any[] }>(`/api/vtep/documents/${documentId}/items`);
}

export async function listVtepDocumentItemsPublic(documentId: string) {
  return apiGet<{ items: any[] }>(
    `/api/vtep/public/documents/${documentId}/items`,
  );
}

export async function uploadVtepPdf(
  file: File,
  title?: string,
  description?: string,
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/import/pdf`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const fd = new FormData();
  fd.append("file", file);
  if (title) fd.append("title", title);
  if (description) fd.append("description", description);

  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Upload failed (${res.status})`,
    );
  }

  return res.json();
}

export async function createVtepDocument(
  title?: string,
  description?: string,
  tocJson?: any,
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "POST",
    headers: token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, tocJson }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Create failed (${res.status})`,
    );
  }

  return res.json();
}

export async function updateVtepDocument(
  id: string,
  title?: string,
  description?: string,
  tocJson?: any,
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${id}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "PUT",
    headers: token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description, tocJson }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Update failed (${res.status})`,
    );
  }

  return res.json();
}

export async function deleteVtepDocument(id: string) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${id}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Delete failed (${res.status})`,
    );
  }

  return res.json();
}

export async function addVtepItems(documentId: string, items: any[]) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${documentId}/items`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "POST",
    headers: token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Add items failed (${res.status})`,
    );
  }

  return res.json();
}

export async function updateVtepItem(
  documentId: string,
  itemId: string,
  payload: any,
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${documentId}/items/${itemId}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "PUT",
    headers: token
      ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      : { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Update item failed (${res.status})`,
    );
  }

  return res.json();
}

export async function deleteVtepItem(documentId: string, itemId: string) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${documentId}/items/${itemId}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Delete item failed (${res.status})`,
    );
  }

  return res.json();
}

export async function uploadVtepAudio(documentId: string, file: File) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${documentId}/audio`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.error || data.message || `Upload failed (${res.status})`,
    );
  }

  return res.json();
}

export async function listWritingPrompts(filters?: {
  taskType?: "task1" | "task2";
  level?: string;
  category?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.taskType) params.append("taskType", filters.taskType);
  if (filters?.level) params.append("level", filters.level);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.search) params.append("search", filters.search);
  
  const queryString = params.toString();
  const url = queryString 
    ? `/api/vtep-writing/prompts?${queryString}` 
    : "/api/vtep-writing/prompts";
  
  return apiGet<any[]>(url);
}

export async function getWritingPrompt(id: string) {
  return apiGet<any>(`/api/vtep-writing/prompts/${id}`);
}

export default {
  listVtepDocuments,
  listVtepDocumentsPublic,
  getVtepDocument,
  uploadVtepPdf,
  createVtepDocument,
  addVtepItems,
  listVtepDocumentItemsPublic,
  listVtepDocumentItems,
  updateVtepDocument,
  deleteVtepDocument,
  updateVtepItem,
  deleteVtepItem,
  uploadVtepAudio,
  listWritingPrompts,
  getWritingPrompt,
};
