import { getApiBaseUrl, apiGet } from "./api";

export async function listVtepDocuments() {
  return apiGet<{ documents: any[] }>("/api/vtep/documents");
}

export async function getVtepDocument(id: string) {
  return apiGet<{ document: any }>(`/api/vtep/documents/${id}`);
}

export async function listVtepDocumentItems(documentId: string) {
  return apiGet<{ items: any[] }>(`/api/vtep/documents/${documentId}/items`);
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

export async function createVtepDocument(title?: string, description?: string) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "POST",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: `Bearer ${token}` } : {},
    ),
    body: JSON.stringify({ title, description }),
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
) {
  const base = getApiBaseUrl();
  const url = `${base}/api/vtep/documents/${id}`;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("lingoai_token")
      : null;

  const res = await fetch(url, {
    method: "PUT",
    headers: Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: `Bearer ${token}` } : {},
    ),
    body: JSON.stringify({ title, description }),
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
    headers: Object.assign(
      { "Content-Type": "application/json" },
      token ? { Authorization: `Bearer ${token}` } : {},
    ),
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

export default {
  listVtepDocuments,
  getVtepDocument,
  uploadVtepPdf,
  createVtepDocument,
  addVtepItems,
  listVtepDocumentItems,
};
